import {
  isTableWaiting,
  countActivePlayers,
  clearTableWinner,
  resetClosedTable,
  applyTournamentStateToTable,
  syncWaitingTableState,
  getActiveTables,
} from "./mtt-table-state.js";
import { getActiveSeatIndexes, movePlayer } from "./mtt-seating.js";

/**
 * @typedef {import('./poker/game.js').Game} Game
 * @typedef {import('./mtt.js').ManagedTournament} ManagedTournament
 * @typedef {import('./mtt.js').ManagedTable} ManagedTable
 */

/**
 * @param {Array<{ table: ManagedTable, game: Game, activePlayers: number }>} activeTables
 * @returns {boolean}
 */
function areAllTablesWaiting(activeTables) {
  return activeTables.every((entry) => isTableWaiting(entry.game));
}

/**
 * @param {Array<{ table: ManagedTable, game: Game, activePlayers: number }>} tables
 * @returns {Array<{ table: ManagedTable, game: Game, activePlayers: number }>}
 */
function sortBySmallestTable(tables) {
  return [...tables].sort((a, b) => {
    if (a.activePlayers !== b.activePlayers) {
      return a.activePlayers - b.activePlayers;
    }
    return a.table.createdOrder - b.table.createdOrder;
  });
}

/**
 * @param {Array<{ table: ManagedTable, game: Game, activePlayers: number }>} tables
 * @returns {Array<{ table: ManagedTable, game: Game, activePlayers: number }>}
 */
function sortByLargestTable(tables) {
  return [...tables].sort((a, b) => {
    if (a.activePlayers !== b.activePlayers) {
      return b.activePlayers - a.activePlayers;
    }
    return a.table.createdOrder - b.table.createdOrder;
  });
}

/**
 * @param {ManagedTournament} tournament
 * @param {Array<{ table: ManagedTable, game: Game, activePlayers: number }>} activeTables
 * @param {Set<string>} changedTables
 */
function markPendingCollapse(tournament, activeTables, changedTables) {
  tournament.pendingCollapse = true;
  for (const entry of activeTables) {
    changedTables.add(entry.game.id);
  }
}

/**
 * @param {Array<{ table: ManagedTable, game: Game, activePlayers: number }>} activeTables
 * @returns {{ table: ManagedTable, game: Game, activePlayers: number } | undefined}
 */
function getBreakCandidate(activeTables) {
  return sortBySmallestTable(activeTables).find((entry) =>
    isTableWaiting(entry.game),
  );
}

/**
 * @param {Array<{ table: ManagedTable, game: Game, activePlayers: number }>} destinationTables
 * @returns {{ table: ManagedTable, game: Game, activePlayers: number } | undefined}
 */
function getWaitingDestinationTable(destinationTables) {
  return sortBySmallestTable(
    destinationTables
      .map((entry) => ({
        ...entry,
        activePlayers: countActivePlayers(entry.game),
      }))
      .filter((entry) => isTableWaiting(entry.game)),
  )[0];
}

/**
 * @param {ManagedTournament} tournament
 * @param {{ table: ManagedTable, game: Game, activePlayers: number }} breakCandidate
 * @param {Array<{ table: ManagedTable, game: Game, activePlayers: number }>} destinationTables
 * @param {Set<string>} changedTables
 * @returns {boolean}
 */
function collapseTableIntoDestinations(
  tournament,
  breakCandidate,
  destinationTables,
  changedTables,
) {
  const activeSeats = getActiveSeatIndexes(
    tournament,
    breakCandidate.game,
  ).sort((a, b) => b - a);

  for (const seatIndex of activeSeats) {
    const destination = getWaitingDestinationTable(destinationTables);
    if (!destination) {
      return false;
    }

    movePlayer(tournament, breakCandidate.game, seatIndex, destination.game);
    changedTables.add(breakCandidate.game.id);
    changedTables.add(destination.game.id);
  }

  return true;
}

