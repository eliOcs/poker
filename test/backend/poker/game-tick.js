import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import * as Game from "../../../src/backend/poker/game.js";
import * as Betting from "../../../src/backend/poker/betting.js";
import {
  tick,
  shouldTickBeRunning,
  resetActingTicks,
  startClockTicks,
  isClockCallable,
  DISCONNECT_TICKS,
  CLOCK_WAIT_TICKS,
  CLOCK_DURATION_TICKS,
} from "../../../src/backend/poker/game-tick.js";
import { createHeadsUpGame } from "./test-helpers.js";

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

        assert.strictEqual(game.countdown, null);
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

    describe("acting ticks", () => {
      beforeEach(() => {
        Betting.startBettingRound(game, "flop");
      });

      it("should increment actingTicks each tick", () => {
        assert.strictEqual(game.actingTicks, 0);

        tick(game);
        assert.strictEqual(game.actingTicks, 1);

        tick(game);
        assert.strictEqual(game.actingTicks, 2);
      });

      it("should not increment actingTicks when no one is acting", () => {
        game.hand.actingSeat = -1;
        game.actingTicks = 0;

        tick(game);
        assert.strictEqual(game.actingTicks, 0);
      });
    });

    describe("disconnect timeout", () => {
      beforeEach(() => {
        Betting.startBettingRound(game, "flop");
      });

      it("should trigger auto-action when disconnected player reaches timeout", () => {
        const actingSeat = game.hand.actingSeat;
        game.seats[actingSeat].disconnected = true;
        game.disconnectedActingTicks = DISCONNECT_TICKS - 1;

        const result = tick(game);

        assert.strictEqual(result.autoActionSeat, actingSeat);
        assert.strictEqual(result.autoActionReason, "disconnect");
      });

      it("should not trigger auto-action if disconnect timeout not reached", () => {
        const actingSeat = game.hand.actingSeat;
        game.seats[actingSeat].disconnected = true;
        game.disconnectedActingTicks = DISCONNECT_TICKS - 2;

        const result = tick(game);

        assert.strictEqual(result.autoActionSeat, null);
      });

      it("should not trigger auto-action if player is connected", () => {
        game.disconnectedActingTicks = 0;

        const result = tick(game);

        assert.strictEqual(result.autoActionSeat, null);
      });

      it("should increment disconnectedActingTicks when player is disconnected", () => {
        const actingSeat = game.hand.actingSeat;
        game.seats[actingSeat].disconnected = true;
        game.disconnectedActingTicks = 0;

        tick(game);
        assert.strictEqual(game.disconnectedActingTicks, 1);

        tick(game);
        assert.strictEqual(game.disconnectedActingTicks, 2);
      });
    });

    describe("clock expiry", () => {
      beforeEach(() => {
        Betting.startBettingRound(game, "flop");
      });

      it("should trigger auto-action when clock expires", () => {
        const actingSeat = game.hand.actingSeat;
        game.clockTicks = CLOCK_DURATION_TICKS - 1;

        const result = tick(game);

        assert.strictEqual(result.autoActionSeat, actingSeat);
        assert.strictEqual(result.autoActionReason, "clock");
      });

      it("should not trigger auto-action if clock not expired", () => {
        game.clockTicks = CLOCK_DURATION_TICKS - 2;

        const result = tick(game);

        assert.strictEqual(result.autoActionSeat, null);
      });

      it("should not trigger auto-action if clock not called", () => {
        game.clockTicks = 0;

        const result = tick(game);

        assert.strictEqual(result.autoActionSeat, null);
      });

      it("should increment clockTicks when clock is active", () => {
        game.clockTicks = 1;

        tick(game);
        assert.strictEqual(game.clockTicks, 2);

        tick(game);
        assert.strictEqual(game.clockTicks, 3);
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

  describe("resetActingTicks", () => {
    it("should reset all tick counters", () => {
      game.actingTicks = 10;
      game.disconnectedActingTicks = 5;
      game.clockTicks = 15;

      resetActingTicks(game);

      assert.strictEqual(game.actingTicks, 0);
      assert.strictEqual(game.disconnectedActingTicks, 0);
      assert.strictEqual(game.clockTicks, 0);
    });
  });

  describe("startClockTicks", () => {
    it("should set clockTicks to 1", () => {
      game.clockTicks = 0;

      startClockTicks(game);

      assert.strictEqual(game.clockTicks, 1);
    });
  });

  describe("isClockCallable", () => {
    it("should return true when actingTicks >= CLOCK_WAIT_TICKS and clock not called", () => {
      game.actingTicks = CLOCK_WAIT_TICKS;
      game.clockTicks = 0;

      assert.strictEqual(isClockCallable(game), true);
    });

    it("should return false when actingTicks < CLOCK_WAIT_TICKS", () => {
      game.actingTicks = CLOCK_WAIT_TICKS - 1;
      game.clockTicks = 0;

      assert.strictEqual(isClockCallable(game), false);
    });

    it("should return false when clock already called", () => {
      game.actingTicks = CLOCK_WAIT_TICKS;
      game.clockTicks = 1;

      assert.strictEqual(isClockCallable(game), false);
    });
  });

  describe("tick constants", () => {
    it("should have correct default values", () => {
      assert.strictEqual(DISCONNECT_TICKS, 5);
      assert.strictEqual(CLOCK_WAIT_TICKS, 60);
      assert.strictEqual(CLOCK_DURATION_TICKS, 30);
    });
  });

  describe("game state initialization", () => {
    it("should initialize actingTicks as 0", () => {
      const newGame = Game.create();
      assert.strictEqual(newGame.actingTicks, 0);
    });

    it("should initialize disconnectedActingTicks as 0", () => {
      const newGame = Game.create();
      assert.strictEqual(newGame.disconnectedActingTicks, 0);
    });

    it("should initialize clockTicks as 0", () => {
      const newGame = Game.create();
      assert.strictEqual(newGame.clockTicks, 0);
    });
  });
});
