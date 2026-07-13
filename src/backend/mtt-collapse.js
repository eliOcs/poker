import {
  isTableReadyForRebalance,
  countActivePlayers,
  clearTableWinner,
  resetClosedTable,
  applyTournamentStateToTable,
  getActiveTables,
} from "./mtt-table-state.js";
import { getActiveSeatIndexes, movePlayer } from "./mtt-seating.js";

/**
 * @typedef {import('./poker/game.js').Game} Game
 * @typedef {import('./mtt.js').ManagedTournament} ManagedTournament
 * @typedef {import('./mtt.js').ManagedTable} ManagedTable
 * @typedef {import('./mtt-seating.js').PlayerMovedEvent} PlayerMovedEvent
 */

/**
 * @param {Array<{ table: ManagedTable, game: Game, activePlayers: number }>} activeTables
 * @returns {boolean}
 */
function areAllTablesReadyForRebalance(activeTables) {
  return activeTables.every((entry) => isTableReadyForRebalance(entry.game));
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
    isTableReadyForRebalance(entry.game),
  );
}

/**
 * @param {Array<{ table: ManagedTable, game: Game, activePlayers: number }>} destinationTables
 * @returns {{ table: ManagedTable, game: Game, activePlayers: number } | undefined}
 */
function getReadyDestinationTable(destinationTables) {
  return sortBySmallestTable(
    destinationTables
      .map((entry) => ({
        ...entry,
        activePlayers: countActivePlayers(entry.game),
      }))
      .filter((entry) => isTableReadyForRebalance(entry.game)),
  )[0];
}

/**
 * @param {ManagedTournament} tournament
 * @param {{ table: ManagedTable, game: Game, activePlayers: number }} breakCandidate
 * @param {Array<{ table: ManagedTable, game: Game, activePlayers: number }>} destinationTables
 * @param {Set<string>} changedTables
 * @param {PlayerMovedEvent[]} playerMoves
 * @returns {boolean}
 */
function collapseTableIntoDestinations(
  tournament,
  breakCandidate,
  destinationTables,
  changedTables,
  playerMoves,
) {
  const activeSeats = getActiveSeatIndexes(
    tournament,
    breakCandidate.game,
  ).sort((a, b) => b - a);

  for (const seatIndex of activeSeats) {
    const destination = getReadyDestinationTable(destinationTables);
    if (!destination) {
      return false;
    }

    playerMoves.push(
      movePlayer(tournament, breakCandidate.game, seatIndex, destination.game),
    );
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
 * @param {(activeTables: Array<{ table: ManagedTable, game: Game, activePlayers: number }>, changedTables: Set<string>, playerMoves: PlayerMovedEvent[]) => void} mergeIntoFinalTable
 * @param {PlayerMovedEvent[]} playerMoves
 */
export function collapseExtraTables(
  tournament,
  games,
  changedTables,
  now,
  mergeIntoFinalTable,
  playerMoves,
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
      if (!areAllTablesReadyForRebalance(activeTables)) {
        markPendingCollapse(tournament, activeTables, changedTables);
        return;
      }

      mergeIntoFinalTable(activeTables, changedTables, playerMoves);
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
        playerMoves,
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
 * @param {PlayerMovedEvent[]} playerMoves
 */
export function balanceWaitingTables(
  tournament,
  games,
  changedTables,
  playerMoves,
) {
  for (;;) {
    const readyTables = getActiveTables(tournament, games).filter((entry) =>
      isTableReadyForRebalance(entry.game),
    );
    if (readyTables.length < 2) {
      return;
    }

    const fullest = sortByLargestTable(readyTables)[0];
    const emptiest = sortBySmallestTable(readyTables)[0];
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

    playerMoves.push(
      movePlayer(tournament, fullest.game, sourceSeatIndex, emptiest.game),
    );
    changedTables.add(fullest.game.id);
    changedTables.add(emptiest.game.id);
  }
}

/**
 * @param {ManagedTournament} tournament
 * @param {Map<string, Game>} games
 * @param {() => string} now
 * @param {(activeTables: Array<{ table: ManagedTable, game: Game, activePlayers: number }>, changedTables: Set<string>, playerMoves: PlayerMovedEvent[]) => void} mergeIntoFinalTable
 * @param {PlayerMovedEvent[]} playerMoves
 * @returns {Set<string>}
 */
export function rebalanceTournament(
  tournament,
  games,
  now,
  mergeIntoFinalTable,
  playerMoves,
) {
  /** @type {Set<string>} */
  const changedTables = new Set();

  collapseExtraTables(
    tournament,
    games,
    changedTables,
    now,
    mergeIntoFinalTable,
    playerMoves,
  );
  balanceWaitingTables(tournament, games, changedTables, playerMoves);

  return changedTables;
}
