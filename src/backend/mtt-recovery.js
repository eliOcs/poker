import { existsSync, readdirSync, readFileSync } from "node:fs";
import {
  getDataDir,
  readTournamentSummarySync,
  toCents,
} from "./poker/hand-history/io.js";
import * as Store from "./store.js";
import * as Tournament from "../shared/tournament.js";

/**
 * @typedef {import('./mtt.js').ManagedTournament} ManagedTournament
 * @typedef {import('./mtt.js').TournamentEntrant} TournamentEntrant
 * @typedef {import('./mtt.js').ManagedTable} ManagedTable
 * @typedef {import('./poker/hand-history/index.js').OHHHand} OHHHand
 * @typedef {import('./poker/tournament-summary.js').OTSSummary} OTSSummary
 */

/**
 * @typedef {object} RecoveredTable
 * @property {string} tableId
 * @property {string} tableName
 * @property {number} tableSize
 * @property {number} handNumber
 * @property {string} lastPlayedAt
 */

/**
 * @param {string} playerId
 * @returns {string}
 */
function getPlayerName(playerId) {
  try {
    return Store.loadUser(playerId)?.name ?? playerId;
  } catch {
    return playerId;
  }
}

/**
 * @param {OHHHand} hand
 * @param {string} tableId
 * @returns {number}
 */
