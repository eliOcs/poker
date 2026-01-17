import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import * as Game from "../../../src/backend/poker/game.js";
import * as Seat from "../../../src/backend/poker/seat.js";
import * as Actions from "../../../src/backend/poker/actions.js";

describe("hand flow", () => {
  let game;

  beforeEach(() => {
    game = Game.create({ seats: 6, blinds: { ante: 0, small: 25, big: 50 } });
    // Set up 3 players
    game.seats[0] = Seat.occupied({ id: "player1" }, 1000);
    game.seats[2] = Seat.occupied({ id: "player2" }, 1000);
    game.seats[4] = Seat.occupied({ id: "player3" }, 1000);
    game.button = 0;
  });

  describe("startHand", () => {
    it("should reset deck", () => {
      // Deal some cards first
      game.deck = game.deck.slice(0, 10);

      Actions.startHand(game);

      assert.equal(game.deck.length, 52);
    });

    it("should reset board", () => {
      game.board.cards = [
        { rank: "ace", suit: "spades" },
        { rank: "king", suit: "hearts" },
      ];

      Actions.startHand(game);

      assert.deepEqual(game.board.cards, []);
    });

    it("should set phase to preflop", () => {
      Actions.startHand(game);

      assert.equal(game.hand.phase, "preflop");
    });

    it("should reset pot", () => {
      game.hand.pot = 500;

      Actions.startHand(game);

      assert.equal(game.hand.pot, 0);
    });

    it("should reset seat states", () => {
      game.seats[0].folded = true;
      game.seats[0].bet = 100;
      game.seats[0].cards = [{ rank: "ace", suit: "spades" }];
      game.seats[0].totalInvested = 200;
      game.seats[0].allIn = true;

      Actions.startHand(game);

      assert.equal(game.seats[0].folded, false);
      assert.equal(game.seats[0].bet, 0);
      assert.deepEqual(game.seats[0].cards, []);
      assert.equal(game.seats[0].totalInvested, 0);
      assert.equal(game.seats[0].allIn, false);
    });

    it("should throw if less than 2 players with chips", () => {
      game.seats[0].stack = 0;
      game.seats[2].stack = 0;

      assert.throws(() => Actions.startHand(game), /at least 2 players/);
    });
  });

  describe("endHand", () => {
    it("should set phase to waiting", () => {
      game.hand.phase = "showdown";

      Actions.endHand(game);

      assert.equal(game.hand.phase, "waiting");
    });

    it("should reset pot", () => {
      game.hand.pot = 500;

      Actions.endHand(game);

      assert.equal(game.hand.pot, 0);
    });

    it("should move button", () => {
      game.button = 0;

      Actions.endHand(game);

      assert.equal(game.button, 2);
    });
  });

  describe("moveButton", () => {
    it("should move to next occupied seat", () => {
      game.button = 0;

      Actions.moveButton(game);

      assert.equal(game.button, 2);
    });

    it("should wrap around", () => {
      game.button = 4;

      Actions.moveButton(game);

      assert.equal(game.button, 0);
    });

    it("should skip empty seats", () => {
      game.button = 0;
      // Seats 1, 3, 5 are already empty
      // Next after 0 is 2

      Actions.moveButton(game);

      assert.equal(game.button, 2);
    });
  });

  describe("dealTurn", () => {
    it("should deal one card to board", () => {
      game.board.cards = [
        { rank: "ace", suit: "spades" },
        { rank: "king", suit: "hearts" },
        { rank: "queen", suit: "diamonds" },
      ];
      const initialDeckSize = game.deck.length;

      const gen = Actions.dealTurn(game);
      gen.next();

      assert.equal(game.board.cards.length, 4);
      assert.equal(game.deck.length, initialDeckSize - 1);
    });
  });

  describe("dealRiver", () => {
    it("should deal one card to board", () => {
      game.board.cards = [
        { rank: "ace", suit: "spades" },
        { rank: "king", suit: "hearts" },
        { rank: "queen", suit: "diamonds" },
        { rank: "jack", suit: "clubs" },
      ];
      const initialDeckSize = game.deck.length;

      const gen = Actions.dealRiver(game);
      gen.next();

      assert.equal(game.board.cards.length, 5);
      assert.equal(game.deck.length, initialDeckSize - 1);
    });
  });

  describe("full hand flow", () => {
    it("should complete preflop deal", () => {
      Actions.startHand(game);

      // Post blinds
      const blindsGen = Actions.blinds(game);
      blindsGen.next();
      blindsGen.next();

      assert.equal(game.seats[2].bet, 25); // Small blind
      assert.equal(game.seats[4].bet, 50); // Big blind

      // Deal preflop
      const dealGen = Actions.dealPreflop(game);
      // Exhaust the generator
      while (!dealGen.next().done);

      // Each player should have 2 cards
      assert.equal(game.seats[0].cards.length, 2);
      assert.equal(game.seats[2].cards.length, 2);
      assert.equal(game.seats[4].cards.length, 2);
    });

    it("should complete flop deal", () => {
      Actions.startHand(game);

      const dealGen = Actions.dealFlop(game);
      while (!dealGen.next().done);

      assert.equal(game.board.cards.length, 3);
    });
  });
});
