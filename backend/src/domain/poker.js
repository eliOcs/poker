"use strict";

class DomainError extends Error {
  constructor(message, info) {
    super(message);
    this.name = "DomainError";
    this.info = info;
  }
}

class Deck extends Array {
  constructor() {
    super();
    for (const suit of ["hearts", "clubs", "diamonds", "spades"]) {
      for (const rank of [
        "ace",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "jack",
        "queen",
        "king",
      ]) {
        this.push({ suit, rank });
      }
    }
  }

  deal(numberOfCards) {
    const cards = [];
    for (let i = 0; i < numberOfCards; i += 1) {
      const randomIndex = Math.floor(Math.random() * this.length);
      cards.push(this[randomIndex]);
      this.splice(randomIndex, 1);
    }
    return cards;
  }
}

class Game {
  constructor({ state, blinds, deck, seats }) {
    this.state = state || "waiting for players";
    this.blinds = blinds || {
      ante: 25,
      small: 100,
      big: 200,
    };
    this.deck = new Deck(deck);
    if (seats) {
      this.seats = seats;
    } else {
      this.seats = [];
      for (let i = 0; i < 9; i += 1) {
        this.seats.push({ state: "empty" });
      }
    }
  }

  sit(params) {
    states[this.state].sit(this, params);
  }

  bet({ seat: seatIndex, amount }) {
    if (this.state === "waiting for players") {
      throw new DomainError("hand has not started yet", { state: this.state });
    }

    const seat = this.seats[seatIndex];

    if (seat.state !== "seated") {
      throw new DomainError("no player is seated", { state: seat.state });
    }

    if (seatIndex !== this.turn) {
      throw new DomainError("it isn't the player's turn to act", {
        player: seat.player,
        turnOf: this.seats[this.turn].player,
      });
    }

    if (amount % this.blinds.small !== 0) {
      throw new DomainError(
        "bet amount must be a multiple of the small blind",
        { amount, smallBlind: this.blinds.small }
      );
    }

    const previousSeat = this.seats[prevIndex(this.seats, seatIndex, isSeated)];
    if (previousSeat.bet && previousSeat.bet > amount + seat.bet) {
      throw new DomainError("bet amount is too small", {
        amount,
        atLeast: previousSeat.bet - seat.bet,
      });
    }

    placeBet(this, { seat: seatIndex, amount });

    advanceTurn(this);
  }

  fold({ seat: seatIndex }) {
    const seat = this.seats[seatIndex];

    if (seatIndex !== this.turn) {
      throw new DomainError("it isn't the player's turn to act", {
        player: seat.player,
        turnOf: this.seats[this.turn].player,
      });
    }

    seat.action = "folded";
    seat.muck = seat.cards;
    delete seat.cards;

    advanceTurn(this);
  }
}

function advanceTurn(game) {
  const nextTurn = nextIndex(
    game.seats,
    game.turn,
    (seat) =>
      seat.cards &&
      seat.action !== "all-in" &&
      (!seat.action || seat.bet < game.seats[game.turn].bet)
  );
  if (nextTurn === -1) {
    if (game.seats.filter((seat) => seat.cards).length === 1) {
      const winner = game.seats[game.turn];
      winner.stack += game.pot;
      delete game.pot;
      delete game.board;
      for (const seat of game.seats) {
        delete seat.bet;
        delete seat.cards;
        delete seat.muck;
        delete seat.action;
      }
      transition(game, "preflop");
    } else {
      transition(game, states[game.state].next);
    }
  } else {
    game.turn = nextTurn;
  }
}

function transition(game, state) {
  game.state = state;
  states[state].onEnter(game);
  return game;
}

function nextIndex(seats, start, predicate) {
  let current = start;
  while ((current = (current + 1) % seats.length) !== start) {
    if (predicate(seats[current])) {
      return current;
    }
  }
  return -1;
}

function prevIndex(seats, start, predicate) {
  let current = start;
  while ((current = (current - 1 + seats.length) % seats.length) !== start) {
    if (predicate(seats[current])) {
      return current;
    }
  }
  return -1;
}

function isSeated(seat) {
  return seat.state === "seated";
}

function placeBet(game, { seat: seatIndex, amount }) {
  const seat = game.seats[seatIndex];
  const previousSeat = game.seats[prevIndex(game.seats, seatIndex, isSeated)];
  seat.stack -= amount;
  seat.bet = seat.bet || 0;
  seat.bet += amount;
  game.pot += amount;
  if (seat.stack === 0) {
    seat.action = "all-in";
  } else if (amount === 0) {
    seat.action = "check";
  } else if (seat.bet === previousSeat.bet) {
    seat.action = "call";
  } else {
    seat.action = "raise";
  }
}

const states = {
  "waiting for players": {
    sit: function (game, { player, seat: seatNumber, buyin }) {
      if (game.seats.some((s) => s.player === player)) {
        throw new DomainError("player is already seated", { player });
      }

      const seat = game.seats[seatNumber];
      if (seat.state !== "empty") {
        throw new DomainError("seat is occupied", {
          seat: seatNumber,
          by: game.seats[seatNumber].player,
        });
      }

      seat.state = "seated";
      seat.player = player;
      seat.stack = buyin;

      if (game.seats.filter(isSeated).length >= 2) {
        transition(game, "preflop");
      }
    },
  },
  preflop: {
    onEnter(game) {
      if (game.dealer) {
        game.dealer = nextIndex(game.seats, game.dealer, isSeated);
      } else {
        game.dealer = game.seats.findIndex(isSeated);
      }
      game.pot = 0;
      game.turn = game.dealer;

      // antes + deal
      do {
        game.seats[game.turn].cards = game.deck.deal(2);
        placeBet(game, { seat: game.turn, amount: game.blinds.ante });
        game.turn = nextIndex(game.seats, game.turn, isSeated);
      } while (game.turn !== game.dealer);

      // blinds
      game.turn = nextIndex(game.seats, game.dealer, isSeated);
      placeBet(game, { seat: game.turn, amount: game.blinds.small });
      game.turn = nextIndex(game.seats, game.turn, isSeated);
      placeBet(game, { seat: game.turn, amount: game.blinds.big });
      game.turn = nextIndex(game.seats, game.turn, isSeated);
    },

    next: "flop",
  },

  flop: {
    onEnter: function (game) {
      for (const seat of game.seats) {
        delete seat.bet;
        if (seat.action !== "all-in") {
          delete seat.action;
        }
      }
      game.board = game.deck.deal(3);
      game.turn = nextIndex(game.seats, game.dealer, isSeated);
    },

    next: "turn",
  },

  turn: {
    onEnter: function (game) {
      for (const seat of game.seats) {
        delete seat.bet;
        if (seat.action !== "all-in") {
          delete seat.action;
        }
      }
      game.board.push(game.deck.deal(1));
      game.turn = nextIndex(game.seats, game.dealer, isSeated);
    },

    next: "river",
  },

  river: {
    onEnter: function (game) {
      for (const seat of game.seats) {
        delete seat.bet;
        if (seat.action !== "all-in") {
          delete seat.action;
        }
      }
      game.board.push(game.deck.deal(1));
      game.turn = nextIndex(game.seats, game.dealer, isSeated);
    },
  },
};

const seat = { nextIndex, prevIndex };

module.exports = { Game, seat };
