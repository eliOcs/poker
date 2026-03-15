/* eslint-disable max-lines */
import * as Id from "./id.js";
import * as PokerGame from "./poker/game.js";
import * as Seat from "./poker/seat.js";
import * as Tournament from "../shared/tournament.js";
import { TIMER_INTERVAL } from "./poker/game-constants.js";
import { tickClock } from "./poker/tournament-clock.js";

/**
 * @typedef {import('./user.js').User} User
 * @typedef {import('./poker/game.js').Game} Game
 * @typedef {"registration"|"running"|"finished"} TournamentStatus
 * @typedef {"registered"|"seated"|"eliminated"|"winner"} EntrantStatus
 *
 * @typedef {object} TournamentEntrant
 * @property {string} playerId
 * @property {string} name
 * @property {EntrantStatus} status
 * @property {number} stack
 * @property {string|null} tableId
 * @property {number|null} seatIndex
 * @property {number|null} finishPosition
 * @property {number} handsPlayed
 * @property {number} registrationOrder
 * @property {string} registeredAt
 * @property {string|null} eliminatedAt
 *
 * @typedef {object} ManagedTable
 * @property {string} tableId
 * @property {string} tableName
 * @property {number} createdOrder
 * @property {string} createdAt
 * @property {string|null} closedAt
 *
 * @typedef {object} ManagedTournament
 * @property {string} id
 * @property {TournamentStatus} status
 * @property {string} ownerId
 * @property {number} buyIn
 * @property {number} tableSize
 * @property {number} initialStack
 * @property {number} level
 * @property {number} levelTicks
 * @property {boolean} onBreak
 * @property {boolean} pendingBreak
 * @property {number} breakTicks
 * @property {string} createdAt
 * @property {string|null} startedAt
 * @property {string|null} endedAt
 * @property {Map<string, TournamentEntrant>} entrants
 * @property {ManagedTable[]} tables
 * @property {number} nextRegistrationOrder
 * @property {NodeJS.Timeout|null} tickTimer
 */

/**
 * @typedef {object} ManagedTournamentViewTable
 * @property {string} tableId
 * @property {string} tableName
 * @property {number} playerCount
 * @property {number} handNumber
 * @property {boolean} waiting
 * @property {boolean} closed
 *
 * @typedef {object} ManagedTournamentViewEntrant
 * @property {string} playerId
 * @property {string} name
 * @property {EntrantStatus} status
 * @property {number} stack
 * @property {string|null} tableId
 * @property {number|null} seatIndex
 * @property {number|null} finishPosition
 * @property {number|null} netWinnings
 *
 * @typedef {object} ManagedTournamentView
 * @property {string} id
 * @property {TournamentStatus} status
 * @property {string} ownerId
 * @property {number} buyIn
 * @property {number} tableSize
 * @property {number} level
 * @property {number} timeToNextLevel
 * @property {boolean} onBreak
 * @property {boolean} pendingBreak
 * @property {string} createdAt
 * @property {string|null} startedAt
 * @property {string|null} endedAt
 * @property {ManagedTournamentViewEntrant[]} entrants
 * @property {ManagedTournamentViewEntrant[]} standings
 * @property {ManagedTournamentViewTable[]} tables
 * @property {{ isOwner: boolean, status: EntrantStatus|"not_registered", tableId: string|null, seatIndex: number|null }} currentPlayer
 * @property {{ canRegister: boolean, canUnregister: boolean, canStart: boolean }} actions
 */

/**
 * @param {ManagedTournament} tournament
 * @param {Game} game
 */
function applyTournamentStateToTable(tournament, game) {
  if (!game.tournament) return;

  const blinds = Tournament.getBlindsForLevel(tournament.level);
  game.blinds = {
    ante: blinds.ante,
    small: blinds.small,
    big: blinds.big,
  };
  game.tournament.level = tournament.level;
  game.tournament.levelTicks = tournament.levelTicks;
  game.tournament.onBreak = tournament.onBreak;
  game.tournament.pendingBreak = tournament.pendingBreak;
  game.tournament.breakTicks = tournament.breakTicks;
  game.tournament.startTime = tournament.startedAt;
  game.tournament.buyIn = tournament.buyIn;
  game.tournament.initialStack = tournament.initialStack;
  game.tournament.competitionId = tournament.id;
  game.tournament.redirects = game.tournament.redirects || {};
}

/**
 * @param {Game} game
 * @returns {boolean}
 */
function isTableWaiting(game) {
  return (
    game.hand.phase === "waiting" &&
    game.collectingBets === null &&
    game.runout?.active !== true &&
    game.pendingHandHistory === null
  );
}

