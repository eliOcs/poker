import deck from "./deck.js";
import handRankings from "./hand-rankings.js";

function dealCommunityCards(game, number) {
  const { remaining, dealt } = deck.deal(game.deck, number);
  game.deck = remaining;
  if (game.hasOwnProperty("communityCards")) {
    game.communityCards = game.communityCards.concat(dealt);
  } else {
    game.communityCards = dealt;
  }
  return game;
}

const deal = {
  preflop: function (game, seatIndex) {
    const seat = game.seats[seatIndex];
    const { remaining, dealt } = deck.deal(game.deck, 2);
    game.deck = remaining;
    seat.cards = dealt;
    return game;
  },

  flop: (game) => dealCommunityCards(game, 3),

  turn: (game) => dealCommunityCards(game, 1),

  river: (game) => dealCommunityCards(game, 1),
};

const circularArray = {
  nextIndex: function (array, index, increment = 1) {
    return (index + increment) % array.length;
  },

  findIndex: function (array, predicate, start = 0) {
    let current = start;
    do {
      if (predicate(array[current])) {
        return current;
      }
    } while ((current = circularArray.nextIndex(array, current)) !== start);
    return -1;
  },
};

const turn = {
  next: function (game) {
    let highestBet = 0;
    let highestBetIndex = -1;
    for (let i = 0; i < game.seats.length; i += 1) {
      const seat = game.seats[i];
      if (seat.hasOwnProperty("bet") && seat.bet > highestBet) {
        highestBet = seat.bet;
        highestBetIndex = i;
      }
    }

    return circularArray.findIndex(
      game.seats,
      (seat) =>
        seat !== "empty" &&
        !seat.folded &&
        !seat.allin &&
        (!seat.hasOwnProperty("bet") || seat.bet < highestBet),
      circularArray.nextIndex(
        game.seats,
        highestBetIndex >= 0 ? highestBetIndex : game.button
      )
    );
  },
};

function bet(game, { seat: seatIndex, amount, description = "bet" }) {
  const seat = game.seats[seatIndex];
  if (seat.stack > amount) {
    seat.bet = amount;
  } else {
    seat.bet = seat.stack;
    seat.allin = true;
  }
  seat.stack -= seat.bet;
  seat.action = description;
  return game;
}

function collectBets(game) {
  for (const seat of game.seats.filter((seats) =>
    seats.hasOwnProperty("bet")
  )) {
    game.pot += seat.bet;
    delete seat.bet;
    delete seat.action;
  }
  return game;
}

function calculateHands(game) {
  for (const seat of game.seats.filter((seats) =>
    seats.hasOwnProperty("cards")
  )) {
    seat.hand = handRankings.bestCombination(
      game.communityCards.concat(seat.cards)
    );
  }
  return game;
}

