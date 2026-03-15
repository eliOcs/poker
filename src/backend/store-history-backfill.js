import { existsSync, readdirSync, readFileSync } from "node:fs";
import * as logger from "./logger.js";

const EPOCH_ISO = new Date(0).toISOString();

/**
 * @typedef {import('./id.js').Id} Id
 * @typedef {"cash"|"sitngo"|"mtt"} TableKind
 * @typedef {{ id: Id, kind: TableKind, tournamentId: Id|null, seatCount: number, tableName: string|null, createdAt: string|null }} BackfilledTable
 * @typedef {{ playerId: Id, tableId: Id, tournamentId: Id|null, lastHandNumber: number, lastPlayedAt: string }} PlayerTableInput
 * @typedef {{ playerId: Id, tournamentId: Id, lastTableId: Id, lastHandNumber: number, lastPlayedAt: string }} PlayerTournamentInput
 */

/**
 * @param {string} dataDir
 * @param {(table: BackfilledTable) => void} saveTable
 * @param {(entries: PlayerTableInput[]) => void} recordPlayerTableActivity
 * @param {(entries: PlayerTournamentInput[]) => void} recordPlayerTournamentActivity
 */
export function backfillPlayerTableLinksFromHistory(
  dataDir,
  saveTable,
  recordPlayerTableActivity,
  recordPlayerTournamentActivity,
) {
  for (const file of listHistoryFiles(dataDir)) {
    const tableId = /** @type {Id} */ (file.slice(0, -4));
    try {
      backfillHistoryFile(
        dataDir,
        file,
        tableId,
        saveTable,
        recordPlayerTableActivity,
        recordPlayerTournamentActivity,
      );
    } catch (error) {
      logger.warn("player table backfill skipped invalid history file", {
        file,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

/**
 * @param {string} dataDir
 * @returns {string[]}
 */
function listHistoryFiles(dataDir) {
  if (!existsSync(dataDir)) return [];
  return readdirSync(dataDir).filter((file) => file.endsWith(".ohh"));
}

/**
 * @param {string} dataDir
 * @param {string} file
 * @param {Id} tableId
 * @param {(table: BackfilledTable) => void} saveTable
 * @param {(entries: PlayerTableInput[]) => void} recordPlayerTableActivity
 * @param {(entries: PlayerTournamentInput[]) => void} recordPlayerTournamentActivity
 */
function backfillHistoryFile(
  dataDir,
  file,
  tableId,
  saveTable,
  recordPlayerTableActivity,
  recordPlayerTournamentActivity,
) {
  const hands = readHandsFromHistoryFile(dataDir, file);
  const firstHand = hands[0];
  if (!firstHand) return;

  saveTable({
    id: tableId,
    kind: inferTableKindFromHand(firstHand),
    tournamentId: getTournamentIdFromHand(firstHand),
    seatCount: firstHand.table_size || 0,
    tableName: firstHand.table_name || null,
    createdAt: firstHand.start_date_utc || null,
  });

  for (const hand of hands) {
    const tableEntries = createPlayerTableEntries(hand, tableId);
    if (tableEntries.length === 0) continue;

    recordPlayerTableActivity(tableEntries);

    const tournamentId = getTournamentIdFromHand(hand);
    if (tournamentId && inferTableKindFromHand(hand) === "mtt") {
      recordPlayerTournamentActivity(
        tableEntries.map((entry) => ({
          playerId: entry.playerId,
          tournamentId,
          lastTableId: tableId,
          lastHandNumber: entry.lastHandNumber,
          lastPlayedAt: entry.lastPlayedAt,
        })),
      );
    }
  }
}

/**
 * @param {string} dataDir
 * @param {string} file
 * @returns {any[]}
 */
function readHandsFromHistoryFile(dataDir, file) {
  const content = readFileSync(`${dataDir}/${file}`, "utf8");
  return content
    .split("\n\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line).ohh)
    .filter(Boolean);
}

/**
 * @param {any} hand
 * @param {Id} tableId
 * @returns {PlayerTableInput[]}
 */
function createPlayerTableEntries(hand, tableId) {
  const tournamentId = getTournamentIdFromHand(hand);
  const playerIds = Array.isArray(hand.players)
    ? hand.players.map((player) => /** @type {Id} */ (player.id))
    : [];
  if (playerIds.length === 0) return [];

  const lastPlayedAt =
    typeof hand.start_date_utc === "string" ? hand.start_date_utc : EPOCH_ISO;
  const lastHandNumber = readBackfilledHandNumber(hand, tableId);

  return playerIds.map((playerId) => ({
    playerId,
    tableId,
    tournamentId,
    lastHandNumber,
    lastPlayedAt,
  }));
}

/**
 * @param {any} hand
 * @returns {TableKind}
 */
function inferTableKindFromHand(hand) {
  if (!hand?.tournament) return "cash";
  if (hand?.tournament_info?.type === "MTT") return "mtt";
  return "sitngo";
}

/**
 * @param {any} hand
 * @returns {Id|null}
 */
function getTournamentIdFromHand(hand) {
  if (
    hand?.tournament_info?.type === "MTT" &&
    typeof hand.tournament_info.tournament_number === "string"
  ) {
    return /** @type {Id} */ (hand.tournament_info.tournament_number);
  }
  return null;
}

/**
 * @param {any} hand
 * @param {Id} tableId
 * @returns {number}
 */
function readBackfilledHandNumber(hand, tableId) {
  const gameNumber =
    typeof hand?.game_number === "string" ? hand.game_number : `${tableId}-0`;
  const suffix = gameNumber.slice(`${tableId}-`.length);
  const parsed = Number.parseInt(suffix, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}