function readHandNumber(hand, tableId) {
  const gameNumber =
    typeof hand.game_number === "string" ? hand.game_number : `${tableId}-0`;
  const suffix = gameNumber.slice(`${tableId}-`.length);
  const parsed = Number.parseInt(suffix, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * @param {string} tableId
 * @returns {OHHHand[]}
 */
function readTableHands(tableId) {
  const filePath = `${getDataDir()}/${tableId}.ohh`;
  if (!existsSync(filePath)) return [];

  return readFileSync(filePath, "utf8")
    .split("\n\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line).ohh)
    .filter(Boolean);
}

/**
 * @param {string} tableId
 * @returns {RecoveredTable|undefined}
 */
function recoverTable(tableId) {
  const hands = readTableHands(tableId);
  if (hands.length === 0) return;

  const lastHand = /** @type {OHHHand} */ (hands[hands.length - 1]);
  return {
    tableId,
    tableName: lastHand.table_name ?? tableId,
    tableSize: lastHand.table_size,
    handNumber: readHandNumber(lastHand, tableId),
    lastPlayedAt: lastHand.start_date_utc,
  };
}

/**
 * @param {string} tournamentId
 * @returns {RecoveredTable[]}
 */
function scanTournamentTables(tournamentId) {
  const dataDir = getDataDir();
  if (!existsSync(dataDir)) return [];

  /** @type {RecoveredTable[]} */
  const tables = [];
  for (const file of readdirSync(dataDir)) {
    if (!file.endsWith(".ohh")) continue;
    const tableId = file.slice(0, -4);
    try {
      const hands = readTableHands(tableId);
      if (
        hands.some(
          (hand) =>
            hand.tournament_info?.type === "MTT" &&
            hand.tournament_info.tournament_number === tournamentId,
        )
      ) {
        const table = recoverTable(tableId);
        if (table) tables.push(table);
      }
    } catch {
      // Ignore invalid history files while recovering a tournament archive.
    }
  }
  return tables;
}

/**
 * @param {string} tournamentId
 * @returns {RecoveredTable[]}
 */
function recoverTables(tournamentId) {
  try {
    const tables = Store.listTournamentTables(tournamentId).flatMap((table) => {
      try {
        const recoveredTable = recoverTable(table.tableId);
        return recoveredTable ? [recoveredTable] : [];
      } catch {
        return [];
      }
    });
    if (tables.length > 0) {
      return tables;
    }
  } catch {
    // Fall back to scanning history files when the DB index is unavailable.
  }

  return scanTournamentTables(tournamentId);
}

/**
 * @param {OTSSummary} summary
 * @param {RecoveredTable[]} tables
 * @returns {number}
 */
function recoverTableSize(summary, tables) {
  return (
    tables.reduce((max, table) => Math.max(max, table.tableSize), 0) ||
    Math.min(
      summary.player_count || Tournament.DEFAULT_SEATS,
      Tournament.DEFAULT_SEATS,
    )
  );
}

/**
 * @param {RecoveredTable[]} tables
 * @returns {Map<string, RecoveredTable>}
 */
function buildTableById(tables) {
  return new Map(tables.map((table) => [table.tableId, table]));
}

/**
 * @param {OTSSummary} summary
 * @returns {Map<string, number>}
 */
function buildRebuysByPlayer(summary) {
  const rebuysByPlayer = new Map();
  for (const rebuy of summary.tournament_rebuys ?? []) {
    if (!Number.isSafeInteger(rebuy.rebuys) || rebuy.rebuys <= 0) continue;
    rebuysByPlayer.set(
      rebuy.player_name,
      (rebuysByPlayer.get(rebuy.player_name) ?? 0) + rebuy.rebuys,
    );
  }
  return rebuysByPlayer;
}

/**
 * @param {OTSSummary} summary
 * @param {Map<string, number>} rebuysByPlayer
 * @returns {number}
 */
function recoverMaxRebuys(summary, rebuysByPlayer) {
  const hasRebuyFields =
    summary.rebuy_cost !== undefined ||
    summary.tournament_rebuys !== undefined ||
    summary.flags.includes("Re-Entry");
  if (!hasRebuyFields) return 0;
  return Math.max(1, ...rebuysByPlayer.values());
}

/**
 * @param {string} tournamentId
 * @param {string} playerId
 * @param {Map<string, RecoveredTable>} tableById
 * @returns {RecoveredTable|undefined}
 */
function findPlayerLatestTable(tournamentId, playerId, tableById) {
  try {
    const latestLink = Store.listPlayerTablesForTournament(
      playerId,
      tournamentId,
    ).find((link) => tableById.has(link.tableId));
    return latestLink ? tableById.get(latestLink.tableId) : undefined;
  } catch {
    return;
  }
}

/**
 * @param {OTSSummary} summary
 * @param {RecoveredTable[]} tables
 * @param {string} tournamentId
 * @param {Map<string, number>} rebuysByPlayer
 * @returns {TournamentEntrant[]}
 */
function recoverEntrants(summary, tables, tournamentId, rebuysByPlayer) {
  const tableById = buildTableById(tables);
  const totalEntries =
    summary.player_count +
    [...rebuysByPlayer.values()].reduce((total, rebuys) => total + rebuys, 0);
  return summary.tournament_finishes_and_winnings
    .slice()
    .sort((a, b) => a.finish_position - b.finish_position)
    .map((finish, index) => {
      const isWinner = finish.finish_position === 1;
      const latestTable = findPlayerLatestTable(
        tournamentId,
        finish.player_name,
        tableById,
      );
      return {
        playerId: finish.player_name,
        name: getPlayerName(finish.player_name),
        status: isWinner ? "winner" : "eliminated",
        stack: isWinner
          ? toCents(summary.initial_stack || 0) * Math.max(totalEntries, 1)
          : 0,
        tableId: latestTable?.tableId,
        finishPosition: finish.finish_position,
        handsPlayed: latestTable?.handNumber ?? 0,
        rebuysUsed: rebuysByPlayer.get(finish.player_name) ?? 0,
        registrationOrder: index,
        registeredAt: summary.start_date_utc,
        ...(isWinner ? {} : { eliminatedAt: summary.end_date_utc }),
      };
    });
}

/**
 * @param {RecoveredTable[]} tables
 * @param {string} endedAt
 * @returns {ManagedTable[]}
 */
function recoverManagedTables(tables, endedAt) {
  return tables
    .slice()
    .sort((a, b) => a.lastPlayedAt.localeCompare(b.lastPlayedAt))
    .map((table, index) => ({
      tableId: table.tableId,
      tableName: table.tableName,
      createdOrder: index,
      createdAt: table.lastPlayedAt,
      closedAt: endedAt,
      handNumber: table.handNumber,
    }));
}

/**
 * Rebuilds a finished MTT from its OTS summary and indexed table histories.
 * @param {string} tournamentId
 * @returns {ManagedTournament|undefined}
 */
export function recoverFinishedMttFromSummary(tournamentId) {
  const summary = readTournamentSummarySync(tournamentId);
  if (!summary || summary.type !== "MTT") return;

  const tables = recoverTables(tournamentId);
  const rebuysByPlayer = buildRebuysByPlayer(summary);
  const entrants = recoverEntrants(
    summary,
    tables,
    tournamentId,
    rebuysByPlayer,
  );
  return {
    id: tournamentId,
    name: summary.tournament_name || tournamentId,
    status: "finished",
    ownerId: "unknown",
    buyIn: toCents(summary.buyin_amount || 0),
    tableSize: recoverTableSize(summary, tables),
    initialStack: toCents(summary.initial_stack || 0),
    maxRebuys: recoverMaxRebuys(summary, rebuysByPlayer),
    level: 1,
    levelTicks: 0,
    onBreak: false,
    pendingBreak: false,
    pendingRebalance: false,
    breakTicks: 0,
    createdAt: summary.start_date_utc,
    startedAt: summary.start_date_utc,
    endedAt: summary.end_date_utc,
    entrants: new Map(entrants.map((entrant) => [entrant.playerId, entrant])),
    tables: recoverManagedTables(tables, summary.end_date_utc),
    nextRegistrationOrder: entrants.length,
  };
}
