import * as Tournament from "../shared/tournament.js";
import { calculatePrizePool } from "./mtt-rebuy-policy.js";
import { rankTournamentField } from "./poker/ranking.js";
import {
  countActivePlayers,
  isTableReadyForNextHand,
  getTimeToNextLevel,
} from "./mtt-table-state.js";
import { isEntryPeriodOpen } from "./mtt-entry-policy.js";

/**
 * @typedef {import('./poker/game.js').Game} Game
 * @typedef {import('./poker/types.js').Cents} Cents
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
      ...(entrant.avatarRevision
        ? { avatarRevision: entrant.avatarRevision }
        : {}),
      status: entrant.status,
      stack: entrant.stack,
      tableId: entrant.tableId,
      seatIndex: entrant.seatIndex,
      finishPosition: entrant.finishPosition,
    }));
}

/**
 * The field in standing order; once play starts, each entry carries the net
 * result its place would pay.
 * @param {ManagedTournament} tournament
 * @returns {ManagedTournamentViewEntrant[]}
 */
function buildStandings(tournament) {
  const entrants = buildEntrants(tournament);
  if (tournament.status === "registration") return entrants;

  const field = entrants.map((entrant) => ({
    entrant,
    stack: entrant.stack,
    entries:
      1 +
      /** @type {TournamentEntrant} */ (
        tournament.entrants.get(entrant.playerId)
      ).rebuysUsed,
    finishPosition: entrant.finishPosition,
  }));
  return rankTournamentField(field, tournament.buyIn).map(
    ({ entrant, netWinnings }) => ({ ...entrant, netWinnings }),
  );
}

/**
 * A started tournament's projected net result for one of its entrants.
 * @param {ManagedTournament} tournament
 * @param {string} playerId
 * @returns {Cents}
 */
export function getTournamentNetWinnings(tournament, playerId) {
  const netWinnings = buildStandings(tournament).find(
    (entrant) => entrant.playerId === playerId,
  )?.netWinnings;
  if (netWinnings === undefined) {
    throw new Error(
      `tournament ${tournament.id} has no result for player ${playerId}`,
    );
  }
  return netWinnings;
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
    canRegister:
      entrant === undefined &&
      (tournament.status === "registration" || isEntryPeriodOpen(tournament)),
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
  const standings = buildStandings(tournament);
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
    entryPeriodLevels: tournament.entryPeriodLevels,
    entryPeriodOpen: tournament.entryPeriodOpen,
    tableSize: tournament.tableSize,
    speed: tournament.speed,
    level: tournament.level,
    timeToNextLevel: getTimeToNextLevel(tournament),
    onBreak: tournament.onBreak,
    pendingBreak: tournament.pendingBreak,
    ...Tournament.copyTournamentSchedule(tournament),
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