/**
 * @param {ManagedTournament} tournament
 * @param {Map<string, Game>} games
 * @param {Set<string>} changedTables
 * @param {() => string} now
 * @param {(activeTables: Array<{ table: ManagedTable, game: Game, activePlayers: number }>, changedTables: Set<string>) => void} mergeIntoFinalTable
 */
export function collapseExtraTables(
  tournament,
  games,
  changedTables,
  now,
  mergeIntoFinalTable,
) {
  for (;;) {
    const activeTables = getActiveTables(tournament, games);
    const totalPlayers = activeTables.reduce(
      (sum, table) => sum + table.activePlayers,
      0,
    );
    const targetTableCount = Math.max(
      1,
      Math.ceil(totalPlayers / tournament.tableSize),
    );

    if (activeTables.length <= targetTableCount) {
      tournament.pendingCollapse = false;
      return;
    }

    if (targetTableCount === 1) {
      if (!areAllTablesWaiting(activeTables)) {
        markPendingCollapse(tournament, activeTables, changedTables);
        return;
      }

      mergeIntoFinalTable(activeTables, changedTables);
      tournament.pendingCollapse = false;
      return;
    }

    const breakCandidate = getBreakCandidate(activeTables);
    if (!breakCandidate) {
      markPendingCollapse(tournament, activeTables, changedTables);
      return;
    }

    const destinationTables = activeTables.filter(
      (entry) => entry.table.tableId !== breakCandidate.table.tableId,
    );
    if (
      !collapseTableIntoDestinations(
        tournament,
        breakCandidate,
        destinationTables,
        changedTables,
      )
    ) {
      markPendingCollapse(tournament, activeTables, changedTables);
      return;
    }

    breakCandidate.table.closedAt = now();
    clearTableWinner(breakCandidate.game);
    resetClosedTable(breakCandidate.game);
    applyTournamentStateToTable(tournament, breakCandidate.game);
  }
}

/**
 * @param {ManagedTournament} tournament
 * @param {Map<string, Game>} games
 * @param {Set<string>} changedTables
 */
export function balanceWaitingTables(tournament, games, changedTables) {
  for (;;) {
    const waitingTables = getActiveTables(tournament, games).filter((entry) =>
      isTableWaiting(entry.game),
    );
    if (waitingTables.length < 2) {
      return;
    }

    const fullest = sortByLargestTable(waitingTables)[0];
    const emptiest = sortBySmallestTable(waitingTables)[0];
    if (
      !fullest ||
      !emptiest ||
      fullest.table.tableId === emptiest.table.tableId
    ) {
      return;
    }
    if (fullest.activePlayers - emptiest.activePlayers <= 1) {
      return;
    }

    const sourceSeatIndex = getActiveSeatIndexes(tournament, fullest.game).sort(
      (a, b) => b - a,
    )[0];
    if (sourceSeatIndex === undefined) {
      return;
    }

    movePlayer(tournament, fullest.game, sourceSeatIndex, emptiest.game);
    changedTables.add(fullest.game.id);
    changedTables.add(emptiest.game.id);
  }
}

/**
 * @param {ManagedTournament} tournament
 * @param {Map<string, Game>} games
 * @param {(game: Game) => void} ensureTableTick
 * @param {() => string} now
 * @param {(activeTables: Array<{ table: ManagedTable, game: Game, activePlayers: number }>, changedTables: Set<string>) => void} mergeIntoFinalTable
 * @returns {Set<string>}
 */
export function rebalanceTournament(
  tournament,
  games,
  ensureTableTick,
  now,
  mergeIntoFinalTable,
) {
  /** @type {Set<string>} */
  const changedTables = new Set();

  collapseExtraTables(
    tournament,
    games,
    changedTables,
    now,
    mergeIntoFinalTable,
  );
  balanceWaitingTables(tournament, games, changedTables);

  for (const tableId of changedTables) {
    const game = games.get(tableId);
    if (game) {
      syncWaitingTableState(tournament, game, ensureTableTick);
    }
  }

  return changedTables;
}
