import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import * as Game from "../../../src/backend/poker/game.js";
import * as Actions from "../../../src/backend/poker/actions.js";
import * as ActionClock from "../../../src/backend/poker/action-clock.js";
import * as Betting from "../../../src/backend/poker/betting.js";
import * as User from "../../../src/backend/user.js";
import * as Player from "../../../src/backend/poker/player.js";
import playerView from "../../../src/backend/poker/player-view.js";
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

  describe("action wait tracking", () => {
    it("should initialize wait ticks when game is created", () => {
      assert.strictEqual(game.actionClock.waitTicks, 0);
    });

    it("should have actingTicks at 0 after betting round starts", () => {
      Actions.startHand(game);
      const blindsGen = Actions.blinds(game);
      blindsGen.next();
      blindsGen.next();
      const dealGen = Actions.dealPreflop(game);
      drainGenerator(dealGen);
      Betting.startBettingRound(game, "preflop");

      // Wait ticks are managed by the tick system, not betting.
      assert.strictEqual(game.actionClock.waitTicks, 0);
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
      game.actionClock.waitTicks = ActionClock.CLOCK_WAIT_TICKS;

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

      // No wait ticks have elapsed yet.
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
      game.actionClock.waitTicks = ActionClock.CLOCK_WAIT_TICKS;
      ActionClock.start(game.actionClock);

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
      game.actionClock.waitTicks = ActionClock.CLOCK_WAIT_TICKS;

      const nonActingSeat = game.hand.actingSeat === 0 ? 1 : 0;

      // Should not throw
      assert.doesNotThrow(() =>
        Actions.callClock(game, { seat: nonActingSeat }),
      );
    });
  });

  describe("game state initialization", () => {
    it("should initialize an empty action clock", () => {
      const newGame = Game.create();
      assert.deepStrictEqual(newGame.actionClock, {
        waitTicks: 0,
        countdownTicks: 0,
      });
    });

    it("should initialize tickTimer as undefined", () => {
      const newGame = Game.create();
      assert.strictEqual(newGame.tickTimer, undefined);
    });
  });

  describe("callClock in player view", () => {
    it("should show callClock action at the wait boundary", () => {
      Actions.startHand(game);
      const blindsGen = Actions.blinds(game);
      blindsGen.next();
      blindsGen.next();
      const dealGen = Actions.dealPreflop(game);
      drainGenerator(dealGen);
      Betting.startBettingRound(game, "preflop");
      game.hand.currentBet = game.blinds.big;

      // Reach the manual call boundary.
      game.actionClock.waitTicks = ActionClock.CLOCK_WAIT_TICKS;

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

      // Stop one tick short of the manual call boundary.
      game.actionClock.waitTicks = ActionClock.CLOCK_WAIT_TICKS - 1;

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

      // Reach the manual call boundary.
      game.actionClock.waitTicks = ActionClock.CLOCK_WAIT_TICKS;

      // Call the clock
      const nonActingSeatIndex = game.hand.actingSeat === 0 ? 1 : 0;
      Actions.callClock(game, { seat: nonActingSeatIndex });

      // Simulate the post-action handler starting the clock.
      ActionClock.start(game.actionClock);

      // Get view for the non-acting player
      const nonActingPlayer = game.hand.actingSeat === 0 ? player2 : player1;
      const view = playerView(game, nonActingPlayer);

      // The callClock action should no longer be available
      const seatActions = view.seats[nonActingSeatIndex].actions;
      const hasCallClock = seatActions.some((a) => a.action === "callClock");
      assert.strictEqual(hasCallClock, false);
    });

    it("should preserve the serialized player-view clock fields", () => {
      Actions.startHand(game);
      const blindsGen = Actions.blinds(game);
      blindsGen.next();
      blindsGen.next();
      const dealGen = Actions.dealPreflop(game);
      drainGenerator(dealGen);
      Betting.startBettingRound(game, "preflop");
      game.hand.currentBet = game.blinds.big;

      // Reach the wait boundary and call the clock.
      game.actionClock.waitTicks = ActionClock.CLOCK_WAIT_TICKS;
      const nonActingSeatIndex = game.hand.actingSeat === 0 ? 1 : 0;
      Actions.callClock(game, { seat: nonActingSeatIndex });

      const beforeStart = playerView(game, player1);
      assert.strictEqual(
        JSON.stringify({
          actingTicks: beforeStart.hand.actingTicks,
          clockRemaining: beforeStart.hand.clockRemaining,
        }),
        `{"actingTicks":${ActionClock.CLOCK_WAIT_TICKS}}`,
      );

      ActionClock.start(game.actionClock);

      const view1 = playerView(game, player1);
      const view2 = playerView(game, player2);
      const expected = `{"actingTicks":${ActionClock.CLOCK_WAIT_TICKS},"clockRemaining":59}`;

      for (const view of [view1, view2]) {
        assert.strictEqual(
          JSON.stringify({
            actingTicks: view.hand.actingTicks,
            clockRemaining: view.hand.clockRemaining,
          }),
          expected,
        );
      }
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

      // Set the internal wait state.
      game.actionClock.waitTicks = 45;

      // Both players should see the existing protocol field.
      const view1 = playerView(game, player1);
      const view2 = playerView(game, player2);

      assert.strictEqual(view1.hand.actingTicks, 45);
      assert.strictEqual(view2.hand.actingTicks, 45);
    });
  });
});
