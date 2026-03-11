import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import * as logger from "./logger.js";
import { DEFAULT_SETTINGS } from "./user.js";

/**
 * @typedef {import('./user.js').User} User
 * @typedef {import('./id.js').Id} Id
 * @typedef {import('./user.js').UserSettings} UserSettings
 * @typedef {{ id: Id, name?: string|null, email?: string|null, settings?: UserSettings }} SaveUserInput
 * @typedef {{ id: Id, name?: string, email?: string, settings: UserSettings, createdAt: string, updatedAt: string }} UserProfile
 * @typedef {{ playerId: Id, gameId: Id }} PlayerGameInput
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
  const stmt = /** @type {DatabaseSync} */ (db).prepare(
    `PRAGMA table_info(${table})`,
  );
  const columns = stmt.all();
  return columns.some((col) => col.name === column);
}

/**
 * @param {string} key
 * @returns {string|null}
 */
function loadMetaValue(key) {
  const stmt = /** @type {DatabaseSync} */ (db).prepare(
    "SELECT value FROM store_meta WHERE key = ?",
  );
  const row = stmt.get(key);
  return row ? /** @type {string} */ (row.value) : null;
}

/**
 * @param {string} key
 * @param {string} value
 */
function saveMetaValue(key, value) {
  const stmt = /** @type {DatabaseSync} */ (db).prepare(`
    INSERT INTO store_meta (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);
  stmt.run(key, value);
}

/**
 * @param {string} [dbPath] - Optional path for database. Use ":memory:" for in-memory DB.
 */
export function initialize(dbPath = undefined) {
  if (db) return;
  const isInMemory = dbPath === ":memory:";

  if (isInMemory) {
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
        email TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS store_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS player_games (
      player_id TEXT NOT NULL,
      game_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (player_id, game_id)
    )
  `);
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_player_games_player_id ON player_games (player_id)",
  );

  if (!isInMemory && loadMetaValue("player_games_backfilled_at") === null) {
    backfillPlayerGamesFromHistory();
    saveMetaValue("player_games_backfilled_at", new Date().toISOString());
  }

  migrateUserTimestamps();

  // Migration: add settings column if it doesn't exist
  if (!columnExists("users", "settings")) {
    db.exec("ALTER TABLE users ADD COLUMN settings TEXT DEFAULT '{}'");
  }

  if (!columnExists("users", "email")) {
    db.exec("ALTER TABLE users ADD COLUMN email TEXT");
  }

  logger.info("store initialized", { path: dbPath });
}

/** @param {SaveUserInput} user */
export function saveUser(user) {
  if (!db) throw new Error("Store not initialized");

  const settingsJson = JSON.stringify(user.settings ?? {});
  const nameForDb = user.name === undefined ? null : user.name;
  const emailForDb = user.email === undefined ? null : user.email;
  const stmt = db.prepare(`
    INSERT INTO users (id, name, email, settings, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      email = excluded.email,
      settings = excluded.settings,
      updated_at = datetime('now')
  `);
  stmt.run(user.id, nameForDb, emailForDb, settingsJson);
}

/**
 * @param {string} id
 * @returns {User | null}
 */
export function loadUser(id) {
  if (!db) throw new Error("Store not initialized");
  if (!id) return null;

  const stmt = db.prepare(
    "SELECT id, name, email, settings, created_at, updated_at FROM users WHERE id = ?",
  );
  const row = stmt.get(id);

  return hydrateUserRow(row);
}

/**
 * @param {string} id
 * @returns {UserProfile | null}
 */
export function loadUserProfile(id) {
  if (!db) throw new Error("Store not initialized");
  if (!id) return null;

  const stmt = db.prepare(
    "SELECT id, name, email, settings, created_at, updated_at FROM users WHERE id = ?",
  );
  const row = stmt.get(id);

  const user = hydrateUserRow(row);
  if (!user) return null;
  const userRow = /** @type {{ created_at: string, updated_at: string }} */ (
    row
  );

  return {
    ...user,
    createdAt: userRow.created_at,
    updatedAt: userRow.updated_at,
  };
}

