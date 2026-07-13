import * as Tournament from "../shared/tournament.js";
import { calculatePrizePool } from "./mtt-rebuy-policy.js";
import {
  countActivePlayers,
  isTableReadyForNextHand,
  getTimeToNextLevel,
} from "./mtt-table-state.js";

/**
 * @typedef {import('./poker/game.js').Game} Game
 * @typedef {import('./mtt.js').ManagedTournament} ManagedTournament
 * @typedef {import('./mtt.js').TournamentEntrant} TournamentEntrant
 * @typedef {import('./mtt.js').ManagedTournamentView} ManagedTournamentView
 * @typedef {import('./mtt.js').ManagedTournamentViewEntrant} ManagedTournamentViewEntrant
 * @typedef {import('./mtt.js').ManagedTournamentViewTable} ManagedTournamentViewTable
 */

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
 * @param {number} prizePool
 * @returns {ManagedTournamentViewEntrant[]}
 */
function buildStandings(tournament, prizePool) {
  const standings = buildEntrants(tournament).sort((a, b) => {
    const bucketCompare = getStandingBucket(a) - getStandingBucket(b);
    if (bucketCompare !== 0) return bucketCompare;

    if (
      a.finishPosition !== undefined &&
      b.finishPosition !== undefined &&
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
    const prizes = Tournament.calculatePrizesFromPool(playerCount, prizePool);
    const prizeByPosition = new Map(prizes.map((p) => [p.position, p.amount]));

    for (let i = 0; i < standings.length; i++) {
      const entry = /** @type {ManagedTournamentViewEntrant} */ (standings[i]);
      if (entry.status === "registered") continue;
      const position = entry.finishPosition ?? i + 1;
      const prize = prizeByPosition.get(position) ?? 0;
      const rebuysUsed =
        tournament.entrants.get(entry.playerId)?.rebuysUsed ?? 0;
      entry.netWinnings = prize - tournament.buyIn * (1 + rebuysUsed);
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
      handNumber: game?.handNumber ?? table.handNumber ?? 0,
      waiting: game ? isTableReadyForNextHand(game) : true,
      closed: table.closedAt !== undefined,
    };
  });
}

/**
 * @param {ManagedTournament} tournament
 * @param {TournamentEntrant|void} entrant
 * @param {string} playerId
 * @returns {ManagedTournamentView["currentPlayer"]}
 */
function buildCurrentPlayerView(tournament, entrant, playerId) {
  return {
    isOwner: tournament.ownerId === playerId,
    status: entrant?.status ?? "not_registered",
    tableId: entrant?.tableId,
    seatIndex: entrant?.seatIndex,
    finishPosition: entrant?.finishPosition,
  };
}

/**
 * @param {ManagedTournament} tournament
 * @param {TournamentEntrant|void} entrant
 * @param {string} playerId
 * @returns {ManagedTournamentView["actions"]}
 */
function buildTournamentActions(tournament, entrant, playerId) {
  return {
    canRegister: tournament.status === "registration" && entrant === undefined,
    canUnregister:
      tournament.status === "registration" && entrant?.status === "registered",
    canStart:
      tournament.status === "registration" &&
      tournament.ownerId === playerId &&
      tournament.entrants.size >= 2,
    canRename: tournament.ownerId === playerId,
  };
}

/**
 * @param {ManagedTournament} tournament
 * @param {Map<string, Game>} games
 * @param {string} playerId
 * @returns {ManagedTournamentView}
 */
export function buildTournamentView(tournament, games, playerId) {
  const entrant = tournament.entrants.get(playerId);
  const entrants = buildEntrants(tournament);
  const prizePool = calculatePrizePool(tournament);
  const standings = buildStandings(tournament, prizePool);
  const tables = buildTables(tournament, games);
  return {
    id: tournament.id,
    name: tournament.name,
    status: tournament.status,
    ownerId: tournament.ownerId,
    owner: {
      id: tournament.ownerId,
      name: tournament.ownerName,
    },
    buyIn: tournament.buyIn,
    prizePool,
    maxRebuys: tournament.maxRebuys,
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
