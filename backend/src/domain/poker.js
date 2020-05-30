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

  bet(params) {
    states[this.state].bet(this, params);
  }
}

function transition(game, state) {
  game.state = state;
  states[state].onEnter(game);
  return game;
}

function nextSeatedIndex(seats, index) {
  let nextIndex = index;
  do {
    nextIndex = (nextIndex + 1) % seats.length;
  } while (seats[nextIndex].state !== "seated");
  return nextIndex;
}

function prevSeatedIndex(seats, index) {
  let prevIndex = index;
  do {
    prevIndex = (prevIndex - 1 + seats.length) % seats.length;
  } while (seats[prevIndex].state !== "seated");
  return prevIndex;
}

function placeBet(game, { seat: seatIndex, amount }) {
  const seat = game.seats[seatIndex];
  const previousSeat = game.seats[prevSeatedIndex(game.seats, seatIndex)];
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

      if (game.seats.filter((s) => s.state === "seated").length >= 2) {
        transition(game, "preflop");
      }
    },
  },
  preflop: {
    onEnter(game) {
      if (game.dealer) {
        game.dealer = nextSeatedIndex(game.seats, game.dealer);
      } else {
        game.dealer = game.seats.findIndex((s) => s.state === "seated");
      }
      game.pot = 0;
      game.turn = game.dealer;
      do {
        game.seats[game.turn].cards = game.deck.deal(2);
        placeBet(game, { seat: game.turn, amount: game.blinds.ante });
        game.turn = nextSeatedIndex(game.seats, game.turn);
      } while (game.turn !== game.dealer);
      game.turn = nextSeatedIndex(game.seats, game.dealer);
      placeBet(game, { seat: game.turn, amount: game.blinds.small });
      game.turn = nextSeatedIndex(game.seats, game.turn);
      placeBet(game, { seat: game.turn, amount: game.blinds.big });
      game.turn = nextSeatedIndex(game.seats, game.turn);
    },

    bet(game, { seat: seatIndex, amount }) {
      const seat = game.seats[seatIndex];

      if (seat.state !== "seated") {
        throw new DomainError("no player is seated", { state: seat.state });
      }

      if (seatIndex !== game.turn) {
        throw new DomainError("it isn't the player's turn to act", {
          player: seat.player,
          turnOf: game.seats[game.turn].player,
        });
      }

      if (amount % game.blinds.small !== 0) {
        throw new DomainError(
          "bet amount must be a multiple of the small blind",
          { amount, smallBlind: game.blinds.small }
        );
      }

      const previousSeat = game.seats[prevSeatedIndex(game.seats, seatIndex)];
      if (previousSeat.bet && previousSeat.bet > amount + seat.bet) {
        throw new DomainError("bet amount is too small", {
          amount,
          atLeast: previousSeat.bet - seat.bet,
        });
      }

      placeBet(game, { seat: seatIndex, amount });

      const nextSeatIndex = nextSeatedIndex(game.seats, seatIndex);
      const nextSeat = game.seats[nextSeatIndex];
      if (!nextSeat.action || nextSeat.bet < seat.bet) {
        game.turn = nextSeatIndex;
      } else {
        transition(game, "flop");
      }
    },
  },
  flop: {
    onEnter: function (game) {
      game.board = game.deck.deal(3);
      game.turn = nextSeatedIndex(game.seats, game.dealer);
    },
  },
};

module.exports = Game;