/**
 * Records that players have participated in games.
 * Safe to call repeatedly for the same pairs.
 * @param {PlayerGameInput[]} entries
 */
export function recordPlayerGames(entries) {
  if (!db) throw new Error("Store not initialized");

  const validEntries = entries.filter(
    (entry) => entry.playerId && entry.gameId,
  );
  if (validEntries.length === 0) return;

  const placeholders = validEntries.map(() => "(?, ?)").join(", ");
  const stmt = db.prepare(`
    INSERT INTO player_games (player_id, game_id)
    VALUES ${placeholders}
    ON CONFLICT(player_id, game_id) DO NOTHING
  `);
  stmt.run(...validEntries.flatMap((entry) => [entry.playerId, entry.gameId]));
}

/**
 * @param {Id} playerId
 * @returns {Id[]}
 */
export function listPlayerGameIds(playerId) {
  if (!db) throw new Error("Store not initialized");
  if (!playerId) return [];

  const stmt = db.prepare(`
    SELECT game_id
    FROM player_games
    WHERE player_id = ?
    ORDER BY created_at ASC, game_id ASC
  `);

  return stmt.all(playerId).map((row) => /** @type {Id} */ (row.game_id));
}

/**
 * @param {any} row
 * @returns {User | null}
 */
function hydrateUserRow(row) {
  if (!row) return null;

  const savedSettings = row.settings
    ? JSON.parse(/** @type {string} */ (row.settings))
    : {};

  return {
    id: /** @type {Id} */ (row.id),
    name: row.name === null ? undefined : /** @type {string} */ (row.name),
    email: row.email === null ? undefined : /** @type {string} */ (row.email),
    settings: { ...DEFAULT_SETTINGS, ...savedSettings },
  };
}

function migrateUserTimestamps() {
  if (!db) throw new Error("Store not initialized");

  if (!columnExists("users", "created_at")) {
    db.exec(
      "ALTER TABLE users ADD COLUMN created_at TEXT NOT NULL DEFAULT (datetime('now'))",
    );
  }

  if (!columnExists("users", "updated_at")) {
    db.exec(
      "ALTER TABLE users ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'))",
    );
  }

  db.exec(`
    UPDATE users
    SET
      created_at = COALESCE(NULLIF(created_at, ''), datetime('now')),
      updated_at = COALESCE(NULLIF(updated_at, ''), COALESCE(NULLIF(created_at, ''), datetime('now')))
    WHERE
      created_at IS NULL OR created_at = '' OR
      updated_at IS NULL OR updated_at = ''
  `);
}

function backfillPlayerGamesFromHistory() {
  const dataDir = getDataDir();
  if (!existsSync(dataDir)) return;

  const files = readdirSync(dataDir).filter((file) => file.endsWith(".ohh"));
  if (files.length === 0) return;

  for (const file of files) {
    try {
      recordPlayerGames(readPlayerGamesFromHistoryFile(dataDir, file));
    } catch (error) {
      logger.warn("player game backfill skipped invalid history file", {
        file,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

/**
 * @param {string} dataDir
 * @param {string} file
 * @returns {PlayerGameInput[]}
 */
function readPlayerGamesFromHistoryFile(dataDir, file) {
  const gameId = /** @type {Id} */ (file.slice(0, -4));
  const content = readFileSync(`${dataDir}/${file}`, "utf8");
  const lines = content.split("\n\n").filter(Boolean);
  /** @type {PlayerGameInput[]} */
  const entries = [];

  for (const line of lines) {
    entries.push(...readPlayerGamesFromHistoryLine(line, gameId));
  }

  return entries;
}

/**
 * @param {string} line
 * @param {Id} gameId
 * @returns {PlayerGameInput[]}
 */
function readPlayerGamesFromHistoryLine(line, gameId) {
  const hand = JSON.parse(line).ohh;
  if (!Array.isArray(hand?.players)) return [];

  return hand.players
    .filter((player) => player?.id)
    .map((player) => ({
      playerId: /** @type {Id} */ (player.id),
      gameId,
    }));
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
