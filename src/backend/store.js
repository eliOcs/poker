import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import * as logger from "./logger.js";
import { DEFAULT_SETTINGS } from "./user.js";

/**
 * @typedef {import('./user.js').User} User
 * @typedef {import('./id.js').Id} Id
 * @typedef {import('./user.js').UserSettings} UserSettings
 */

/** @type {DatabaseSync | null} */
let db = null;

/** @returns {string} */
function getDataDir() {
  return process.env.DATA_DIR || "data";
}

/**
 * Checks if a column exists in a table
 * @param {string} table
 * @param {string} column
 * @returns {boolean}
 */
function columnExists(table, column) {
  if (!db) return false;
  const stmt = db.prepare(`PRAGMA table_info(${table})`);
  const columns = stmt.all();
  return columns.some((col) => col.name === column);
}

/**
 * @param {string} [dbPath] - Optional path for database. Use ":memory:" for in-memory DB.
 */
export function initialize(dbPath = undefined) {
  if (db) return;

  if (dbPath === ":memory:") {
    db = new DatabaseSync(":memory:");
  } else {
    const dataDir = getDataDir();
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    dbPath = `${dataDir}/poker.db`;
    db = new DatabaseSync(dbPath);
    db.exec("PRAGMA journal_mode=WAL");
  }

  const hasUsersTable = db
    .prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='users' LIMIT 1",
    )
    .get();
  if (!hasUsersTable) {
    // Create users table if missing.
    db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        name TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
  }

  // Migration: add settings column if it doesn't exist
  if (!columnExists("users", "settings")) {
    db.exec("ALTER TABLE users ADD COLUMN settings TEXT DEFAULT '{}'");
  }

  logger.info("store initialized", { path: dbPath });
}

/** @param {User} user */
export function saveUser(user) {
  if (!db) throw new Error("Store not initialized");

  const settingsJson = JSON.stringify(user.settings || {});
  const nameForDb = user.name === undefined ? null : user.name;
  const stmt = db.prepare(`
    INSERT INTO users (id, name, settings, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      settings = excluded.settings,
      updated_at = datetime('now')
  `);
  stmt.run(user.id, nameForDb, settingsJson);
}

/**
 * @param {string} id
 * @returns {User | null}
 */
export function loadUser(id) {
  if (!db) throw new Error("Store not initialized");
  if (!id) return null;

  const stmt = db.prepare("SELECT id, name, settings FROM users WHERE id = ?");
  const row = stmt.get(id);

  if (!row) return null;

  const savedSettings = row.settings
    ? JSON.parse(/** @type {string} */ (row.settings))
    : {};

  return {
    id: /** @type {Id} */ (row.id),
    name: row.name === null ? undefined : /** @type {string} */ (row.name),
    settings: { ...DEFAULT_SETTINGS, ...savedSettings },
  };
}

export function close() {
  if (db) {
    db.close();
    db = null;
    logger.info("store closed");
  }
}

/** @returns {number} */
export function count() {
  if (!db) throw new Error("Store not initialized");

  const stmt = db.prepare("SELECT COUNT(*) as count FROM users");
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
