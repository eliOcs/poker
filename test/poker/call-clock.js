import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import * as Game from "../../src/backend/poker/game.js";
import * as Actions from "../../src/backend/poker/actions.js";
import * as Betting from "../../src/backend/poker/betting.js";
import * as Player from "../../src/backend/poker/player.js";

describe("call the clock", () => {
  /** @type {import('../../src/backend/poker/game.js').Game} */
  let game;
  let player1;
  let player2;

  beforeEach(() => {
    game = Game.create();
    player1 = Player.create();
    player2 = Player.create();

    // Sit players
    Actions.sit(game, { seat: 0, player: player1 });
    Actions.sit(game, { seat: 1, player: player2 });

    // Buy in
    Actions.buyIn(game, { seat: 0, amount: 50 });
    Actions.buyIn(game, { seat: 1, amount: 50 });
  });

  describe("actingSince tracking", () => {
    it("should set actingSince when betting round starts", () => {
      Actions.startHand(game);
      Actions.blinds(game).next();
      Actions.blinds(game).next();
      Actions.dealPreflop(game).next();

      const before = Date.now();
      Betting.startBettingRound(game, "preflop");
      const after = Date.now();

      assert.ok(game.hand.actingSince !== null);
      assert.ok(game.hand.actingSince >= before);
      assert.ok(game.hand.actingSince <= after);
    });

    it("should reset actingSince when action advances", () => {
      Actions.startHand(game);
      const blindsGen = Actions.blinds(game);
      blindsGen.next();
      blindsGen.next();
      const dealGen = Actions.dealPreflop(game);
      while (!dealGen.next().done);
      Betting.startBettingRound(game, "preflop");
      game.hand.currentBet = game.blinds.big;

      const firstActingSince = game.hand.actingSince;

      // Small wait to ensure timestamp changes
      const actingSeat = game.hand.actingSeat;
      Actions.call(game, { seat: actingSeat });

      // actingSince should be updated (or null if round ended)
      if (game.hand.actingSeat !== -1) {
        assert.ok(game.hand.actingSince !== null);
        assert.ok(game.hand.actingSince >= firstActingSince);
      }
    });

    it("should clear actingSince when no one is acting", () => {
      Actions.startHand(game);
      const blindsGen = Actions.blinds(game);
      blindsGen.next();
      blindsGen.next();
      const dealGen = Actions.dealPreflop(game);
      while (!dealGen.next().done);
      Betting.startBettingRound(game, "preflop");
      game.hand.currentBet = game.blinds.big;

      // Fold to end the round
      const actingSeat = game.hand.actingSeat;
      Actions.fold(game, { seat: actingSeat });

      // If only one player left, actingSince should be null
      if (Betting.countActivePlayers(game) <= 1) {
        assert.strictEqual(game.hand.actingSince, null);
      }
    });
  });

  describe("callClock action", () => {
    it("should throw if seat is empty", () => {
      Actions.startHand(game);
      const blindsGen = Actions.blinds(game);
      blindsGen.next();
      blindsGen.next();
      const dealGen = Actions.dealPreflop(game);
      while (!dealGen.next().done);
      Betting.startBettingRound(game, "preflop");
      game.hand.currentBet = game.blinds.big;

      // Seat 2 is empty
      assert.throws(() => Actions.callClock(game, { seat: 2 }), {
        message: "seat is empty",
      });
    });

    it("should throw if no one is acting", () => {
      // In waiting phase, no one is acting
      assert.throws(() => Actions.callClock(game, { seat: 0 }), {
        message: "no one is acting",
      });
    });

    it("should throw if calling clock on yourself", () => {
      Actions.startHand(game);
      const blindsGen = Actions.blinds(game);
      blindsGen.next();
      blindsGen.next();
      const dealGen = Actions.dealPreflop(game);
      while (!dealGen.next().done);
      Betting.startBettingRound(game, "preflop");
      game.hand.currentBet = game.blinds.big;

      const actingSeat = game.hand.actingSeat;
      // Force actingSince to be old enough
      game.hand.actingSince = Date.now() - 61000;

      assert.throws(() => Actions.callClock(game, { seat: actingSeat }), {
        message: "cannot call clock on yourself",
      });
    });

    it("should throw if not enough time has passed", () => {
      Actions.startHand(game);
      const blindsGen = Actions.blinds(game);
      blindsGen.next();
      blindsGen.next();
      const dealGen = Actions.dealPreflop(game);
      while (!dealGen.next().done);
      Betting.startBettingRound(game, "preflop");
      game.hand.currentBet = game.blinds.big;

      // actingSince is just set, less than 60 seconds
      const nonActingSeat = game.hand.actingSeat === 0 ? 1 : 0;

      assert.throws(() => Actions.callClock(game, { seat: nonActingSeat }), {
        message: "must wait 60 seconds before calling clock",
      });
    });

    it("should throw if clock already called", () => {
      Actions.startHand(game);
      const blindsGen = Actions.blinds(game);
      blindsGen.next();
      blindsGen.next();
      const dealGen = Actions.dealPreflop(game);
      while (!dealGen.next().done);
      Betting.startBettingRound(game, "preflop");
      game.hand.currentBet = game.blinds.big;

      // Force time to have passed
      game.hand.actingSince = Date.now() - 61000;
      game.hand.clockCalledAt = Date.now(); // Already called

      const nonActingSeat = game.hand.actingSeat === 0 ? 1 : 0;

      assert.throws(() => Actions.callClock(game, { seat: nonActingSeat }), {
        message: "clock already called",
      });
    });

    it("should set clockCalledAt when valid", () => {
      Actions.startHand(game);
      const blindsGen = Actions.blinds(game);
      blindsGen.next();
      blindsGen.next();
      const dealGen = Actions.dealPreflop(game);
      while (!dealGen.next().done);
      Betting.startBettingRound(game, "preflop");
      game.hand.currentBet = game.blinds.big;

      // Force time to have passed
      game.hand.actingSince = Date.now() - 61000;

      const nonActingSeat = game.hand.actingSeat === 0 ? 1 : 0;
      const before = Date.now();
      Actions.callClock(game, { seat: nonActingSeat });
      const after = Date.now();

      assert.ok(game.hand.clockCalledAt !== null);
      assert.ok(game.hand.clockCalledAt >= before);
      assert.ok(game.hand.clockCalledAt <= after);
    });
  });

  describe("clockCalledAt clearing", () => {
    it("should clear clockCalledAt when action advances", () => {
      Actions.startHand(game);
      const blindsGen = Actions.blinds(game);
      blindsGen.next();
      blindsGen.next();
      const dealGen = Actions.dealPreflop(game);
      while (!dealGen.next().done);
      Betting.startBettingRound(game, "preflop");
      game.hand.currentBet = game.blinds.big;

      // Set clock as called
      game.hand.clockCalledAt = Date.now();

      // Take an action
      const actingSeat = game.hand.actingSeat;
      Actions.call(game, { seat: actingSeat });

      // clockCalledAt should be cleared
      assert.strictEqual(game.hand.clockCalledAt, null);
    });

    it("should clear clockCalledAt when betting round starts", () => {
      Actions.startHand(game);
      const blindsGen = Actions.blinds(game);
      blindsGen.next();
      blindsGen.next();
      const dealGen = Actions.dealPreflop(game);
      while (!dealGen.next().done);

      // Manually set clockCalledAt before starting betting round
      game.hand.clockCalledAt = Date.now();

      Betting.startBettingRound(game, "preflop");

      // Should be cleared
      assert.strictEqual(game.hand.clockCalledAt, null);
    });
  });

  describe("game state initialization", () => {
    it("should initialize actingSince as null", () => {
      const newGame = Game.create();
      assert.strictEqual(newGame.hand.actingSince, null);
    });

    it("should initialize clockCalledAt as null", () => {
      const newGame = Game.create();
      assert.strictEqual(newGame.hand.clockCalledAt, null);
    });

    it("should initialize clockTimer as null", () => {
      const newGame = Game.create();
      assert.strictEqual(newGame.clockTimer, null);
    });
  });

  describe("CLOCK_WAIT_TIME constant", () => {
    it("should be 60 seconds (60000 ms)", () => {
      assert.strictEqual(Actions.CLOCK_WAIT_TIME, 60000);
    });
  });
});
