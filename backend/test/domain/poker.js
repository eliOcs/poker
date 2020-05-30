"use strict";

const tap = require("tap");
const Game = require("../../src/domain/poker");

const game = new Game({});
game.sit({ player: "player 1", seat: 0, buyin: 20000 });
tap.same(
  game.seats[0],
  {
    state: "seated",
    player: "player 1",
    stack: 20000,
  },
  "should seat player"
);

tap.throw(
  function () {
    game.sit({ player: "player 2", seat: 0, buyin: 20000 });
  },
  { message: "seat is occupied", info: { seat: 0, by: "player 1" } },
  "when seat occupied throw error"
);

tap.throw(
  function () {
    game.sit({ player: "player 1", seat: 0, buyin: 20000 });
  },
  { message: "player is already seated", info: { player: "player 1" } },
  "when player already seated throw error"
);

game.sit({ player: "player 2", seat: 1, buyin: 20000 });
tap.contains(
  game,
  {
    state: "preflop",
    dealer: 0,
    turn: 1,
  },
  "when two player seat on the table start game"
);
tap.contains(
  game,
  {
    seats: [
      {
        stack: 20000 - 25 - 200,
        bet: 25 + 200,
      },
      {
        stack: 20000 - 25 - 100,
        bet: 25 + 100,
      },
    ],
    pot: 25 + 25 + 100 + 200,
  },
  "should collect blinds"
);
tap.contains(
  game,
  {
    seats: [{ cards: { length: 2 } }, { cards: { length: 2 } }],
  },
  "should deal cards"
);

tap.throw(
  function () {
    game.bet({ seat: 2, amount: 100 });
  },
  { message: "no player is seated", info: { state: "empty" } },
  "should throw error if seat is empty"
);

tap.throw(
  function () {
    game.bet({ seat: 0, amount: 100 });
  },
  {
    message: "it isn't the player's turn to act",
    info: { player: "player 1", turnOf: "player 2" },
  },
  "should throw if it isn't the players turn to act"
);

tap.throw(
  function () {
    game.bet({ seat: 1, amount: 123 });
  },
  {
    message: "bet amount must be a multiple of the small blind",
    info: { amount: 123, smallBlind: 100 },
  },
  "should enforce bet amounts to be multiples of the small blind"
);

game.bet({ seat: 1, amount: 600 });
tap.contains(game, {
  turn: 0,
  pot: 25 + 25 + 100 + 200 + 600,
});
tap.contains(game.seats[1], {
  stack: 20000 - 25 - 100 - 600,
  bet: 25 + 100 + 600,
});

tap.throw(
  function () {
    game.bet({ seat: 0, amount: 200 });
  },
  {
    message: "bet amount is too small",
    info: { amount: 200, atLeast: 500 },
  },
  "when previous player bets should throw error if bet amount isn't atleast equal"
);

game.bet({ seat: 0, amount: 500 });
tap.contains(
  game,
  {
    state: "flop",
    board: { length: 3 },
    turn: 1,
  },
  "when preflop betting round is over start flop"
);

console.log(JSON.stringify(game, null, 2));
