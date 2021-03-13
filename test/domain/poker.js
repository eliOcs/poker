"use strict";

const test = require("tap");
const { Game, seat, Deck } = require("../../src/domain/poker");

test.test("poker.seat", function (test) {
  test.test("nextIndex", function (test) {
    test.equal(
      seat.nextIndex(
        [{ state: "seated" }, { state: "empty" }, { state: "seated" }],
        2,
        (s) => s.state === "seated"
      ),
      0,
      "should find next index that matches"
    );

    test.equal(
      seat.nextIndex(
        [{ state: "empty" }, { state: "empty" }, { state: "seated" }],
        2,
        (s) => s.state === "seated"
      ),
      -1,
      "should return -1 if there is no match"
    );

    test.end();
  });

  test.test("prevIndex", function (test) {
    test.equal(
      seat.prevIndex(
        [{ state: "seated" }, { state: "empty" }, { state: "seated" }],
        0,
        (s) => s.state === "seated"
      ),
      2,
      "should find previous index that matches"
    );

    test.equal(
      seat.prevIndex(
        [{ state: "empty" }, { state: "empty" }, { state: "seated" }],
        2,
        (s) => s.state === "seated"
      ),
      -1,
      "should return -1 if there is no match"
    );

    test.end();
  });

  test.end();
});

test.test("poker.deck", function (test) {
  const deck = new Deck();

  test.equal(deck.length, 52, "should contain 52 cards");
  test.same(
    deck[0],
    { rank: "ace", suit: "hearts" },
    "cards should have rank and suit"
  );
  const dealt = deck.deal(2);
  test.equal(dealt.length, 2, "should deal cards");
  test.equal(deck.length, 50, "should remove dealt cards from deck");

  test.end();
});

test.test("poker.game", function (test) {
  test.test("bet", function (test) {
    test.throw(
      function () {
        const game = new Game();
        game.bet({ seat: 0, amount: 100 });
      },
      {
        message: "hand has not started yet",
        info: { state: "waiting for players" },
      },
      "when hand has not started yet throw error"
    );

    test.throw(
      function () {
        const game = new Game();
        game.state = "preflop";
        game.bet({ seat: 2, amount: 100 });
      },
      { message: "no player is seated", info: { state: "empty" } },
      "when seat is empty should throw"
    );

    test.throw(
      function () {
        const game = new Game();
        game.state = "preflop";
        game.turn = 1;
        game.seats[0] = { state: "seated", player: "player 1" };
        game.seats[1] = { state: "seated", player: "player 2" };
        game.bet({ seat: 0, amount: 100 });
      },
      {
        message: "it isn't the player's turn to act",
        info: { player: "player 1", turnOf: "player 2" },
      },
      "when it isn't the players turn to act should throw"
    );

    test.throw(
      function () {
        const game = new Game();
        game.state = "preflop";
        game.blinds.small = 100;
        game.turn = 1;
        game.seats[1] = { state: "seated", player: "player 2" };
        game.bet({ seat: 1, amount: 123 });
      },
      {
        message: "bet amount must be a multiple of the small blind",
        info: { amount: 123, smallBlind: 100 },
      },
      "should enforce bet amounts to be multiples of the small blind"
    );

    test.throw(
      function () {
        const game = new Game();
        game.state = "preflop";
        game.turn = 0;
        game.seats[0] = { state: "seated", player: "player 1", bet: 0 };
        game.seats[1] = { state: "seated", player: "player 2", bet: 500 };
        game.bet({ seat: 0, amount: 200 });
      },
      {
        message: "bet amount is too small",
        info: { amount: 200, atLeast: 500 },
      },
      "when previous player bets is bigger should throw"
    );

    test.end();
  });

  test.test("sit", function (test) {
    test.throw(
      function () {
        const game = new Game();
        game.seats[0] = { state: "seated", player: "player 1" };
        game.sit({ player: "player 2", seat: 0, buyin: 20000 });
      },
      { message: "seat is occupied", info: { seat: 0, by: "player 1" } },
      "when seat occupied throw error"
    );

    test.throw(
      function () {
        const game = new Game();
        game.seats[0] = { state: "seated", player: "player 1" };
        game.sit({ player: "player 1", seat: 0, buyin: 20000 });
      },
      { message: "player is already seated", info: { player: "player 1" } },
      "when player already seated throw error"
    );

    test.end();
  });

  test.test("fold", function (test) {
    test.throw(
      function () {
        const game = new Game();
        game.state = "preflop";
        game.turn = 0;
        game.seats[0] = { state: "seated", player: "player 1" };
        game.seats[1] = { state: "seated", player: "player 2" };
        game.fold({ seat: 1 });
      },
      {
        message: "it isn't the player's turn to act",
        info: { player: "player 2", turnOf: "player 1" },
      },
      "should throw if it isn't the players turn to act"
    );

    test.end();
  });

  test.end();
});

test.test("hand with no showdown", function (test) {
  const game = new Game();
  game.sit({ player: "player 1", seat: 0, buyin: 20000 });
  test.same(
    game.seats[0],
    {
      state: "seated",
      player: "player 1",
      stack: 20000,
    },
    "should seat player"
  );

  game.sit({ player: "player 2", seat: 1, buyin: 20000 });
  test.contains(
    game,
    {
      state: "preflop",
      dealer: 0,
      turn: 1,
    },
    "when two player seat on the table start game"
  );
  test.contains(
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
  test.contains(
    game,
    {
      seats: [{ cards: { length: 2 } }, { cards: { length: 2 } }],
    },
    "should deal cards"
  );

  game.bet({ seat: 1, amount: 600 });
  test.contains(game, {
    turn: 0,
    pot: 25 + 25 + 100 + 200 + 600,
  });
  test.contains(game.seats[1], {
    stack: 20000 - 25 - 100 - 600,
    bet: 25 + 100 + 600,
  });

  game.bet({ seat: 0, amount: 500 });
  test.contains(
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
  test.contains(
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

  game.fold({ seat: 0 });

  test.end();
});

test.test("hand with showdown", function (test) {
  const game = new Game();
  game.sit({ player: "player 1", seat: 0, buyin: 20000 });
  game.sit({ player: "player 2", seat: 1, buyin: 20000 });

  // preflop
  game.bet({ seat: 1, amount: 600 });
  game.bet({ seat: 0, amount: 500 });

  // flop
  game.bet({ seat: 1, amount: 1200 });
  game.bet({ seat: 0, amount: 1200 });

  // turn
  game.bet({ seat: 1, amount: 0 });
  game.bet({ seat: 0, amount: 0 });

  // river
  game.bet({ seat: 1, amount: 0 });
  game.bet({ seat: 0, amount: 0 });

  // showdown state, instead of betting: show/muck
  // force show first player and players with better hands
  //

  console.dir(game);

  test.end();
});
