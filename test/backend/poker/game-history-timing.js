import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import * as Game from "../../../src/backend/poker/game.js";
import * as HandHistory from "../../../src/backend/poker/hand-history/index.js";
import { createHeadsUpGame } from "./test-helpers.js";

describe("game history timing", () => {
  /** @type {import('../../../src/backend/poker/game.js').Game} */
  let game;

  beforeEach(() => {
    game = createHeadsUpGame();
    HandHistory.clearCache();
    HandHistory.clearRecorder(game.id);
  });

  afterEach(() => {
    HandHistory.clearRecorder(game.id);
  });

  it("defers hand history finalization until after the post-hand countdown", () => {
    game.handNumber = 1;
    HandHistory.startHand(game);
    HandHistory.recordBlind(game.id, "player1", "sb", 25);

    game.hand = {
      phase: "flop",
      pot: 50,
      currentBet: 0,
      actingSeat: -1,
      lastRaiser: -1,
      lastRaiseSize: 0,
    };
    game.seats[2].folded = true;

    Game.processGameFlow(game);

    assert.ok(game.pendingHandHistory, "pot results should be pending");
    assert.strictEqual(HandHistory.getCacheSize(), 0);
    assert.strictEqual(game.countdown, 5);
  });

  it("finalizes pending hand history when the next hand starts", async () => {
    game.handNumber = 1;
    HandHistory.startHand(game);
    HandHistory.recordBlind(game.id, "player1", "sb", 25);

    game.pendingHandHistory = [
      {
        potAmount: 25,
        winners: [0],
        winningHand: null,
        winningCards: null,
        awards: [{ seat: 0, amount: 25 }],
      },
    ];

    Game.startHand(game);

    assert.strictEqual(game.pendingHandHistory, null);
    assert.strictEqual(game.handNumber, 2);
    assert.strictEqual(HandHistory.getCacheSize(), 1);

    const savedHand = await HandHistory.getHand(game.id, 1);
    assert.ok(savedHand);
    assert.strictEqual(savedHand.game_number, `${game.id}-1`);
  });
});
