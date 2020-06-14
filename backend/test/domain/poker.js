"use strict";

const tap = require("tap");
const { Game, seat } = require("../../src/domain/poker");

tap.equal(
  seat.nextIndex(
    [{ state: "seated" }, { state: "empty" }, { state: "seated" }],
    2,
    (s) => s.state === "seated"
  ),
  0,
  "should find next index that matches"
);

tap.equal(
  seat.nextIndex(
    [{ state: "empty" }, { state: "empty" }, { state: "seated" }],
    2,
    (s) => s.state === "seated"
  ),
  -1,
  "should return -1 if there is no match"
);

tap.equal(
  seat.prevIndex(
    [{ state: "seated" }, { state: "empty" }, { state: "seated" }],
    0,
    (s) => s.state === "seated"
  ),
  2,
  "should find previous index that matches"
);

tap.equal(
  seat.prevIndex(
    [{ state: "empty" }, { state: "empty" }, { state: "seated" }],
    2,
    (s) => s.state === "seated"
  ),
  -1,
  "should return -1 if there is no match"
);

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
    game.bet({ seat: 0, amount: 100 });
  },
  {
    message: "hand has not started yet",
    info: { state: "waiting for players" },
  },
  "when hand has not started yet throw error if player tries to bet"
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
  "when previous player bets should throw error if bet amount isn't at least equal"
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

game.bet({ seat: 1, amount: 0 });
game.bet({ seat: 0, amount: 0 });
tap.contains(
  game,
  {
    state: "turn",
    board: { length: 4 },
    turn: 1,
  },
  "when flop betting round is over start turn"
);

game.bet({ seat: 1, amount: 700 });
game.bet({ seat: 0, amount: 1400 });
game.bet({ seat: 1, amount: 2100 });

tap.throw(
  function () {
    game.fold({ seat: 1 });
  },
  {
    message: "it isn't the player's turn to act",
    info: { player: "player 2", turnOf: "player 1" },
  },
  "should throw if it isn't the players turn to act"
);

game.fold({ seat: 0 });

console.log(JSON.stringify(game, null, 2));
