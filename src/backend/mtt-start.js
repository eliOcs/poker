import { seatEntrantAtTable } from "./mtt-seating.js";
import { syncWaitingTableState } from "./mtt-table-state.js";

/**
 * @param {import('./mtt.js').ManagedTournament} tournament
 * @param {number} entrantCount
 */
function buildTableSizes(tournament, entrantCount) {
  const tableCount = Math.ceil(entrantCount / tournament.tableSize);
  const base = Math.floor(entrantCount / tableCount);
  const remainder = entrantCount % tableCount;
  return Array.from(
    { length: tableCount },
    (_, index) => base + (index < remainder ? 1 : 0),
  );
}

/**
 * @param {import('./mtt.js').ManagedTournament} tournament
 * @param {(options: { finalTable: boolean }) => { table: import('./mtt.js').ManagedTable, game: import('./poker/game.js').Game }} createTable
 * @param {(game: import('./poker/game.js').Game) => void} ensureTableTick
 * @returns {string[]}
 */
export function createStartingTables(tournament, createTable, ensureTableTick) {
  const entrants = [...tournament.entrants.values()].sort(
    (a, b) => a.registrationOrder - b.registrationOrder,
  );
  const tableSizes = buildTableSizes(tournament, entrants.length);
  const createdTableIds = [];
  let entrantIndex = 0;

  for (const tableSize of tableSizes) {
    const { game } = createTable({ finalTable: tableSizes.length === 1 });
    createdTableIds.push(game.id);

    for (let seatIndex = 0; seatIndex < tableSize; seatIndex += 1) {
      const entrant = entrants[entrantIndex];
      if (!entrant) break;
      seatEntrantAtTable(tournament, game, entrant, seatIndex);
      entrantIndex += 1;
    }
    syncWaitingTableState(tournament, game, ensureTableTick);
  }

  return createdTableIds;
}
