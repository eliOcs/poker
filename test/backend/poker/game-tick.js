import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import * as Game from "../../../src/backend/poker/game.js";
import * as Betting from "../../../src/backend/poker/betting.js";
import * as ActionClock from "../../../src/backend/poker/action-clock.js";
import {
  tick,
  shouldTickBeRunning,
} from "../../../src/backend/poker/game-tick.js";
import { createHeadsUpGame } from "./test-helpers.js";

const { RUNOUT_DELAY_TICKS } = Game;

describe("game-tick", () => {
  /** @type {import('../../../src/backend/poker/game.js').Game} */
  let game;

  beforeEach(() => {
    game = createHeadsUpGame();
  });

  describe("tick", () => {
    describe("countdown", () => {
      it("should decrement countdown", () => {
        game.countdown = 3;
        const result = tick(game);

        assert.strictEqual(game.countdown, 2);
        assert.strictEqual(result.shouldBroadcast, true);
        assert.strictEqual(result.startHand, false);
      });

      it("should trigger startHand when countdown reaches 0", () => {
        game.countdown = 1;
        const result = tick(game);

        assert.strictEqual(game.countdown, undefined);
        assert.strictEqual(result.startHand, true);
        assert.strictEqual(result.shouldBroadcast, true);
      });

      it("should not trigger startHand when countdown is above 0", () => {
        game.countdown = 2;
        const result = tick(game);

        assert.strictEqual(game.countdown, 1);
        assert.strictEqual(result.startHand, false);
      });
    });

    describe("action wait ticks", () => {
      beforeEach(() => {
        Betting.startBettingRound(game, "flop");
      });

      it("should increment wait ticks while a player is acting", () => {
        assert.strictEqual(game.actionClock.waitTicks, 0);

        tick(game);
        assert.strictEqual(game.actionClock.waitTicks, 1);

        tick(game);
        assert.strictEqual(game.actionClock.waitTicks, 2);
      });

      it("should not increment wait ticks when no one is acting", () => {
        game.hand.actingSeat = -1;
        game.actionClock.waitTicks = 0;

        tick(game);
        assert.strictEqual(game.actionClock.waitTicks, 0);
      });
    });

    describe("clock expiry", () => {
      beforeEach(() => {
        Betting.startBettingRound(game, "flop");
      });

      it("should trigger auto-action when clock expires", () => {
        const actingSeat = game.hand.actingSeat;
        game.actionClock.countdownTicks = ActionClock.CLOCK_DURATION_TICKS - 1;

        const result = tick(game);

        assert.strictEqual(result.autoActionSeat, actingSeat);
        assert.strictEqual(result.autoActionReason, "clock");
      });

      it("should not trigger auto-action if clock not expired", () => {
        game.actionClock.countdownTicks = ActionClock.CLOCK_DURATION_TICKS - 2;

        const result = tick(game);

        assert.strictEqual(result.autoActionSeat, undefined);
      });

      it("should not trigger auto-action if clock not called", () => {
        game.actionClock.countdownTicks = 0;

        const result = tick(game);

        assert.strictEqual(result.autoActionSeat, undefined);
      });

      it("should increment countdown ticks when clock is active", () => {
        game.actionClock.countdownTicks = 1;

        tick(game);
        assert.strictEqual(game.actionClock.countdownTicks, 2);

        tick(game);
        assert.strictEqual(game.actionClock.countdownTicks, 3);
      });

      it("should request exactly one automatic action when clock expires", () => {
        const actingSeat = game.hand.actingSeat;
        game.actionClock.countdownTicks = ActionClock.CLOCK_DURATION_TICKS - 1;

        const expiryTick = tick(game);
        const laterTick = tick(game);

        assert.strictEqual(expiryTick.autoActionSeat, actingSeat);
        assert.strictEqual(expiryTick.autoActionReason, "clock");
        assert.strictEqual(laterTick.autoActionSeat, undefined);
      });
    });

    describe("shouldTickBeRunning", () => {
      it("should return false when no countdown and no one acting", () => {
        game.countdown = null;
        game.hand.actingSeat = -1;

        assert.strictEqual(shouldTickBeRunning(game), false);
      });

      it("should return true when countdown is active", () => {
        game.countdown = 2;
        game.hand.actingSeat = -1;

        assert.strictEqual(shouldTickBeRunning(game), true);
      });

      it("should return true when someone is acting", () => {
        game.countdown = null;
        Betting.startBettingRound(game, "flop");

        assert.strictEqual(shouldTickBeRunning(game), true);
      });
    });

    describe("shouldBroadcast", () => {
      it("should broadcast when countdown is active", () => {
        game.countdown = 2;

        const result = tick(game);

        assert.strictEqual(result.shouldBroadcast, true);
      });

      it("should broadcast when someone is acting", () => {
        Betting.startBettingRound(game, "flop");

        const result = tick(game);

        assert.strictEqual(result.shouldBroadcast, true);
      });

      it("should not broadcast when idle", () => {
        game.countdown = null;
        game.hand.actingSeat = -1;

        const result = tick(game);

        assert.strictEqual(result.shouldBroadcast, false);
      });
    });
  });

  describe("shouldTickBeRunning", () => {
    it("should return true when countdown is active", () => {
      game.countdown = 3;
      assert.strictEqual(shouldTickBeRunning(game), true);
    });

    it("should return true when someone is acting", () => {
      Betting.startBettingRound(game, "flop");
      assert.strictEqual(shouldTickBeRunning(game), true);
    });

    it("should return false when idle", () => {
      game.countdown = null;
      game.hand.actingSeat = -1;
      assert.strictEqual(shouldTickBeRunning(game), false);
    });
  });

  describe("game state initialization", () => {
    it("should initialize action clock state", () => {
      const newGame = Game.create();
      assert.deepStrictEqual(newGame.actionClock, {
        waitTicks: 0,
        countdownTicks: 0,
      });
    });

    it("should initialize runout as undefined", () => {
      const newGame = Game.create();
      assert.strictEqual(newGame.runout, undefined);
    });
  });

  describe("runout tick", () => {
    it("should decrement delayTicks each tick", () => {
      game.runout = { active: true, delayTicks: RUNOUT_DELAY_TICKS };
      game.hand.actingSeat = -1;

      tick(game);

      assert.strictEqual(game.runout.delayTicks, RUNOUT_DELAY_TICKS - 1);
    });

    it("should trigger dealNextStreet when delay reaches 0", () => {
      game.runout = { active: true, delayTicks: 1 };
      game.hand.actingSeat = -1;

      const result = tick(game);

      assert.strictEqual(result.dealNextStreet, true);
      assert.strictEqual(result.shouldBroadcast, true);
    });

    it("should not trigger dealNextStreet when delay is above 0", () => {
      game.runout = { active: true, delayTicks: 2 };
      game.hand.actingSeat = -1;

      const result = tick(game);

      assert.strictEqual(result.dealNextStreet, false);
      assert.strictEqual(game.runout.delayTicks, 1);
    });

    it("should not process runout when not active", () => {
      game.runout = null;
      game.hand.actingSeat = -1;

      const result = tick(game);

      assert.strictEqual(result.dealNextStreet, false);
    });

    it("shouldTickBeRunning returns true when runout is active", () => {
      game.runout = { active: true, delayTicks: 2 };
      game.countdown = null;
      game.hand.actingSeat = -1;

      assert.strictEqual(shouldTickBeRunning(game), true);
    });

    it("shouldTickBeRunning returns false when runout is inactive", () => {
      game.runout = { active: false, delayTicks: 2 };
      game.countdown = null;
      game.hand.actingSeat = -1;

      assert.strictEqual(shouldTickBeRunning(game), false);
    });
  });

  describe("RUNOUT_DELAY_TICKS constant", () => {
    it("should have correct default value", () => {
      assert.strictEqual(RUNOUT_DELAY_TICKS, 2);
    });
  });
});
