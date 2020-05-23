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
      cards.push(this.splice(Math.floor(Math.random() * this.length)));
    }
    return cards;
  }
}

class Game {
  constructor() {
    this.state = "waiting for players";
    this.blinds = {
      ante: 25,
      small: 100,
      big: 200,
    };
    this.deck = new Deck();
    this.seats = [];
    for (let i = 0; i < 9; i += 1) {
      this.seats.push({ state: "empty" });
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
        game.bet({ seat: game.turn, amount: game.blinds.ante, forced: true });
      } while (game.turn !== game.dealer);
      game.turn = nextSeatedIndex(game.seats, game.dealer);
      game.bet({ seat: game.turn, amount: game.blinds.small, forced: true });
      game.bet({ seat: game.turn, amount: game.blinds.big, forced: true });
    },

    bet(game, { seat: seatIndex, amount, forced }) {
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

      if (!forced) {
        if (amount % game.blinds.small !== 0) {
          throw new DomainError(
            "bet amount must be a multiple of the small blind",
            { amount, smallBlind: game.blinds.small }
          );
        }

        const previousSeat = game.seats[prevSeatedIndex(game.seats, seatIndex)];
        if (previousSeat.bet > amount + seat.bet) {
          throw new DomainError("bet amount is too small", {
            amount,
            atLeast: previousSeat.bet - seat.bet,
          });
        }
      }

      seat.stack -= amount;
      seat.bet = seat.bet || 0;
      seat.bet += amount;
      game.pot += amount;
      game.turn = nextSeatedIndex(game.seats, seatIndex);
    },
  },
};

module.exports = Game;
