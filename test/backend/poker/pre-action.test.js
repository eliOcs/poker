import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import {
  setPreAction,
  clearPreAction,
  resolvePreAction,
  invalidateCallPreActions,
} from "../../../src/backend/poker/pre-action.js";
import * as Seat from "../../../src/backend/poker/seat.js";
import { createGameWithPlayers } from "./test-helpers.js";

describe("pre-action", () => {
  describe("setPreAction", () => {
    it("sets checkFold pre-action on seat", () => {
      const seat = Seat.occupied({ id: "p1" }, 1000);
      setPreAction(seat, "checkFold");
      assert.deepStrictEqual(seat.preAction, {
        type: "checkFold",
        amount: null,
      });
    });

    it("sets callAmount pre-action with amount", () => {
      const seat = Seat.occupied({ id: "p1" }, 1000);
      setPreAction(seat, "callAmount", 200);
      assert.deepStrictEqual(seat.preAction, {
        type: "callAmount",
        amount: 200,
      });
    });
  });

  describe("clearPreAction", () => {
    it("clears pre-action from seat", () => {
      const seat = Seat.occupied({ id: "p1" }, 1000);
      setPreAction(seat, "checkFold");
      clearPreAction(seat);
      assert.strictEqual(seat.preAction, null);
    });
  });

  describe("resolvePreAction", () => {
    /** @type {import('../../../src/backend/poker/game.js').Game} */
    let game;

    beforeEach(() => {
      game = createGameWithPlayers();
      game.hand.phase = "flop";
      game.hand.actingSeat = 0;
    });

    describe("checkFold", () => {
      const preAction = { type: "checkFold", amount: null };

      it("resolves to check when no bet to call", () => {
        game.hand.currentBet = 0;
        game.seats[0].bet = 0;
        const result = resolvePreAction(preAction, game, 0);
        assert.deepStrictEqual(result, {
          action: "check",
          args: { seat: 0 },
        });
      });

      it("resolves to fold when there is a bet", () => {
        game.hand.currentBet = 200;
        game.seats[0].bet = 0;
        const result = resolvePreAction(preAction, game, 0);
        assert.deepStrictEqual(result, {
          action: "fold",
          args: { seat: 0 },
        });
      });

      it("resolves to check when bet matches current bet", () => {
        game.hand.currentBet = 100;
        game.seats[0].bet = 100;
        const result = resolvePreAction(preAction, game, 0);
        assert.deepStrictEqual(result, {
          action: "check",
          args: { seat: 0 },
        });
      });
    });

    describe("callAmount", () => {
      it("resolves to call when amount matches toCall", () => {
        game.hand.currentBet = 200;
        game.seats[0].bet = 0;
        game.seats[0].stack = 1000;
        const preAction = { type: "callAmount", amount: 200 };
        const result = resolvePreAction(preAction, game, 0);
        assert.deepStrictEqual(result, {
          action: "call",
          args: { seat: 0 },
        });
      });

      it("resolves to allIn when short-stacked", () => {
        game.hand.currentBet = 200;
        game.seats[0].bet = 0;
        game.seats[0].stack = 100;
        const preAction = { type: "callAmount", amount: 100 };
        const result = resolvePreAction(preAction, game, 0);
        assert.deepStrictEqual(result, {
          action: "allIn",
          args: { seat: 0 },
        });
      });

      it("returns null when amount does not match toCall", () => {
        game.hand.currentBet = 400;
        game.seats[0].bet = 0;
        game.seats[0].stack = 1000;
        const preAction = { type: "callAmount", amount: 200 };
        const result = resolvePreAction(preAction, game, 0);
        assert.strictEqual(result, null);
      });

      it("returns null when no bet to call but amount set", () => {
        game.hand.currentBet = 0;
        game.seats[0].bet = 0;
        game.seats[0].stack = 1000;
        const preAction = { type: "callAmount", amount: 200 };
        const result = resolvePreAction(preAction, game, 0);
        assert.strictEqual(result, null);
      });
    });
  });

  describe("invalidateCallPreActions", () => {
    it("clears callAmount pre-actions from all seats", () => {
      const game = createGameWithPlayers();
      game.seats[0].preAction = { type: "callAmount", amount: 100 };
      game.seats[2].preAction = { type: "checkFold", amount: null };
      game.seats[4].preAction = { type: "callAmount", amount: 200 };

      invalidateCallPreActions(game);

      assert.strictEqual(game.seats[0].preAction, null);
      assert.deepStrictEqual(game.seats[2].preAction, {
        type: "checkFold",
        amount: null,
      });
      assert.strictEqual(game.seats[4].preAction, null);
    });

    it("does not affect empty seats", () => {
      const game = createGameWithPlayers();
      // seats 1, 3, 5 are empty
      invalidateCallPreActions(game);
      assert.ok(game.seats[1].empty);
    });
  });

  describe("resetForNewHand clears preAction", () => {
    it("clears preAction when resetting for new hand", () => {
      const seat = Seat.occupied({ id: "p1" }, 1000);
      seat.preAction = { type: "checkFold", amount: null };
      Seat.resetForNewHand(seat);
      assert.strictEqual(seat.preAction, null);
    });
  });
});
