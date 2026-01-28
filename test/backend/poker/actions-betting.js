import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import * as Actions from "../../../src/backend/poker/actions.js";
import * as Betting from "../../../src/backend/poker/betting.js";
import { createGameWithPlayers } from "./test-helpers.js";

describe("betting actions", () => {
  let game;

  beforeEach(() => {
    game = createGameWithPlayers();
    // Start a betting round
    Betting.startBettingRound(game, "flop");
  });

  describe("check", () => {
    it("should be valid when no bet to call", () => {
      game.hand.actingSeat = 2;
      game.hand.currentBet = 0;
      game.seats[2].bet = 0;

      Actions.check(game, { seat: 2 });

      // Should advance to next player
      assert.equal(game.hand.actingSeat, 4);
    });

    it("should throw when not player turn", () => {
      game.hand.actingSeat = 2;

      assert.throws(() => Actions.check(game, { seat: 4 }), /not your turn/);
    });

    it("should throw when there is a bet to call", () => {
      game.hand.actingSeat = 2;
      game.hand.currentBet = 50;
      game.seats[2].bet = 0;

      assert.throws(() => Actions.check(game, { seat: 2 }), /cannot check/);
    });
  });

  describe("bet", () => {
    it("should place a bet when valid", () => {
      game.hand.actingSeat = 2;
      game.hand.currentBet = 0;

      Actions.bet(game, { seat: 2, amount: 100 });

      assert.equal(game.seats[2].bet, 100);
      assert.equal(game.seats[2].stack, 900);
      assert.equal(game.hand.currentBet, 100);
      assert.equal(game.hand.lastRaiser, 2);
    });

    it("should throw when not player turn", () => {
      game.hand.actingSeat = 2;

      assert.throws(
        () => Actions.bet(game, { seat: 4, amount: 100 }),
        /not your turn/,
      );
    });

    it("should throw when there is already a bet", () => {
      game.hand.actingSeat = 2;
      game.hand.currentBet = 50;

      assert.throws(
        () => Actions.bet(game, { seat: 2, amount: 100 }),
        /already a bet/,
      );
    });

    it("should throw when bet is less than big blind", () => {
      game.hand.actingSeat = 2;
      game.hand.currentBet = 0;

      assert.throws(
        () => Actions.bet(game, { seat: 2, amount: 25 }),
        /at least the big blind/,
      );
    });

    it("should throw when bet exceeds stack", () => {
      game.hand.actingSeat = 2;
      game.hand.currentBet = 0;

      assert.throws(
        () => Actions.bet(game, { seat: 2, amount: 2000 }),
        /exceed stack/,
      );
    });

    it("should set allIn when betting entire stack", () => {
      game.hand.actingSeat = 2;
      game.hand.currentBet = 0;

      Actions.bet(game, { seat: 2, amount: 1000 });

      assert.equal(game.seats[2].allIn, true);
      assert.equal(game.seats[2].stack, 0);
    });
  });

  describe("call", () => {
    it("should match current bet", () => {
      game.hand.actingSeat = 2;
      game.hand.currentBet = 100;
      game.seats[2].bet = 0;

      Actions.call(game, { seat: 2 });

      assert.equal(game.seats[2].bet, 100);
      assert.equal(game.seats[2].stack, 900);
    });

    it("should throw when nothing to call", () => {
      game.hand.actingSeat = 2;
      game.hand.currentBet = 0;

      assert.throws(() => Actions.call(game, { seat: 2 }), /nothing to call/);
    });

    it("should go all-in if stack is less than call amount", () => {
      game.hand.actingSeat = 2;
      game.hand.currentBet = 2000;
      game.seats[2].bet = 0;
      game.seats[2].stack = 500;

      Actions.call(game, { seat: 2 });

      assert.equal(game.seats[2].bet, 500);
      assert.equal(game.seats[2].stack, 0);
      assert.equal(game.seats[2].allIn, true);
    });
  });

  describe("raise", () => {
    it("should raise the bet", () => {
      game.hand.actingSeat = 2;
      game.hand.currentBet = 50;
      game.hand.lastRaiseSize = 50;
      game.seats[2].bet = 0;

      Actions.raise(game, { seat: 2, amount: 150 }); // Min raise is 100

      assert.equal(game.seats[2].bet, 150);
      assert.equal(game.seats[2].stack, 850);
      assert.equal(game.hand.currentBet, 150);
      assert.equal(game.hand.lastRaiser, 2);
      assert.equal(game.hand.lastRaiseSize, 100); // Raised by 100
    });

    it("should throw when raise is too small", () => {
      game.hand.actingSeat = 2;
      game.hand.currentBet = 100;
      game.hand.lastRaiseSize = 50;
      game.seats[2].bet = 0;

      assert.throws(
        () => Actions.raise(game, { seat: 2, amount: 120 }),
        /at least/,
      );
    });

    it("should throw when raise exceeds stack", () => {
      game.hand.actingSeat = 2;
      game.hand.currentBet = 50;
      game.hand.lastRaiseSize = 50;
      game.seats[2].bet = 0;

      assert.throws(
        () => Actions.raise(game, { seat: 2, amount: 2000 }),
        /exceed stack/,
      );
    });
  });

  describe("fold", () => {
    it("should mark player as folded", () => {
      game.hand.actingSeat = 2;
      game.seats[2].cards = [{ rank: "ace", suit: "spades" }];

      Actions.fold(game, { seat: 2 });

      assert.equal(game.seats[2].folded, true);
      assert.deepEqual(game.seats[2].cards, []);
    });

    it("should throw when not player turn", () => {
      game.hand.actingSeat = 2;

      assert.throws(() => Actions.fold(game, { seat: 4 }), /not your turn/);
    });
  });

  describe("allIn", () => {
    it("should commit entire stack", () => {
      game.hand.actingSeat = 2;
      game.hand.currentBet = 50;
      game.seats[2].bet = 0;

      Actions.allIn(game, { seat: 2 });

      assert.equal(game.seats[2].bet, 1000);
      assert.equal(game.seats[2].stack, 0);
      assert.equal(game.seats[2].allIn, true);
    });

    it("should update current bet if higher", () => {
      game.hand.actingSeat = 2;
      game.hand.currentBet = 50;
      game.seats[2].bet = 0;

      Actions.allIn(game, { seat: 2 });

      assert.equal(game.hand.currentBet, 1000);
    });

    it("should not make all-in player lastRaiser if it's not a full raise", () => {
      game.hand.actingSeat = 2;
      game.hand.currentBet = 800;
      game.hand.lastRaiseSize = 400;
      game.seats[2].bet = 0;
      game.seats[2].stack = 500; // Can't make a full raise

      Actions.allIn(game, { seat: 2 });

      // 500 < 400 (min raise), so seat 2 should NOT be lastRaiser
      // (advanceAction will update lastRaiser to next player since seat 2 is all-in)
      assert.notEqual(game.hand.lastRaiser, 2);
    });
  });

  describe("turn order", () => {
    it("should cycle through players", () => {
      game.hand.actingSeat = 2;
      game.hand.currentBet = 0;

      Actions.check(game, { seat: 2 });
      assert.equal(game.hand.actingSeat, 4);

      Actions.check(game, { seat: 4 });
      assert.equal(game.hand.actingSeat, 0);
    });

    it("should skip folded players", () => {
      game.hand.actingSeat = 2;
      game.seats[4].folded = true;
      game.hand.currentBet = 0;

      Actions.check(game, { seat: 2 });
      assert.equal(game.hand.actingSeat, 0);
    });

    it("should skip all-in players", () => {
      game.hand.actingSeat = 2;
      game.seats[4].allIn = true;
      game.hand.currentBet = 0;

      Actions.check(game, { seat: 2 });
      assert.equal(game.hand.actingSeat, 0);
    });
  });
});
