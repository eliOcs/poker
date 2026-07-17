import { describe, it } from "node:test";
import assert from "node:assert";
import * as PokerGame from "../../src/backend/poker/game.js";
import * as Seat from "../../src/backend/poker/seat.js";
import {
  getOpenTables,
  getPopulatedOpenTables,
  hasSettledWaitingHand,
  isHandSettled,
  isTableReadyForNextHand,
  isTableReadyForRebalance,
  resetClosedTable,
  syncWaitingTableState,
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

  it("distinguishes open tables from populated open tables", () => {
    const populatedGame = PokerGame.create();
    populatedGame.seats[0] = Seat.occupied({ id: "p1" }, 100);
    const emptyGame = PokerGame.create();
    const closedGame = PokerGame.create();
    closedGame.seats[0] = Seat.occupied({ id: "p2" }, 100);
    const games = new Map([
      [populatedGame.id, populatedGame],
      [emptyGame.id, emptyGame],
      [closedGame.id, closedGame],
    ]);
    const tournament =
      /** @type {import("../../src/backend/mtt.js").ManagedTournament} */ (
        /** @type {unknown} */ ({
          tables: [
            { tableId: populatedGame.id },
            { tableId: emptyGame.id },
            { tableId: closedGame.id, closedAt: "2026-01-01T00:00:00.000Z" },
            { tableId: "missing" },
          ],
        })
      );

    assert.deepEqual(
      getOpenTables(tournament, games).map((entry) => entry.game.id),
      [populatedGame.id, emptyGame.id],
    );
    assert.deepEqual(
      getPopulatedOpenTables(tournament, games).map((entry) => entry.game.id),
      [populatedGame.id],
    );
  });

  it("suppresses a ready table countdown while rebalance is pending", () => {
    const game = PokerGame.createMttTable({
      tournamentId: "mtt",
      tableName: "Table 1",
      startTime: "2026-01-01T00:00:00.000Z",
    });
    game.seats[0] = Seat.occupied({ id: "p1" }, 100);
    game.seats[1] = Seat.occupied({ id: "p2" }, 100);
    game.countdown = 5;
    const tournament =
      /** @type {import("../../src/backend/mtt.js").ManagedTournament} */ (
        /** @type {unknown} */ ({
          id: "mtt",
          name: "Tournament",
          buyIn: 500,
          initialStack: 500_000,
          level: 1,
          levelTicks: 0,
          onBreak: false,
          pendingBreak: false,
          pendingRebalance: true,
          breakTicks: 0,
        })
      );

    syncWaitingTableState(tournament, game, () => {});

    assert.equal(game.countdown, undefined);
  });
});