/**
 * @param {Game} game
 * @returns {number}
 */
function countActivePlayers(game) {
  return game.seats.filter((seat) => !seat.empty && seat.stack > 0).length;
}

/**
 * @param {ManagedTournament} tournament
 * @returns {number}
 */
function countActiveEntrants(tournament) {
  let count = 0;
  for (const entrant of tournament.entrants.values()) {
    if (entrant.status === "seated" || entrant.status === "winner") {
      count += 1;
    }
  }
  return count;
}

/**
 * @param {ManagedTournament} tournament
 * @param {string|null} tableId
 * @returns {number}
 */
function getTableCreatedOrder(tournament, tableId) {
  if (!tableId) return Number.MAX_SAFE_INTEGER;
  const table = tournament.tables.find((entry) => entry.tableId === tableId);
  return table?.createdOrder ?? Number.MAX_SAFE_INTEGER;
}

/**
 * @param {Map<string, Game>} games
 * @param {TournamentEntrant} entrant
 * @returns {{ game: Game, seat: import("./poker/seat.js").OccupiedSeat } | null}
 */
function getEntrantSeatContext(games, entrant) {
  if (entrant.tableId === null || entrant.seatIndex === null) {
    return null;
  }
  const game = games.get(entrant.tableId);
  if (!game) {
    return null;
  }
  const seat = game.seats[entrant.seatIndex];
  if (!seat || seat.empty) {
    return null;
  }
  return {
    game,
    seat: /** @type {import("./poker/seat.js").OccupiedSeat} */ (seat),
  };
}

/**
 * @param {ManagedTournament} tournament
 * @param {Map<string, Game>} games
 * @returns {TournamentEntrant[]}
 */
function getContendingEntrants(tournament, games) {
  return [...tournament.entrants.values()].filter((entrant) => {
    if (entrant.status !== "seated") {
      return false;
    }
    const seatContext = getEntrantSeatContext(games, entrant);
    return (
      seatContext !== null &&
      seatContext.seat.stack > 0 &&
      !seatContext.seat.sittingOut
    );
  });
}

/**
 * @param {ManagedTournament} tournament
 * @param {TournamentEntrant} a
 * @param {TournamentEntrant} b
 * @returns {number}
 */
function compareForcedFinishEntrants(tournament, a, b) {
  if (a.stack !== b.stack) {
    return b.stack - a.stack;
  }
  const tableOrderCompare =
    getTableCreatedOrder(tournament, a.tableId) -
    getTableCreatedOrder(tournament, b.tableId);
  if (tableOrderCompare !== 0) {
    return tableOrderCompare;
  }
  if (
    a.seatIndex !== null &&
    b.seatIndex !== null &&
    a.seatIndex !== b.seatIndex
  ) {
    return a.seatIndex - b.seatIndex;
  }
  return a.playerId.localeCompare(b.playerId);
}

/**
 * @param {ManagedTournament} tournament
 * @returns {number}
 */
function getTimeToNextLevel(tournament) {
  if (tournament.onBreak) {
    return Tournament.BREAK_DURATION_TICKS - tournament.breakTicks;
  }
  return Tournament.LEVEL_DURATION_TICKS - tournament.levelTicks;
}

/**
 * @param {ManagedTournament} tournament
 * @returns {ManagedTournamentViewEntrant[]}
 */
function buildEntrants(tournament) {
  return [...tournament.entrants.values()]
    .sort((a, b) => a.registrationOrder - b.registrationOrder)
    .map((entrant) => ({
      playerId: entrant.playerId,
      name: entrant.name,
      status: entrant.status,
      stack: entrant.stack,
      tableId: entrant.tableId,
      seatIndex: entrant.seatIndex,
      finishPosition: entrant.finishPosition,
      netWinnings: null,
    }));
}

/**
 * @param {ManagedTournamentViewEntrant} entrant
 * @returns {number}
 */
function getStandingBucket(entrant) {
  if (entrant.status === "winner") return 0;
  if (entrant.status === "seated") return 1;
  if (entrant.status === "registered") return 2;
  return 3;
}

/**
 * @param {ManagedTournament} tournament
 * @returns {ManagedTournamentViewEntrant[]}
 */
