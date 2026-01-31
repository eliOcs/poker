import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, renameSync } from "node:fs";
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
 * Migrates data from old players.db to new poker.db if needed
 * @param {string} dataDir
 * @returns {boolean} true if migration occurred
 */
function migrateFromPlayersDb(dataDir) {
  const oldPath = `${dataDir}/players.db`;
  const newPath = `${dataDir}/poker.db`;

  if (!existsSync(newPath) && existsSync(oldPath)) {
    logger.info("migrating database", { from: oldPath, to: newPath });
    renameSync(oldPath, newPath);
    // Also rename WAL and SHM files if they exist
    if (existsSync(`${oldPath}-wal`)) {
      renameSync(`${oldPath}-wal`, `${newPath}-wal`);
    }
    if (existsSync(`${oldPath}-shm`)) {
      renameSync(`${oldPath}-shm`, `${newPath}-shm`);
    }
    return true;
  }
  return false;
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

    // Migrate from old players.db if needed
    migrateFromPlayersDb(dataDir);

    dbPath = `${dataDir}/poker.db`;
    db = new DatabaseSync(dbPath);
    db.exec("PRAGMA journal_mode=WAL");
  }

  // Check for tables that need migration
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all();
  const hasPlayersTable = tables.some((t) => t.name === "players");
  const hasUsersTable = tables.some((t) => t.name === "users");

  // Migration: rename players table to users if it exists
  if (hasPlayersTable && !hasUsersTable) {
    logger.info("migrating table", { from: "players", to: "users" });
    db.exec("ALTER TABLE players RENAME TO users");
  } else if (!hasUsersTable) {
    // Create fresh users table
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
  const stmt = db.prepare(`
    INSERT INTO users (id, name, settings, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      settings = excluded.settings,
      updated_at = datetime('now')
  `);
  stmt.run(user.id, user.name, settingsJson);
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
    name: /** @type {string|null} */ (row.name),
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
