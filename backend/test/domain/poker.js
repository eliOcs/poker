"use strict";

const tap = require("tap");
const Game = require("../../src/domain/poker");

const game = new Game();
game.sit({ player: "player 1", seat: 0, buyin: 20000 });
tap.same(game.seats[0], {
  state: "seated",
  player: "player 1",
  stack: 20000,
});

tap.throw(
  function () {
    game.sit({ player: "player 2", seat: 0, buyin: 20000 });
  },
  { message: "seat is occupied", info: { seat: 0, by: "player 1" } }
);

tap.throw(
  function () {
    game.sit({ player: "player 1", seat: 0, buyin: 20000 });
  },
  { message: "player is already seated", info: { player: "player 1" } }
);

game.sit({ player: "player 2", seat: 1, buyin: 20000 });
tap.equal(game.state, "preflop");
tap.contains(game.seats[1], {
  stack: 20000 - 25 - 100,
  bet: 25 + 100,
  cards: { length: 2 },
});
tap.contains(game.seats[0], {
  stack: 20000 - 25 - 200,
  bet: 25 + 200,
  cards: { length: 2 },
});
tap.equal(game.pot, 25 + 25 + 100 + 200);
tap.equal(game.dealer, 0);
tap.equal(game.turn, 1);

tap.throw(
  function () {
    game.bet({ seat: 2, amount: 100 });
  },
  { message: "no player is seated", info: { state: "empty" } }
);

tap.throw(
  function () {
    game.bet({ seat: 0, amount: 100 });
  },
  {
    message: "it isn't the player's turn to act",
    info: { player: "player 1", turnOf: "player 2" },
  }
);

tap.throw(
  function () {
    game.bet({ seat: 1, amount: 123 });
  },
  {
    message: "bet amount must be a multiple of the small blind",
    info: { amount: 123, smallBlind: 100 },
  }
);

game.bet({ seat: 1, amount: 600 });
tap.equal(game.pot, 25 + 25 + 100 + 200 + 600);
tap.contains(game.seats[1], {
  stack: 20000 - 25 - 100 - 600,
  bet: 25 + 100 + 600,
});
tap.equal(game.turn, 0);

tap.throw(
  function () {
    game.bet({ seat: 0, amount: 200 });
  },
  {
    message: "bet amount is too small",
    info: { amount: 200, atLeast: 500 },
  }
);
game.bet({ seat: 1, amount: 600 });
tap.equal(game.state, "flop");