function buildStandings(tournament) {
  const standings = buildEntrants(tournament).sort((a, b) => {
    const bucketCompare = getStandingBucket(a) - getStandingBucket(b);
    if (bucketCompare !== 0) return bucketCompare;

    if (
      a.finishPosition !== null &&
      b.finishPosition !== null &&
      a.finishPosition !== b.finishPosition
    ) {
      return a.finishPosition - b.finishPosition;
    }

    if (a.stack !== b.stack) {
      return b.stack - a.stack;
    }

    return a.playerId.localeCompare(b.playerId);
  });

  if (tournament.status !== "registration") {
    const playerCount = tournament.entrants.size;
    const prizes = Tournament.calculatePrizes(playerCount, tournament.buyIn);
    const prizeByPosition = new Map(prizes.map((p) => [p.position, p.amount]));

    for (let i = 0; i < standings.length; i++) {
      const entry = /** @type {ManagedTournamentViewEntrant} */ (standings[i]);
      if (entry.status === "registered") continue;
      const position = entry.finishPosition ?? i + 1;
      const prize = prizeByPosition.get(position) ?? 0;
      entry.netWinnings = prize - tournament.buyIn;
    }
  }

  return standings;
}

/**
 * @param {ManagedTournament} tournament
 * @param {Map<string, Game>} games
 * @returns {ManagedTournamentViewTable[]}
 */
function buildTables(tournament, games) {
  return tournament.tables.map((table) => {
    const game = games.get(table.tableId);
    return {
      tableId: table.tableId,
      tableName: table.tableName,
      playerCount: game ? countActivePlayers(game) : 0,
      handNumber: game?.handNumber ?? 0,
      waiting: game ? isTableWaiting(game) : true,
      closed: table.closedAt !== null,
    };
  });
}

/**
 * @param {ManagedTournament} tournament
 * @param {TournamentEntrant|null} entrant
 * @param {string} playerId
 * @returns {ManagedTournamentView["currentPlayer"]}
 */
function buildCurrentPlayerView(tournament, entrant, playerId) {
  return {
    isOwner: tournament.ownerId === playerId,
    status: entrant?.status || "not_registered",
    tableId: entrant?.tableId ?? null,
    seatIndex: entrant?.seatIndex ?? null,
  };
}

/**
 * @param {ManagedTournament} tournament
 * @param {TournamentEntrant|null} entrant
 * @param {string} playerId
 * @returns {ManagedTournamentView["actions"]}
 */
function buildTournamentActions(tournament, entrant, playerId) {
  return {
    canRegister: tournament.status === "registration" && entrant === null,
    canUnregister:
      tournament.status === "registration" && entrant?.status === "registered",
    canStart:
      tournament.status === "registration" &&
      tournament.ownerId === playerId &&
      tournament.entrants.size >= 2,
  };
}

/**
 * @param {ManagedTournament} tournament
 * @param {Map<string, Game>} games
 * @param {string} playerId
 * @returns {ManagedTournamentView}
 */
function buildTournamentView(tournament, games, playerId) {
  const entrant = tournament.entrants.get(playerId) || null;
  const entrants = buildEntrants(tournament);
  const standings = buildStandings(tournament);
  const tables = buildTables(tournament, games);
  return {
    id: tournament.id,
    status: tournament.status,
    ownerId: tournament.ownerId,
    buyIn: tournament.buyIn,
    tableSize: tournament.tableSize,
    level: tournament.level,
    timeToNextLevel: getTimeToNextLevel(tournament),
    onBreak: tournament.onBreak,
    pendingBreak: tournament.pendingBreak,
    createdAt: tournament.createdAt,
    startedAt: tournament.startedAt,
    endedAt: tournament.endedAt,
    entrants,
    standings,
    tables,
    currentPlayer: buildCurrentPlayerView(tournament, entrant, playerId),
    actions: buildTournamentActions(tournament, entrant, playerId),
  };
}

/**
 * @param {Game} game
 * @param {ManagedTournament} tournament
 * @returns {number}
 */
function findAvailableSeat(game, tournament) {
  for (let i = 0; i < game.seats.length; i += 1) {
    const seat = game.seats[i];
    if (!seat) continue;
    if (seat.empty) {
      return i;
    }

    const occupiedSeat = /** @type {import("./poker/seat.js").OccupiedSeat} */ (
      seat
    );
    const entrant = tournament.entrants.get(occupiedSeat.player.id);
    if (occupiedSeat.stack === 0 && entrant?.status === "eliminated") {
      return i;
    }
  }
  return -1;
}

/**
 * @param {ManagedTournament} tournament
 * @param {Game} game
 * @param {TournamentEntrant} entrant
 * @param {number} seatIndex
 */
function seatEntrantAtTable(tournament, game, entrant, seatIndex) {
  const seatedPlayer = Seat.occupied(
    { id: entrant.playerId, name: entrant.name },
    entrant.stack,
    false,
  );
  seatedPlayer.totalBuyIn = tournament.initialStack;
  seatedPlayer.handsPlayed = entrant.handsPlayed;
  seatedPlayer.disconnected = false;
  game.seats[seatIndex] = seatedPlayer;
  entrant.status = "seated";
  entrant.tableId = game.id;
  entrant.seatIndex = seatIndex;
}

