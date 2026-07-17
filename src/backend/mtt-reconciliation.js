import {
  isTableReadyForRebalance,
  countActivePlayers,
  clearTableWinner,
  resetClosedTable,
  applyTournamentStateToTable,
  getOpenTables,
} from "./mtt-table-state.js";
import {
  findAvailableSeat,
  getActiveSeatIndexes,
  getRemainingEntrants,
  getWaitingEntrants,
  movePlayer,
  seatEntrantAtTable,
} from "./mtt-seating.js";

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
function markPendingRebalance(tournament, activeTables, changedTables) {
  tournament.pendingRebalance = true;
  for (const entry of activeTables) {
    if (isTableReadyForRebalance(entry.game)) {
      changedTables.add(entry.game.id);
    }
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
 * @param {ManagedTournament} tournament
 * @param {Array<{ table: ManagedTable, game: Game, activePlayers: number }>} destinationTables
 * @returns {{ table: ManagedTable, game: Game, activePlayers: number } | undefined}
 */
function getReadyDestinationTable(tournament, destinationTables) {
  return sortBySmallestTable(
    destinationTables
      .map((entry) => ({
        ...entry,
        activePlayers: countActivePlayers(entry.game),
      }))
      .filter(
        (entry) =>
          isTableReadyForRebalance(entry.game) &&
          findAvailableSeat(entry.game, tournament) !== -1,
      ),
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
    const destination = getReadyDestinationTable(tournament, destinationTables);
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
 * @param {(populatedTables: Array<{ table: ManagedTable, game: Game, activePlayers: number }>, openTables: Array<{ table: ManagedTable, game: Game, activePlayers: number }>, changedTables: Set<string>, playerMoves: PlayerMovedEvent[]) => void} mergeIntoFinalTable
 * @param {PlayerMovedEvent[]} playerMoves
 * @param {number} targetTableCount
 */
export function collapseExtraTables(
  tournament,
  games,
  changedTables,
  now,
  mergeIntoFinalTable,
  playerMoves,
  targetTableCount,
) {
  for (;;) {
    const activeTables = getOpenTables(tournament, games);

    if (activeTables.length <= targetTableCount) {
      return;
    }

    if (targetTableCount === 1) {
      if (!areAllTablesReadyForRebalance(activeTables)) {
        markPendingRebalance(tournament, activeTables, changedTables);
        return;
      }

      mergeIntoFinalTable(
        activeTables.filter((entry) => entry.activePlayers > 0),
        activeTables,
        changedTables,
        playerMoves,
      );
      return;
    }

    const breakCandidate = getBreakCandidate(activeTables);
    if (!breakCandidate) {
      markPendingRebalance(tournament, activeTables, changedTables);
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
      markPendingRebalance(tournament, activeTables, changedTables);
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
    const readyTables = getOpenTables(tournament, games).filter((entry) =>
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
 * @param {Set<string>} changedTables
 * @param {PlayerMovedEvent[]} playerMoves
 */
function seatWaitingEntrants(tournament, games, changedTables, playerMoves) {
  for (const entrant of getWaitingEntrants(tournament)) {
    const destination = sortBySmallestTable(
      getOpenTables(tournament, games).filter(
        (entry) =>
          isTableReadyForRebalance(entry.game) &&
          findAvailableSeat(entry.game, tournament) !== -1,
      ),
    )[0];
    if (!destination) return;

    const seatIndex = findAvailableSeat(destination.game, tournament);
    seatEntrantAtTable(tournament, destination.game, entrant, seatIndex);
    changedTables.add(destination.game.id);
    playerMoves.push({
      playerId: entrant.playerId,
      tournamentId: tournament.id,
      tableId: destination.game.id,
      tableName: /** @type {string} */ (destination.game.tableName),
    });
  }
}

/**
 * @param {ManagedTournament} tournament
 * @param {Map<string, Game>} games
 * @param {number} targetTableCount
 * @returns {boolean}
 */
function isReconciliationComplete(tournament, games, targetTableCount) {
  if (getWaitingEntrants(tournament).length > 0) return false;

  const openTables = getOpenTables(tournament, games);
  if (openTables.length !== targetTableCount) return false;

  const populations = openTables.map((entry) => entry.activePlayers);
  return Math.max(...populations) - Math.min(...populations) <= 1;
}

/**
 * @param {ManagedTournament} tournament
 * @param {Map<string, Game>} games
 * @param {() => string} now
 * @param {{
 *   createRegularTable: () => { table: ManagedTable, game: Game },
 *   renameFinalTable: (entry: { table: ManagedTable, game: Game, activePlayers: number }) => void,
 *   mergeIntoFinalTable: (populatedTables: Array<{ table: ManagedTable, game: Game, activePlayers: number }>, openTables: Array<{ table: ManagedTable, game: Game, activePlayers: number }>, changedTables: Set<string>, playerMoves: PlayerMovedEvent[]) => void,
 * }} operations
 * @param {PlayerMovedEvent[]} playerMoves
 * @returns {Set<string>}
 */
export function rebalanceTournament(
  tournament,
  games,
  now,
  operations,
  playerMoves,
) {
  /** @type {Set<string>} */
  const changedTables = new Set();
  const targetTableCount = Math.max(
    1,
    Math.ceil(
      getRemainingEntrants(tournament, games).length / tournament.tableSize,
    ),
  );
  let openTables = getOpenTables(tournament, games);

  const onlyOpenTable = openTables.length === 1 ? openTables[0] : undefined;
  if (
    onlyOpenTable?.table.tableName === "Final Table" &&
    targetTableCount > 1
  ) {
    operations.renameFinalTable(onlyOpenTable);
    changedTables.add(onlyOpenTable.game.id);
  }

  while (openTables.length < targetTableCount) {
    const { game } = operations.createRegularTable();
    changedTables.add(game.id);
    openTables = getOpenTables(tournament, games);
  }

  seatWaitingEntrants(tournament, games, changedTables, playerMoves);

  collapseExtraTables(
    tournament,
    games,
    changedTables,
    now,
    operations.mergeIntoFinalTable,
    playerMoves,
    targetTableCount,
  );
  balanceWaitingTables(tournament, games, changedTables, playerMoves);

  const wasPending = tournament.pendingRebalance;
  if (isReconciliationComplete(tournament, games, targetTableCount)) {
    tournament.pendingRebalance = false;
    if (wasPending) {
      for (const entry of getOpenTables(tournament, games)) {
        changedTables.add(entry.game.id);
      }
    }
  } else {
    markPendingRebalance(
      tournament,
      getOpenTables(tournament, games),
      changedTables,
    );
  }

  return changedTables;
}
