import deck from "./deck.js";

function dealCommunityCards(game, number) {
  const { remaining, dealt } = deck.deal(game.deck, number, "up");
  game.deck = remaining;
  game.communityCards = game.communityCards.concat(dealt);
  return game;
}

const deal = {
  preflop: function (game) {
    for (const seat of game.seats) {
      const { remaining, dealt } = deck.deal(game.deck, 2, "down");
      game.deck = remaining;
      seat.holeCards = dealt;
    }
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
    let buttonIndex = -1;
    let highestBet = 0;
    let highestBetIndex = -1;
    for (let i = 0; i < game.seats.length; i += 1) {
      const seat = game.seats[i];
      if (seat.button) {
        buttonIndex = i;
      }
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
        highestBetIndex >= 0 ? highestBetIndex : buttonIndex
      )
    );
  },
};

function bet(game, seatIndex, amount, description = "bet") {
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

const bettingRound = {
  antes: {
    next: function (game) {
      const nextToAct = turn.next(game);
      if (nextToAct === -1) {
        for (const seat of game.seats.filter((seats) =>
          seats.hasOwnProperty("bet")
        )) {
          game.pot += seat.bet;
          delete seat.bet;
          delete seat.action;
        }
        return game;
      }

      return bet(game, nextToAct, game.blinds.ante, "ante");
    },
  },

  preflop: {
    next: function (game) {
      function isSmallBlind(game, index) {
        const buttonIndex = game.seats.findIndex((seat) => seat.button);
        return index === circularArray.nextIndex(game.seats, buttonIndex);
      }

      function isBigBlind(game, index) {
        const buttonIndex = game.seats.findIndex((seat) => seat.button);
        return index === circularArray.nextIndex(game.seats, buttonIndex, 2);
      }

      const nextToAct = turn.next(game);
      if (!game.seats[nextToAct].hasOwnProperty("bet")) {
        if (isSmallBlind(game, nextToAct)) {
          return bet(game, nextToAct, game.blinds.small, "small blind");
        } else if (isBigBlind(game, nextToAct)) {
          return bet(game, nextToAct, game.blinds.big, "big blind");
        }
      }

      return game;
    },
  },
};

const actions = {
  fold: function (game, seatIndex) {
    game.seats[seatIndex].folded = true;
    return game;
  },
  call: function (game, seatIndex) {
    const highestBet = game.seats.reduce(
      (max, seat) =>
        seat.hasOwnProperty("bet") && seat.bet > max ? seat.bet : max,
      0
    );
    return bet(game, seatIndex, highestBet, "call");
  },
  check: function (game, seatIndex) {
    return bet(game, seatIndex, 0, "check");
  },
  raise: function (game, seatIndex, amount) {
    return bet(game, seatIndex, amount, "raise");
  },
};

function create({
  maxPlayers = 6,
  blinds = { ante: 0, small: 25, big: 50 },
} = {}) {
  const seats = [];
  for (let i = 0; i < maxPlayers; i += 1) {
    const seat = { state: "empty" };
    if (i === 0) {
      seat.button = true;
    }
    seats.push(seat);
  }
  return { blinds, maxPlayers, seats, deck: deck.create(), actions };
}

export default { create, deck, deal, bettingRound, turn, actions };