/**
 * @param {ManagedTournament} tournament
 * @param {Game} game
 * @returns {number[]}
 */
function getActiveSeatIndexes(tournament, game) {
  /** @type {number[]} */
  const activeSeatIndexes = [];
  for (let i = 0; i < game.seats.length; i += 1) {
    const seat = game.seats[i];
    if (!seat || seat.empty) continue;
    const occupiedSeat = /** @type {import("./poker/seat.js").OccupiedSeat} */ (
      seat
    );
    if (occupiedSeat.stack <= 0) continue;
    const entrant = tournament.entrants.get(occupiedSeat.player.id);
    if (entrant?.status === "seated" || entrant?.status === "winner") {
      activeSeatIndexes.push(i);
    }
  }
  return activeSeatIndexes;
}

/**
 * @param {Game} game
 * @returns {void}
 */
function clearTableWinner(game) {
  if (game.tournament) {
    game.tournament.winner = null;
  }
}

/**
 * Collapsed tables stay in memory for history/profile links, but they should no
 * longer run hand state or countdown logic after all players are reseated away.
 * @param {Game} game
 */
function resetClosedTable(game) {
  PokerGame.stopGameTick(game);
  game.countdown = null;
  game.board.cards = [];
  game.hand = PokerGame.createHand();
  game.collectingBets = null;
  game.runout = null;
  game.pendingHandHistory = null;
  game.winnerMessage = null;
  game.actingTicks = 0;
  game.clockTicks = 0;
  for (let i = 0; i < game.seats.length; i += 1) {
    game.seats[i] = Seat.empty();
  }
}

/**
 * @param {ManagedTournament} tournament
 * @param {Game} sourceGame
 * @param {number} sourceSeatIndex
 * @param {Game} destinationGame
 */
function movePlayer(tournament, sourceGame, sourceSeatIndex, destinationGame) {
  const sourceSeat = /** @type {import('./poker/seat.js').OccupiedSeat} */ (
    sourceGame.seats[sourceSeatIndex]
  );
  const destinationSeatIndex = findAvailableSeat(destinationGame, tournament);
  if (destinationSeatIndex === -1) {
    throw new Error("destination table has no available seat");
  }

  const entrant = tournament.entrants.get(sourceSeat.player.id);
  if (!entrant) {
    throw new Error("cannot move player without tournament entrant");
  }

  const movedSeat = Seat.occupied(
    { id: sourceSeat.player.id, name: sourceSeat.player.name },
    sourceSeat.stack,
    false,
  );
  movedSeat.totalBuyIn = sourceSeat.totalBuyIn;
  movedSeat.handsPlayed = sourceSeat.handsPlayed;
  movedSeat.disconnected = false;

  destinationGame.seats[destinationSeatIndex] = movedSeat;
  sourceGame.seats[sourceSeatIndex] = Seat.empty();
  if (sourceGame.tournament) {
    sourceGame.tournament.redirects = sourceGame.tournament.redirects || {};
    sourceGame.tournament.redirects[sourceSeat.player.id] = destinationGame.id;
  }

  entrant.tableId = destinationGame.id;
  entrant.seatIndex = destinationSeatIndex;
  entrant.stack = movedSeat.stack;
  entrant.status = "seated";
}

/**
 * @param {ManagedTournament} tournament
 * @param {Game} game
 * @param {(game: Game) => void} ensureTableTick
 */
function syncWaitingTableState(tournament, game, ensureTableTick) {
  applyTournamentStateToTable(tournament, game);

  if (!isTableWaiting(game)) {
    ensureTableTick(game);
    return;
  }

  if (tournament.onBreak) {
    game.countdown = null;
  } else if (countActivePlayers(game) >= 2 && game.countdown === null) {
    game.countdown = 5;
  } else if (countActivePlayers(game) < 2) {
    game.countdown = null;
  }

  ensureTableTick(game);
}

/**
 * @param {ManagedTournament} tournament
 * @param {Map<string, Game>} games
 * @returns {Array<{ table: ManagedTable, game: Game, activePlayers: number }>}
 */
