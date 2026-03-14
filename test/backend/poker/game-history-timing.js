import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { setTimeout as delay } from "node:timers/promises";
import * as Game from "../../../src/backend/poker/game.js";
import * as HandHistory from "../../../src/backend/poker/hand-history/index.js";
import * as Store from "../../../src/backend/store.js";
import { createHeadsUpGame } from "./test-helpers.js";

async function waitForHandHistoryFlush() {
  for (let i = 0; i < 200; i += 1) {
    if (
      HandHistory.getCacheSize() === 1 &&
      Store.listPlayerGameIds("player1").length === 1 &&
      Store.listPlayerGameIds("player2").length === 1
    ) {
      return;
    }
    await delay(0);
  }

  throw new Error("hand history did not flush in time");
}

describe("game history timing", () => {
  /** @type {import('../../../src/backend/poker/game.js').Game} */
  let game;

  beforeEach(() => {
    Store._reset();
    Store.initialize(":memory:");
    game = createHeadsUpGame();
    HandHistory.clearCache();
    HandHistory.clearRecorder(game.id);
  });

  afterEach(() => {
    Store.close();
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

    const handData = Game.startHand(game);
    if (handData) {
      HandHistory.finalizeHand(
        game,
        handData.potResults,
        handData.handNumber,
      ).then((hand) => {
        Store.recordPlayerGames(
          hand.players.map((player) => ({
            playerId: player.id,
            gameId: game.id,
          })),
        );
      });
    }
    await waitForHandHistoryFlush();

    assert.strictEqual(game.pendingHandHistory, null);
    assert.strictEqual(game.handNumber, 2);
    assert.strictEqual(HandHistory.getCacheSize(), 1);
    assert.deepStrictEqual(Store.listPlayerGameIds("player1"), [game.id]);
    assert.deepStrictEqual(Store.listPlayerGameIds("player2"), [game.id]);

    const savedHand = await HandHistory.getHand(game.id, 1);
    assert.ok(savedHand);
    assert.strictEqual(savedHand.game_number, `${game.id}-1`);
  });

  it("includes historyHand with players and rounds in finalized hand data", () => {
    game.handNumber = 1;
    HandHistory.startHand(game);
    HandHistory.recordBlind(game.id, "player1", "sb", 25);
    HandHistory.recordBlind(game.id, "player2", "bb", 50);

    game.pendingHandHistory = [
      {
        potAmount: 75,
        winners: [0],
        winningHand: null,
        winningCards: null,
        awards: [{ seat: 0, amount: 75 }],
      },
    ];

    const handData = Game.startHand(game);

    assert.ok(handData, "startHand should return finalized hand data");
    assert.ok(handData.historyHand, "finalized data must include historyHand");
    assert.ok(
      handData.historyHand.players.length > 0,
      "historyHand.players must not be empty",
    );
    assert.ok(
      handData.historyHand.rounds.length > 0,
      "historyHand.rounds must not be empty",
    );
  });
});
