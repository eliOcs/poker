import { describe, it } from "node:test";
import assert from "node:assert";
import * as PokerGame from "../../src/backend/poker/game.js";
import {
  hasSettledWaitingHand,
  isHandSettled,
  isTableReadyForNextHand,
  isTableReadyForRebalance,
  resetClosedTable,
} from "../../src/backend/mtt-table-state.js";

describe("mtt table state", () => {
  it("distinguishes a settled hand from next-hand and rebalance readiness", () => {
    const game = PokerGame.create();

    assert.equal(isHandSettled(game), true);
    assert.equal(isTableReadyForNextHand(game), true);
    assert.equal(isTableReadyForRebalance(game), true);
    assert.equal(hasSettledWaitingHand(game), false);

    game.pendingHandHistory = [];

    assert.equal(isHandSettled(game), true);
    assert.equal(isTableReadyForNextHand(game), false);
    assert.equal(isTableReadyForRebalance(game), false);
    assert.equal(hasSettledWaitingHand(game), true);
  });

  it("keeps unsettled table activity out of every readiness state", () => {
    const states = [
      (game) => {
        game.hand.phase = "flop";
      },
      (game) => {
        game.collectingBets = { active: true, delayTicks: 1 };
      },
      (game) => {
        game.runout = { active: true, delayTicks: 1 };
      },
    ];

    for (const arrange of states) {
      const game = PokerGame.create();
      arrange(game);

      assert.equal(isHandSettled(game), false);
      assert.equal(isTableReadyForNextHand(game), false);
      assert.equal(isTableReadyForRebalance(game), false);
    }
  });

  it("keeps unresolved rebuy decisions out of next-hand and rebalance readiness", () => {
    const game = PokerGame.create();
    game.pendingRebuyDecision = {
      entries: [{ playerId: "p1", seatIndex: 0 }],
      clock: { waitTicks: 0, countdownTicks: 0 },
    };

    assert.equal(isHandSettled(game), true);
    assert.equal(isTableReadyForNextHand(game), false);
    assert.equal(isTableReadyForRebalance(game), false);

    game.pendingRebuyDecision.entries[0].resolution = "rebuy";

    assert.equal(isTableReadyForNextHand(game), true);
    assert.equal(isTableReadyForRebalance(game), true);
  });

  it("resets the action clock when clearing a closed table", () => {
    const game = PokerGame.create();
    game.actionClock.waitTicks = 15;
    game.actionClock.countdownTicks = 59;

    resetClosedTable(game);

    assert.deepStrictEqual(game.actionClock, {
      waitTicks: 0,
      countdownTicks: 0,
    });
  });
});
