import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import * as Game from "../../../src/backend/poker/game.js";
import * as Actions from "../../../src/backend/poker/actions.js";
import * as Betting from "../../../src/backend/poker/betting.js";
import * as User from "../../../src/backend/user.js";
import * as Player from "../../../src/backend/poker/player.js";
import playerView from "../../../src/backend/poker/player-view.js";
import {
  CLOCK_WAIT_TICKS,
  CLOCK_DURATION_TICKS,
} from "../../../src/backend/poker/game-tick.js";
import { drainGenerator } from "./test-helpers.js";

/** Helper to create a test player */
function createPlayer() {
  return Player.fromUser(User.create());
}

describe("call the clock", () => {
  /** @type {import('../../../src/backend/poker/game.js').Game} */
  let game;
  let player1;
  let player2;

  beforeEach(() => {
    game = Game.create();
    player1 = createPlayer();
    player2 = createPlayer();

    // Sit players
    Actions.sit(game, { seat: 0, player: player1 });
    Actions.sit(game, { seat: 1, player: player2 });

    // Buy in
    Actions.buyIn(game, { seat: 0, amount: 50 });
    Actions.buyIn(game, { seat: 1, amount: 50 });
  });

  describe("actingTicks tracking", () => {
    it("should initialize actingTicks when game is created", () => {
      assert.strictEqual(game.actingTicks, 0);
    });

    it("should have actingTicks at 0 after betting round starts", () => {
      Actions.startHand(game);
      const blindsGen = Actions.blinds(game);
      blindsGen.next();
      blindsGen.next();
      const dealGen = Actions.dealPreflop(game);
      drainGenerator(dealGen);
      Betting.startBettingRound(game, "preflop");

      // actingTicks is managed by the tick system, not betting
      assert.strictEqual(game.actingTicks, 0);
    });
  });

  describe("callClock action", () => {
    it("should throw if seat is empty", () => {
      Actions.startHand(game);
      const blindsGen = Actions.blinds(game);
      blindsGen.next();
      blindsGen.next();
      const dealGen = Actions.dealPreflop(game);
      drainGenerator(dealGen);
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
      drainGenerator(dealGen);
      Betting.startBettingRound(game, "preflop");
      game.hand.currentBet = game.blinds.big;

      const actingSeat = game.hand.actingSeat;
      // Force enough ticks to have passed
      game.actingTicks = CLOCK_WAIT_TICKS;

      assert.throws(() => Actions.callClock(game, { seat: actingSeat }), {
        message: "cannot call clock on yourself",
      });
    });

    it("should throw if not enough ticks have passed", () => {
      Actions.startHand(game);
      const blindsGen = Actions.blinds(game);
      blindsGen.next();
      blindsGen.next();
      const dealGen = Actions.dealPreflop(game);
      drainGenerator(dealGen);
      Betting.startBettingRound(game, "preflop");
      game.hand.currentBet = game.blinds.big;

      // actingTicks is 0, less than CLOCK_WAIT_TICKS
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
      drainGenerator(dealGen);
      Betting.startBettingRound(game, "preflop");
      game.hand.currentBet = game.blinds.big;

      // Force enough ticks to have passed
      game.actingTicks = CLOCK_WAIT_TICKS;
      game.clockTicks = 1; // Already called

      const nonActingSeat = game.hand.actingSeat === 0 ? 1 : 0;

      assert.throws(() => Actions.callClock(game, { seat: nonActingSeat }), {
        message: "clock already called",
      });
    });

    it("should succeed when valid (enough ticks and clock not called)", () => {
      Actions.startHand(game);
      const blindsGen = Actions.blinds(game);
      blindsGen.next();
      blindsGen.next();
      const dealGen = Actions.dealPreflop(game);
      drainGenerator(dealGen);
      Betting.startBettingRound(game, "preflop");
      game.hand.currentBet = game.blinds.big;

      // Force enough ticks to have passed
      game.actingTicks = CLOCK_WAIT_TICKS;

      const nonActingSeat = game.hand.actingSeat === 0 ? 1 : 0;

      // Should not throw
      assert.doesNotThrow(() =>
        Actions.callClock(game, { seat: nonActingSeat }),
      );
    });
  });

  describe("game state initialization", () => {
    it("should initialize actingTicks as 0", () => {
      const newGame = Game.create();
      assert.strictEqual(newGame.actingTicks, 0);
    });

    it("should initialize clockTicks as 0", () => {
      const newGame = Game.create();
      assert.strictEqual(newGame.clockTicks, 0);
    });

    it("should initialize tickTimer as null", () => {
      const newGame = Game.create();
      assert.strictEqual(newGame.tickTimer, null);
    });

    it("should initialize disconnectedActingTicks as 0", () => {
      const newGame = Game.create();
      assert.strictEqual(newGame.disconnectedActingTicks, 0);
    });
  });

  describe("tick constants", () => {
    it("CLOCK_WAIT_TICKS should be 60 ticks", () => {
      assert.strictEqual(CLOCK_WAIT_TICKS, 60);
    });

    it("CLOCK_DURATION_TICKS should be 30 ticks", () => {
      assert.strictEqual(CLOCK_DURATION_TICKS, 30);
    });
  });

  describe("callClock in player view", () => {
    it("should show callClock action to waiting player after 60 ticks", () => {
      Actions.startHand(game);
      const blindsGen = Actions.blinds(game);
      blindsGen.next();
      blindsGen.next();
      const dealGen = Actions.dealPreflop(game);
      drainGenerator(dealGen);
      Betting.startBettingRound(game, "preflop");
      game.hand.currentBet = game.blinds.big;

      // Force 60+ ticks to have passed
      game.actingTicks = CLOCK_WAIT_TICKS;

      // Get view for the non-acting player
      const nonActingPlayer = game.hand.actingSeat === 0 ? player2 : player1;
      const nonActingSeatIndex = game.hand.actingSeat === 0 ? 1 : 0;
      const view = playerView(game, nonActingPlayer);

      // The non-acting player's seat should have callClock action
      const seatActions = view.seats[nonActingSeatIndex].actions;
      const hasCallClock = seatActions.some((a) => a.action === "callClock");
      assert.strictEqual(hasCallClock, true);
    });

    it("should hide callClock action when not enough ticks have passed", () => {
      Actions.startHand(game);
      const blindsGen = Actions.blinds(game);
      blindsGen.next();
      blindsGen.next();
      const dealGen = Actions.dealPreflop(game);
      drainGenerator(dealGen);
      Betting.startBettingRound(game, "preflop");
      game.hand.currentBet = game.blinds.big;

      // Only 59 ticks have passed
      game.actingTicks = CLOCK_WAIT_TICKS - 1;

      // Get view for the non-acting player
      const nonActingPlayer = game.hand.actingSeat === 0 ? player2 : player1;
      const nonActingSeatIndex = game.hand.actingSeat === 0 ? 1 : 0;
      const view = playerView(game, nonActingPlayer);

      // The callClock action should not be available
      const seatActions = view.seats[nonActingSeatIndex].actions;
      const hasCallClock = seatActions.some((a) => a.action === "callClock");
      assert.strictEqual(hasCallClock, false);
    });

    it("should hide callClock action after clock is called", () => {
      Actions.startHand(game);
      const blindsGen = Actions.blinds(game);
      blindsGen.next();
      blindsGen.next();
      const dealGen = Actions.dealPreflop(game);
      drainGenerator(dealGen);
      Betting.startBettingRound(game, "preflop");
      game.hand.currentBet = game.blinds.big;

      // Force 60+ ticks to have passed
      game.actingTicks = CLOCK_WAIT_TICKS;

      // Call the clock
      const nonActingSeatIndex = game.hand.actingSeat === 0 ? 1 : 0;
      Actions.callClock(game, { seat: nonActingSeatIndex });

      // Simulate clock being started (index.js would call startClockTicks)
      game.clockTicks = 1;

      // Get view for the non-acting player
      const nonActingPlayer = game.hand.actingSeat === 0 ? player2 : player1;
      const view = playerView(game, nonActingPlayer);

      // The callClock action should no longer be available
      const seatActions = view.seats[nonActingSeatIndex].actions;
      const hasCallClock = seatActions.some((a) => a.action === "callClock");
      assert.strictEqual(hasCallClock, false);
    });

    it("should include clockTicks in hand state for all players", () => {
      Actions.startHand(game);
      const blindsGen = Actions.blinds(game);
      blindsGen.next();
      blindsGen.next();
      const dealGen = Actions.dealPreflop(game);
      drainGenerator(dealGen);
      Betting.startBettingRound(game, "preflop");
      game.hand.currentBet = game.blinds.big;

      // Force 60+ ticks and call clock
      game.actingTicks = CLOCK_WAIT_TICKS;
      const nonActingSeatIndex = game.hand.actingSeat === 0 ? 1 : 0;
      Actions.callClock(game, { seat: nonActingSeatIndex });

      // Simulate clock being started
      game.clockTicks = 1;

      // Both players should see clockTicks in their view
      const view1 = playerView(game, player1);
      const view2 = playerView(game, player2);

      assert.strictEqual(view1.hand.clockTicks, 1);
      assert.strictEqual(view2.hand.clockTicks, 1);
    });

    it("should include actingTicks in hand state for all players", () => {
      Actions.startHand(game);
      const blindsGen = Actions.blinds(game);
      blindsGen.next();
      blindsGen.next();
      const dealGen = Actions.dealPreflop(game);
      drainGenerator(dealGen);
      Betting.startBettingRound(game, "preflop");
      game.hand.currentBet = game.blinds.big;

      // Set actingTicks
      game.actingTicks = 45;

      // Both players should see actingTicks in their view
      const view1 = playerView(game, player1);
      const view2 = playerView(game, player2);

      assert.strictEqual(view1.hand.actingTicks, 45);
      assert.strictEqual(view2.hand.actingTicks, 45);
    });
  });
});
