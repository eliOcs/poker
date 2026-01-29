import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import * as logger from "./logger.js";

/**
 * @typedef {import('./poker/seat.js').Player} Player
 * @typedef {import('./poker/id.js').Id} Id
 */

/** @type {DatabaseSync | null} */
let db = null;

/** @returns {string} */
function getDataDir() {
  return process.env.DATA_DIR || "data";
}

export function initialize() {
  if (db) return;

  const dataDir = getDataDir();
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = `${dataDir}/players.db`;
  db = new DatabaseSync(dbPath);

  db.exec("PRAGMA journal_mode=WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      name TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  logger.info("player store initialized", { path: dbPath });
}

/** @param {Player} player */
export function save(player) {
  if (!db) throw new Error("Player store not initialized");

  const stmt = db.prepare(`
    INSERT INTO players (id, name, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      updated_at = datetime('now')
  `);
  stmt.run(player.id, player.name);
}

/**
 * @param {string} id
 * @returns {Player | null}
 */
export function load(id) {
  if (!db) throw new Error("Player store not initialized");
  if (!id) return null;

  const stmt = db.prepare("SELECT id, name FROM players WHERE id = ?");
  const row = stmt.get(id);

  if (!row) return null;

  return {
    id: /** @type {Id} */ (row.id),
    name: /** @type {string|null} */ (row.name),
  };
}

export function close() {
  if (db) {
    db.close();
    db = null;
    logger.info("player store closed");
  }
}

/** @returns {number} */
export function count() {
  if (!db) throw new Error("Player store not initialized");

  const stmt = db.prepare("SELECT COUNT(*) as count FROM players");
  const row = stmt.get();
  return /** @type {number} */ (row?.count) || 0;
}

// For testing - allows resetting state
export function _reset() {
  if (db) {
    db.close();
    db = null;
  }
}
