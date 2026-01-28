import { describe, it } from "node:test";
import assert from "node:assert";
import { classifyAllInAction } from "../../src/backend/websocket-handler.js";

describe("websocket-handler", () => {
  describe("classifyAllInAction", () => {
    it("should return bet when currentBet is 0", () => {
      // Going all-in when no one has bet
      assert.strictEqual(classifyAllInAction(0, 0, 1000), "bet");
      // Even with a previous bet on this street
      assert.strictEqual(classifyAllInAction(50, 0, 1000), "bet");
    });

    it("should return call when finalBet equals currentBet", () => {
      // Exact call
      assert.strictEqual(classifyAllInAction(0, 100, 100), "call");
      // Already had partial bet
      assert.strictEqual(classifyAllInAction(50, 100, 100), "call");
    });

    it("should return call when finalBet is less than currentBet (all-in for less)", () => {
      // All-in for less than current bet
      assert.strictEqual(classifyAllInAction(0, 100, 50), "call");
      assert.strictEqual(classifyAllInAction(25, 100, 75), "call");
    });

    it("should return raise when finalBet exceeds currentBet", () => {
      // Going over the current bet
      assert.strictEqual(classifyAllInAction(0, 100, 200), "raise");
      // Already had some bet, raising more
      assert.strictEqual(classifyAllInAction(50, 100, 300), "raise");
      assert.strictEqual(classifyAllInAction(100, 100, 500), "raise");
    });
  });
});