const bettingRound = {
  antes: {
    next: function (game) {
      const nextToAct = turn.next(game);
      if (nextToAct === -1) {
        game.round = "preflop";
        return collectBets(game);
      }

      return bet(game, {
        seat: nextToAct,
        amount: game.blinds.ante,
        description: "ante",
      });
    },
  },

  preflop: {
    next: function (game) {
      const nextToAct = turn.next(game);

      if (nextToAct === -1) {
        game.round = "flop";
        return collectBets(game);
      }

      if (!game.seats[nextToAct].hasOwnProperty("bet")) {
        const smallBlind = circularArray.findIndex(
          game.seats,
          (seat) => seat !== "empty",
          circularArray.nextIndex(game.seats, game.button)
        );
        const bigBlind = circularArray.findIndex(
          game.seats,
          (seat) => seat !== "empty",
          circularArray.nextIndex(game.seats, smallBlind)
        );
        if (nextToAct === smallBlind) {
          return bet(game, {
            seat: nextToAct,
            amount: game.blinds.small,
            description: "small blind",
          });
        } else if (nextToAct === bigBlind) {
          return bet(game, {
            seat: nextToAct,
            amount: game.blinds.big,
            description: "big blind",
          });
        }
      }

      const nextWithoutCards = circularArray.findIndex(
        game.seats,
        (seat) => seat !== "empty" && !seat.hasOwnProperty("cards"),
        circularArray.nextIndex(game.seats, game.button)
      );
      if (nextWithoutCards >= 0) {
        return deal.preflop(game, nextWithoutCards);
      }

      return game;
    },
  },

  flop: {
    next: function (game) {
      if (!game.hasOwnProperty("communityCards")) {
        return calculateHands(deal.flop(game));
      }

      const nextToAct = turn.next(game);
      if (nextToAct === -1) {
        game.round = "turn";
        return collectBets(game);
      }

      return game;
    },
  },

  turn: {
    next: function (game) {
      if (game.communityCards.length < 4) {
        return calculateHands(deal.turn(game));
      }

      const nextToAct = turn.next(game);
      if (nextToAct === -1) {
        game.round = "river";
        return collectBets(game);
      }

      return game;
    },
  },

  river: {
    next: function (game) {
      if (game.communityCards.length < 5) {
        return calculateHands(deal.river(game));
      }

      const nextToAct = turn.next(game);
      if (nextToAct === -1) {
        game.round = "showdown";
        return collectBets(game);
      }

      return game;
    },
  },

  showdown: {
    next: function (game) {
      if (game.hasOwnProperty("winner")) {
        game.winner = circularArray.findIndex(
          game.seats,
          (seat) => seat.hasOwnProperty("cards"),
          circularArray.nextIndex(game.seats, game.button)
        );
      }

      const nextToAct = circularArray.findIndex(
        game.seats,
        (seat) => seat.hasOwnProperty("cards"),
        circularArray.nextIndex(game.seats, game.winner)
      );

      if (nextToAct === -1) {
        game.seats[game.winner].stack += game.pot;
        delete game.winner;
        delete game.pot;
        return game;
      }

      if (
        handRankings.compare(
          game.seats[nextToAct].hand,
          game.seats[game.winner].hand
        ) > 0
      ) {
        game.winner = nextToAct;
        delete game.seats[game.winner].hand;
      } else {
        delete game.seats[nextToAct].hand;
      }
      return game;
    },
  },
};

const actions = {
  resume: function (game) {
    game.isPaused = false;
    return game;
  },
  fold: function (game, seat) {
    game.seats[seat].folded = true;
    return game;
  },
  call: function (game, { seat }) {
    const highestBet = game.seats.reduce(
      (max, seat) =>
        seat.hasOwnProperty("bet") && seat.bet > max ? seat.bet : max,
      0
    );
    return bet(game, { seat, amount: highestBet, description: "call" });
  },
  check: function (game, { seat }) {
    return bet(game, { seat, amount: 0, description: "check" });
  },
  raise: function (game, { seat, amount }) {
    return bet(game, { seat, amount, description: "raise" });
  },
  buyin: function (game, { seat, stack, player }) {
    game.seats[seat] = { player, stack };
    return game;
  },
};

function create({
  maxPlayers = 6,
  blinds = { ante: 5, small: 25, big: 50 },
} = {}) {
  const seats = [];
  for (let i = 0; i < maxPlayers; i += 1) {
    seats.push("empty");
  }
  return {
    isPaused: true,
    button: 0,
    blinds,
    seats,
    deck: deck.create(),
  };
}

function moveButton(game) {
  game.button = circularArray.findIndex(
    game.seats,
    (seat) => seat !== "empty",
    circularArray.nextIndex(game.seats, game.button)
  );
  return game;
}

function next(game) {
  if (game.isPaused) {
    return;
  }

  if (!game.round) {
    //start hand
    game.round = game.blinds.ante === 0 ? "preflop" : "antes";
    game.pot = 0;
  }
  return bettingRound[game.round].next(game);
}

export default {
  create,
  deck,
  deal,
  bettingRound,
  turn,
  actions,
  moveButton,
  next,
};