function getActiveTables(tournament, games) {
  return tournament.tables
    .map((table) => ({ table, game: games.get(table.tableId) || null }))
    .filter((entry) => entry.game !== null)
    .map((entry) => ({
      table: entry.table,
      game: /** @type {Game} */ (entry.game),
      activePlayers: countActivePlayers(/** @type {Game} */ (entry.game)),
    }))
    .filter(
      (entry) => entry.activePlayers > 0 && entry.table.closedAt === null,
    );
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
 * @param {Map<string, Game>} games
 * @param {Set<string>} changedTables
 * @param {() => string} now
 */
function collapseExtraTables(tournament, games, changedTables, now) {
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
      return;
    }

    const breakCandidate = sortBySmallestTable(activeTables).find((entry) =>
      isTableWaiting(entry.game),
    );
    if (!breakCandidate) {
      break;
    }

    const destinationTables = sortBySmallestTable(
      activeTables.filter(
        (entry) => entry.table.tableId !== breakCandidate.table.tableId,
      ),
    );
    const activeSeats = getActiveSeatIndexes(
      tournament,
      breakCandidate.game,
    ).sort((a, b) => b - a);

    for (const seatIndex of activeSeats) {
      const destination = sortBySmallestTable(
        destinationTables
          .map((entry) => ({
            ...entry,
            activePlayers: countActivePlayers(entry.game),
          }))
          .filter((entry) => isTableWaiting(entry.game)),
      )[0];
      if (!destination) {
        return;
      }
      movePlayer(tournament, breakCandidate.game, seatIndex, destination.game);
      changedTables.add(breakCandidate.game.id);
      changedTables.add(destination.game.id);
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
function balanceWaitingTables(tournament, games, changedTables) {
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
 * @returns {Set<string>}
 */
function rebalanceTournament(tournament, games, ensureTableTick, now) {
  /** @type {Set<string>} */
  const changedTables = new Set();

  collapseExtraTables(tournament, games, changedTables, now);
  balanceWaitingTables(tournament, games, changedTables);

  for (const tableId of changedTables) {
    const game = games.get(tableId);
    if (game) {
      syncWaitingTableState(tournament, game, ensureTableTick);
    }
  }

  return changedTables;
}

/**
 * @param {ManagedTournament} tournament
 * @param {Map<string, Game>} games
 * @param {(game: Game) => void} ensureTableTick
 * @param {() => string} now
 * @param {TournamentEntrant | null} [winnerEntrant]
 */
function finishTournament(
  tournament,
  games,
  ensureTableTick,
  now,
  winnerEntrant = null,
) {
  const activeEntrants = [...tournament.entrants.values()].filter(
    (entrant) => entrant.status === "seated",
  );
  const resolvedWinner = winnerEntrant ?? activeEntrants[0];
  if (!resolvedWinner) return;

  const forcedEliminations = activeEntrants
    .filter((entrant) => entrant.playerId !== resolvedWinner.playerId)
    .sort((a, b) => compareForcedFinishEntrants(tournament, a, b));

  forcedEliminations.forEach((entrant, index) => {
    const finishPosition = index + 2;
    const seatContext = getEntrantSeatContext(games, entrant);
    if (seatContext) {
      seatContext.seat.bustedPosition = finishPosition;
      seatContext.seat.stack = 0;
      seatContext.seat.bet = 0;
      seatContext.seat.sittingOut = true;
    }
    entrant.status = "eliminated";
    entrant.stack = 0;
    entrant.tableId = null;
    entrant.seatIndex = null;
    entrant.finishPosition = finishPosition;
    entrant.eliminatedAt = now();
  });

  const winnerSeatContext = getEntrantSeatContext(games, resolvedWinner);
  if (!winnerSeatContext) return;

  const winnerEndedAt = now();
  resolvedWinner.status = "winner";
  resolvedWinner.finishPosition = 1;
  resolvedWinner.tableId = winnerSeatContext.game.id;
  tournament.status = "finished";
  tournament.endedAt = winnerEndedAt;

  for (const table of tournament.tables) {
    table.closedAt = tournament.endedAt;
    const game = games.get(table.tableId);
    if (!game) continue;
    clearTableWinner(game);
    applyTournamentStateToTable(tournament, game);
    if (
      game.tournament &&
      resolvedWinner.tableId === table.tableId &&
      resolvedWinner.seatIndex !== null
    ) {
      game.tournament.winner = resolvedWinner.seatIndex;
    }
    game.countdown = null;
    ensureTableTick(game);
  }
}

/**
 * @param {ManagedTournament} tournament
 * @param {Map<string, Game>} games
 * @returns {boolean}
 */
function canStartPendingBreak(tournament, games) {
  if (!tournament.pendingBreak) return false;
  return getActiveTables(tournament, games).every((entry) =>
    isTableWaiting(entry.game),
  );
}

/**
 * @param {{
 *   games: Map<string, Game>,
 *   broadcastTableState?: (tableId: string) => void,
 *   broadcastTournamentState?: (tournamentId: string) => void,
 *   ensureTableTick?: (game: Game) => void,
 *   now?: () => string,
 *   setIntervalFn?: typeof setInterval,
 *   clearIntervalFn?: typeof clearInterval,
 * }} params
 */
export function createMttManager({
  games,
  broadcastTableState = () => {},
  broadcastTournamentState = () => {},
  ensureTableTick = () => {},
  now = () => new Date().toISOString(),
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
}) {
  /** @type {Map<string, ManagedTournament>} */
  const tournaments = new Map();

  /**
   * @param {string} tournamentId
   * @returns {ManagedTournament}
   */
  function requireTournament(tournamentId) {
    const tournament = tournaments.get(tournamentId);
    if (!tournament) {
      throw new Error("tournament not found");
    }
    return tournament;
  }

  /**
   * @param {ManagedTournament} tournament
   */
  function broadcastTournament(tournament) {
    broadcastTournamentState(tournament.id);
  }

  /**
   * @param {ManagedTournament} tournament
   * @param {Iterable<string>} tableIds
   */
  function broadcastTables(tournament, tableIds) {
    for (const tableId of tableIds) {
      broadcastTableState(tableId);
    }
    broadcastTournament(tournament);
  }

  /**
   * @param {ManagedTournament} tournament
   */
  function stopTicking(tournament) {
    if (tournament.tickTimer) {
      clearIntervalFn(tournament.tickTimer);
      tournament.tickTimer = null;
    }
  }

  /**
   * @param {ManagedTournament} tournament
   */
  function startTicking(tournament) {
    stopTicking(tournament);
    const tickTimer = setIntervalFn(() => {
      tickTournament(tournament.id);
    }, TIMER_INTERVAL);
    if ("unref" in tickTimer && typeof tickTimer.unref === "function") {
      tickTimer.unref();
    }
    tournament.tickTimer = /** @type {NodeJS.Timeout} */ (tickTimer);
  }

  /**
   * @param {ManagedTournament} tournament
   * @param {number} entrantCount
   * @returns {number[]}
   */
  function buildTableSizes(tournament, entrantCount) {
    const tableCount = Math.ceil(entrantCount / tournament.tableSize);
    const base = Math.floor(entrantCount / tableCount);
    const remainder = entrantCount % tableCount;
    /** @type {number[]} */
    const sizes = [];
    for (let i = 0; i < tableCount; i += 1) {
      sizes.push(base + (i < remainder ? 1 : 0));
    }
    return sizes;
  }

  /**
   * @param {ManagedTournament} tournament
   * @returns {string[]}
   */
  function startManagedTables(tournament) {
    const entrants = [...tournament.entrants.values()].sort(
      (a, b) => a.registrationOrder - b.registrationOrder,
    );
    const tableSizes = buildTableSizes(tournament, entrants.length);
    /** @type {string[]} */
    const createdTableIds = [];
    let entrantIndex = 0;

    tableSizes.forEach((tableSize, index) => {
      const tableName = `Table ${index + 1}`;
      const game = PokerGame.createMttTable({
        seats: tournament.tableSize,
        buyIn: tournament.buyIn,
        tournamentId: tournament.id,
        tableName,
        startTime: tournament.startedAt,
        level: tournament.level,
      });

      applyTournamentStateToTable(tournament, game);
      tournament.tables.push({
        tableId: game.id,
        tableName,
        createdOrder: index,
        createdAt: tournament.startedAt || now(),
        closedAt: null,
      });
      createdTableIds.push(game.id);
      games.set(game.id, game);

      for (let seatIndex = 0; seatIndex < tableSize; seatIndex += 1) {
        const entrant = entrants[entrantIndex];
        if (!entrant) break;
        entrant.stack = tournament.initialStack;
        seatEntrantAtTable(tournament, game, entrant, seatIndex);
        entrantIndex += 1;
      }

      syncWaitingTableState(tournament, game, ensureTableTick);
    });

    return createdTableIds;
  }

  /**
   * @param {string} tournamentId
   */
  function tickTournament(tournamentId) {
    const tournament = tournaments.get(tournamentId);
    if (!tournament || tournament.status !== "running") {
      return;
    }

    const canStartBreak = getActiveTables(tournament, games).every((entry) =>
      isTableWaiting(entry.game),
    );
    tickClock(tournament, canStartBreak);

    rebalanceTournament(tournament, games, ensureTableTick, now);

    for (const table of tournament.tables) {
      const game = games.get(table.tableId);
      if (!game) continue;
      if (table.closedAt !== null) {
        continue;
      }
      syncWaitingTableState(tournament, game, ensureTableTick);
      broadcastTableState(table.tableId);
    }
    broadcastTournament(tournament);
  }

  /**
   * @param {string} tournamentId
   * @param {User} user
   * @returns {ManagedTournamentView}
   */
  function registerPlayer(tournamentId, user) {
    const tournament = requireTournament(tournamentId);
    if (tournament.status !== "registration") {
      throw new Error("registration is closed");
    }
    if (tournament.entrants.has(user.id)) {
      throw new Error("player already registered");
    }

    tournament.entrants.set(user.id, {
      playerId: user.id,
      name: user.name || user.id,
      status: "registered",
      stack: tournament.initialStack,
      tableId: null,
      seatIndex: null,
      finishPosition: null,
      handsPlayed: 0,
      registrationOrder: tournament.nextRegistrationOrder,
      registeredAt: now(),
      eliminatedAt: null,
    });
    tournament.nextRegistrationOrder += 1;
    broadcastTournament(tournament);
    return buildTournamentView(tournament, games, user.id);
  }

  /**
   * @param {ManagedTournament} tournament
   * @param {Game} game
   * @returns {Array<{ seat: import("./poker/seat.js").OccupiedSeat, entrant: TournamentEntrant, seatIndex: number }>}
   */
  function getBustedEntrantsForTable(tournament, game) {
    /** @type {Array<{ seat: import("./poker/seat.js").OccupiedSeat, entrant: TournamentEntrant, seatIndex: number }>} */
    const bustedEntrants = [];

    for (let i = 0; i < game.seats.length; i += 1) {
      const seat = game.seats[i];
      if (!seat || seat.empty) continue;

      const occupiedSeat =
        /** @type {import("./poker/seat.js").OccupiedSeat} */ (seat);

      const entrant = tournament.entrants.get(occupiedSeat.player.id);
      if (!entrant) continue;
      entrant.name = occupiedSeat.player.name || entrant.name;
      entrant.handsPlayed = occupiedSeat.handsPlayed;

      if (occupiedSeat.stack > 0 && !occupiedSeat.sittingOut) {
        occupiedSeat.bustedPosition = null;
        entrant.status = "seated";
        entrant.stack = occupiedSeat.stack;
        entrant.tableId = game.id;
        entrant.seatIndex = i;
        continue;
      }

      if (entrant.status === "seated") {
        bustedEntrants.push({ seat: occupiedSeat, entrant, seatIndex: i });
      }
    }

    return bustedEntrants;
  }

  /**
   * @param {Array<{ seat: import("./poker/seat.js").OccupiedSeat, entrant: TournamentEntrant, seatIndex: number }>} bustedEntrants
   * @param {number} activeBefore
   */
  function markBustedEntrants(bustedEntrants, activeBefore) {
    bustedEntrants
      .sort((a, b) => a.seatIndex - b.seatIndex)
      .forEach(({ seat, entrant }, index) => {
        const finishPosition = activeBefore - index;
        seat.bustedPosition = finishPosition;
        seat.stack = 0;
        seat.bet = 0;
        seat.sittingOut = true;
        entrant.status = "eliminated";
        entrant.stack = 0;
        entrant.tableId = null;
        entrant.seatIndex = null;
        entrant.finishPosition = finishPosition;
        entrant.eliminatedAt = now();
      });
  }

  /**
   * @param {ManagedTournament} tournament
   * @param {Set<string>} changedTableIds
   */
  function syncChangedTables(tournament, changedTableIds) {
    for (const tableId of changedTableIds) {
      const changedGame = games.get(tableId);
      if (!changedGame) continue;
      clearTableWinner(changedGame);
      syncWaitingTableState(tournament, changedGame, ensureTableTick);
    }
  }

  /**
   * @param {ManagedTournament} tournament
   * @param {Set<string>} changedTableIds
   */
  function maybeStartPendingBreak(tournament, changedTableIds) {
    if (!canStartPendingBreak(tournament, games)) {
      return;
    }

    tournament.pendingBreak = false;
    tournament.onBreak = true;
    tournament.breakTicks = 0;
    for (const table of tournament.tables) {
      changedTableIds.add(table.tableId);
    }
  }

  return {
    /**
     * @param {{ owner: User, buyIn: number, tableSize: number }} options
     */
    createTournament({ owner, buyIn, tableSize }) {
      if (!Tournament.isValidBuyin(buyIn)) {
        throw new Error("invalid tournament buy-in");
      }

      const createdAt = now();
      /** @type {ManagedTournament} */
      const tournament = {
        id: Id.generate(),
        status: "registration",
        ownerId: owner.id,
        buyIn,
        tableSize,
        initialStack: Tournament.INITIAL_STACK,
        level: 1,
        levelTicks: 0,
        onBreak: false,
        pendingBreak: false,
        breakTicks: 0,
        createdAt,
        startedAt: null,
        endedAt: null,
        entrants: new Map(),
        tables: [],
        nextRegistrationOrder: 0,
        tickTimer: null,
      };

      tournaments.set(tournament.id, tournament);
      registerPlayer(tournament.id, owner);
      return tournament.id;
    },

    /**
     * @param {string} tournamentId
     * @returns {ManagedTournament|null}
     */
    getTournament(tournamentId) {
      return tournaments.get(tournamentId) || null;
    },

    registerPlayer,

    /**
     * @param {string} tournamentId
     * @param {string} playerId
     * @param {string} actorId
     * @returns {ManagedTournamentView}
     */
    unregisterPlayer(tournamentId, playerId, actorId) {
      const tournament = requireTournament(tournamentId);
      if (tournament.status !== "registration") {
        throw new Error("registration is closed");
      }
      if (playerId !== actorId) {
        throw new Error("cannot unregister another player");
      }
      const entrant = tournament.entrants.get(playerId);
      if (!entrant || entrant.status !== "registered") {
        throw new Error("player is not registered");
      }

      tournament.entrants.delete(playerId);
      broadcastTournament(tournament);
      return buildTournamentView(tournament, games, actorId);
    },

    /**
     * @param {string} tournamentId
     * @param {string} actorId
     * @returns {ManagedTournamentView}
     */
    startTournament(tournamentId, actorId) {
      const tournament = requireTournament(tournamentId);
      if (tournament.ownerId !== actorId) {
        throw new Error("only the tournament owner can start");
      }
      if (tournament.status !== "registration") {
        throw new Error("tournament already started");
      }
      if (tournament.entrants.size < 2) {
        throw new Error("need at least 2 registered players");
      }

      tournament.status = "running";
      tournament.startedAt = now();
      const createdTableIds = startManagedTables(tournament);
      startTicking(tournament);
      broadcastTables(tournament, createdTableIds);
      return buildTournamentView(tournament, games, actorId);
    },

    /**
     * @param {string} tournamentId
     * @param {string} playerId
     * @returns {ManagedTournamentView}
     */
    getTournamentView(tournamentId, playerId) {
      const tournament = requireTournament(tournamentId);
      return buildTournamentView(tournament, games, playerId);
    },

    /**
     * @param {User} user
     */
    syncUser(user) {
      for (const tournament of tournaments.values()) {
        const entrant = tournament.entrants.get(user.id);
        if (!entrant) continue;
        entrant.name = user.name || user.id;
        if (entrant.tableId) {
          const game = games.get(entrant.tableId);
          const seat =
            game && entrant.seatIndex !== null
              ? game.seats[entrant.seatIndex]
              : null;
          if (game && seat && !seat.empty) {
            seat.player.name = entrant.name;
            broadcastTableState(game.id);
          }
        }
        broadcastTournament(tournament);
      }
    },

    /**
     * @param {Game} game
     */
    handleHandFinalized(game) {
      if (game.kind !== "mtt" || !game.tournamentId) {
        return;
      }

      const tournament = tournaments.get(game.tournamentId);
      if (!tournament || tournament.status !== "running") {
        return;
      }

      /** @type {Set<string>} */
      const changedTableIds = new Set([game.id]);
      const activeBefore = countActiveEntrants(tournament);
      const bustedEntrants = getBustedEntrantsForTable(tournament, game);

      markBustedEntrants(bustedEntrants, activeBefore);
      maybeStartPendingBreak(tournament, changedTableIds);

      const contenders = getContendingEntrants(tournament, games);
      if (contenders.length === 1) {
        finishTournament(
          tournament,
          games,
          ensureTableTick,
          now,
          contenders[0],
        );
        stopTicking(tournament);
        for (const table of tournament.tables) {
          changedTableIds.add(table.tableId);
        }
        broadcastTables(tournament, changedTableIds);
        return;
      }

      const balancedTables = rebalanceTournament(
        tournament,
        games,
        ensureTableTick,
        now,
      );
      for (const tableId of balancedTables) {
        changedTableIds.add(tableId);
      }

      syncChangedTables(tournament, changedTableIds);
      broadcastTables(tournament, changedTableIds);
    },

    /**
     * @param {string} tournamentId
     */
    tickTournament,

    close() {
      for (const tournament of tournaments.values()) {
        stopTicking(tournament);
      }
    },
  };
}
