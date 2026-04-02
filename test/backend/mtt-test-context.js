import * as Store from "../../src/backend/store.js";
import { createMttManager } from "../../src/backend/mtt.js";

export const FINAL_TABLE_NAME = "Final Table";

/**
 * @param {string} id
 * @param {string} [name]
 * @returns {import("../../src/backend/user.js").User}
 */
export function createUser(id, name = id) {
  return {
    id,
    name,
    settings: { volume: 0.75, vibration: true },
  };
}

/**
 * @param {import("../../src/backend/poker/game.js").Game} game
 * @returns {number}
 */
export function countActivePlayers(game) {
  return game.seats.filter((seat) => !seat.empty && seat.stack > 0).length;
}

/**
 * @param {{ tables: Array<{ tableId: string, tableName: string, closedAt: string|null }> }} tournament
 * @param {Map<string, import("../../src/backend/poker/game.js").Game>} games
 * @returns {number}
 */
export function countTournamentActivePlayers(tournament, games) {
  return tournament.tables.reduce((count, table) => {
    const game = games.get(table.tableId);
    return count + (game ? countActivePlayers(game) : 0);
  }, 0);
}

/**
 * @param {{ tables: Array<{ tableId: string, tableName: string, closedAt: string|null }> }} tournament
 * @param {Map<string, import("../../src/backend/poker/game.js").Game>} games
 * @returns {import("../../src/backend/poker/game.js").Game|null}
 */
export function getOpenFinalTable(tournament, games) {
  const finalTable = tournament.tables.find(
    (table) => table.tableName === FINAL_TABLE_NAME && table.closedAt === null,
  );
  return finalTable ? games.get(finalTable.tableId) || null : null;
}

/**
 * Creates a shared MTT test context with setup/teardown.
 * Use `ctx.setup()` in beforeEach and `ctx.teardown()` in afterEach.
 * Access shared state via `ctx.games`, `ctx.manager`, etc.
 */
export function createMttContext() {
  const ctx = {
    /** @type {Map<string, import("../../src/backend/poker/game.js").Game>} */
    games: /** @type {any} */ (null),
    /** @type {ReturnType<typeof createMttManager>} */
    manager: /** @type {any} */ (null),
    /** @type {string[]} */
    tableBroadcasts: [],
    /** @type {string[]} */
    tournamentBroadcasts: [],
    tickCount: 0,
    setup() {
      Store._reset();
      Store.initialize(":memory:");
      ctx.games = new Map();
      ctx.tableBroadcasts = [];
      ctx.tournamentBroadcasts = [];
      ctx.tickCount = 0;
      ctx.manager = createMttManager({
        games: ctx.games,
        broadcastTableState: (tableId) => ctx.tableBroadcasts.push(tableId),
        broadcastTournamentState: (tournamentId) =>
          ctx.tournamentBroadcasts.push(tournamentId),
        ensureTableTick: () => {},
        finalizePendingTableHand: (game) => {
          if (!game.pendingHandHistory) return false;
          game.pendingHandHistory = null;
          return true;
        },
        now: () =>
          `2026-03-14T00:00:${String(ctx.tickCount++).padStart(2, "0")}.000Z`,
        setIntervalFn: () => ({ unref() {} }),
        clearIntervalFn: () => {},
      });
    },
    teardown() {
      ctx.manager.close();
      Store.close();
    },
  };
  return ctx;
}
