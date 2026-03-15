import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import * as logger from "./logger.js";
import { DEFAULT_SETTINGS } from "./user.js";
import { backfillPlayerTableLinksFromHistory } from "./store-history-backfill.js";

/**
 * @typedef {import('./user.js').User} User
 * @typedef {import('./id.js').Id} Id
 * @typedef {import('./user.js').UserSettings} UserSettings
 * @typedef {"cash"|"sitngo"|"mtt"} TableKind
 * @typedef {{ id: Id, name?: string|null, email?: string|null, settings?: UserSettings }} SaveUserInput
 * @typedef {{ id: Id, name?: string, email?: string, settings: UserSettings, createdAt: string, updatedAt: string }} UserProfile
 * @typedef {{ id: Id, kind: TableKind, tournamentId?: Id|null, seatCount: number, tableName?: string|null, createdAt?: string|null, closedAt?: string|null }} SaveTableInput
 * @typedef {{ playerId: Id, tableId: Id, tournamentId?: Id|null, lastHandNumber: number, lastPlayedAt: string }} PlayerTableInput
 * @typedef {{ playerId: Id, tournamentId: Id, lastTableId: Id, lastHandNumber: number, lastPlayedAt: string }} PlayerTournamentInput
 * @typedef {{ id: Id, kind: TableKind, tournamentId: Id|null, seatCount: number, tableName: string|null, createdAt: string, closedAt: string|null }} TableRecord
 * @typedef {{ tableId: Id, tournamentId: Id|null, lastHandNumber: number, lastPlayedAt: string }} PlayerTableLink
 * @typedef {{ tournamentId: Id, lastTableId: Id, lastHandNumber: number, lastPlayedAt: string }} PlayerTournamentLink
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
  dbPath = openDatabase(dbPath, isInMemory);
  ensureUsersTable();
  ensureStoreTables();
  runHistoryBackfills(isInMemory);
  migrateUserSchema();

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
 * @param {string} email
 * @returns {User | null}
 */
export function loadUserByEmail(email) {
  if (!db) throw new Error("Store not initialized");
  if (!email) return null;

  const stmt = db.prepare(
    "SELECT id, name, email, settings, created_at, updated_at FROM users WHERE email = ? ORDER BY updated_at DESC, created_at DESC, id DESC LIMIT 1",
  );
  const row = stmt.get(email);

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

/** @param {SaveTableInput} table */
export function saveTable(table) {
  if (!db) throw new Error("Store not initialized");
  const stmt = db.prepare(`
    INSERT INTO tables (
      id, kind, tournament_id, seat_count, table_name, created_at, closed_at
    )
    VALUES (?, ?, ?, ?, ?, COALESCE(?, datetime('now')), ?)
    ON CONFLICT(id) DO UPDATE SET
      kind = excluded.kind,
      tournament_id = excluded.tournament_id,
      seat_count = excluded.seat_count,
      table_name = excluded.table_name,
      created_at = excluded.created_at,
      closed_at = excluded.closed_at
  `);
  stmt.run(
    table.id,
    table.kind,
    table.tournamentId ?? null,
    table.seatCount,
    table.tableName ?? null,
    table.createdAt ?? null,
    table.closedAt ?? null,
  );
}

/**
 * @param {Id} tableId
 * @param {string} closedAt
 */
export function closeTable(tableId, closedAt = new Date().toISOString()) {
  if (!db) throw new Error("Store not initialized");
  const stmt = db.prepare("UPDATE tables SET closed_at = ? WHERE id = ?");
  stmt.run(closedAt, tableId);
}

/**
 * @param {PlayerTableInput[]} entries
 */
export function recordPlayerTableActivity(entries) {
  if (!db) throw new Error("Store not initialized");
  for (const entry of entries) {
    if (!entry.playerId || !entry.tableId) continue;
    const stmt = db.prepare(`
      INSERT INTO player_tables (
        player_id, table_id, tournament_id, last_hand_number, last_played_at
      )
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(player_id, table_id) DO UPDATE SET
        tournament_id = excluded.tournament_id,
        last_hand_number = MAX(player_tables.last_hand_number, excluded.last_hand_number),
        last_played_at = CASE
          WHEN player_tables.last_played_at >= excluded.last_played_at
          THEN player_tables.last_played_at
          ELSE excluded.last_played_at
        END
    `);
    stmt.run(
      entry.playerId,
      entry.tableId,
      entry.tournamentId ?? null,
      entry.lastHandNumber,
      entry.lastPlayedAt,
    );
  }
}

/**
 * @param {PlayerTournamentInput[]} entries
 */
export function recordPlayerTournamentActivity(entries) {
  if (!db) throw new Error("Store not initialized");
  for (const entry of entries) {
    if (!entry.playerId || !entry.tournamentId || !entry.lastTableId) continue;
    const stmt = db.prepare(`
      INSERT INTO player_tournaments (
        player_id, tournament_id, last_table_id, last_hand_number, last_played_at
      )
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(player_id, tournament_id) DO UPDATE SET
        last_table_id = CASE
          WHEN player_tournaments.last_played_at >= excluded.last_played_at
          THEN player_tournaments.last_table_id
          ELSE excluded.last_table_id
        END,
        last_hand_number = CASE
          WHEN player_tournaments.last_played_at >= excluded.last_played_at
          THEN player_tournaments.last_hand_number
          ELSE excluded.last_hand_number
        END,
        last_played_at = CASE
          WHEN player_tournaments.last_played_at >= excluded.last_played_at
          THEN player_tournaments.last_played_at
          ELSE excluded.last_played_at
        END
    `);
    stmt.run(
      entry.playerId,
      entry.tournamentId,
      entry.lastTableId,
      entry.lastHandNumber,
      entry.lastPlayedAt,
    );
  }
}

/**
 * @param {Id} playerId
 * @returns {PlayerTableLink[]}
 */
export function listPlayerTables(playerId) {
  if (!db) throw new Error("Store not initialized");
  if (!playerId) return [];

  const stmt = db.prepare(`
    SELECT table_id, tournament_id, last_hand_number, last_played_at
    FROM player_tables
    WHERE player_id = ?
    ORDER BY last_played_at DESC, table_id DESC
  `);

  return stmt.all(playerId).map((row) => ({
    tableId: /** @type {Id} */ (row.table_id),
    tournamentId: row.tournament_id
      ? /** @type {Id} */ (row.tournament_id)
      : null,
    lastHandNumber: /** @type {number} */ (row.last_hand_number),
    lastPlayedAt: /** @type {string} */ (row.last_played_at),
  }));
}

/**
 * @param {Id} playerId
 * @returns {PlayerTournamentLink[]}
 */
export function listPlayerTournaments(playerId) {
  if (!db) throw new Error("Store not initialized");
  if (!playerId) return [];

  const stmt = db.prepare(`
    SELECT tournament_id, last_table_id, last_hand_number, last_played_at
    FROM player_tournaments
    WHERE player_id = ?
    ORDER BY last_played_at DESC, tournament_id DESC
  `);

  return stmt.all(playerId).map((row) => ({
    tournamentId: /** @type {Id} */ (row.tournament_id),
    lastTableId: /** @type {Id} */ (row.last_table_id),
    lastHandNumber: /** @type {number} */ (row.last_hand_number),
    lastPlayedAt: /** @type {string} */ (row.last_played_at),
  }));
}

/**
 * @param {Id} playerId
 * @param {Id} tournamentId
 * @returns {PlayerTableLink[]}
 */
export function listPlayerTablesForTournament(playerId, tournamentId) {
  if (!db) throw new Error("Store not initialized");
  if (!playerId || !tournamentId) return [];

  const stmt = db.prepare(`
    SELECT table_id, tournament_id, last_hand_number, last_played_at
    FROM player_tables
    WHERE player_id = ? AND tournament_id = ?
    ORDER BY last_played_at DESC, table_id DESC
  `);

  return stmt.all(playerId, tournamentId).map((row) => ({
    tableId: /** @type {Id} */ (row.table_id),
    tournamentId: row.tournament_id
      ? /** @type {Id} */ (row.tournament_id)
      : null,
    lastHandNumber: /** @type {number} */ (row.last_hand_number),
    lastPlayedAt: /** @type {string} */ (row.last_played_at),
  }));
}

/**
 * @param {Id} tableId
 * @returns {TableRecord|null}
 */
export function loadTable(tableId) {
  if (!db) throw new Error("Store not initialized");
  if (!tableId) return null;
  const stmt = db.prepare(`
    SELECT id, kind, tournament_id, seat_count, table_name, created_at, closed_at
    FROM tables
    WHERE id = ?
  `);
  const row = stmt.get(tableId);
  if (!row) return null;
  return {
    id: /** @type {Id} */ (row.id),
    kind: /** @type {TableKind} */ (row.kind),
    tournamentId: row.tournament_id
      ? /** @type {Id} */ (row.tournament_id)
      : null,
    seatCount: /** @type {number} */ (row.seat_count),
    tableName: row.table_name ? /** @type {string} */ (row.table_name) : null,
    createdAt: /** @type {string} */ (row.created_at),
    closedAt: row.closed_at ? /** @type {string} */ (row.closed_at) : null,
  };
}

/**
 * Reassigns indexed game participation from one player id to another.
 * @param {Id} fromPlayerId
 * @param {Id} toPlayerId
 */
export function migratePlayerData(fromPlayerId, toPlayerId) {
  if (!db) throw new Error("Store not initialized");
  if (fromPlayerId === toPlayerId) {
    throw new Error("Cannot migrate player data to the same player id");
  }

  const playerTableRows = /** @type {PlayerTableLink[]} */ (
    db
      .prepare(
        `
        SELECT table_id, tournament_id, last_hand_number, last_played_at
        FROM player_tables
        WHERE player_id = ?
      `,
      )
      .all(fromPlayerId)
      .map((row) => ({
        tableId: /** @type {Id} */ (row.table_id),
        tournamentId: row.tournament_id
          ? /** @type {Id} */ (row.tournament_id)
          : null,
        lastHandNumber: /** @type {number} */ (row.last_hand_number),
        lastPlayedAt: /** @type {string} */ (row.last_played_at),
      }))
  );
  recordPlayerTableActivity(
    playerTableRows.map((row) => ({
      playerId: toPlayerId,
      tableId: row.tableId,
      tournamentId: row.tournamentId,
      lastHandNumber: row.lastHandNumber,
      lastPlayedAt: row.lastPlayedAt,
    })),
  );
  db.prepare("DELETE FROM player_tables WHERE player_id = ?").run(fromPlayerId);

  const playerTournamentRows = /** @type {PlayerTournamentLink[]} */ (
    db
      .prepare(
        `
        SELECT tournament_id, last_table_id, last_hand_number, last_played_at
        FROM player_tournaments
        WHERE player_id = ?
      `,
      )
      .all(fromPlayerId)
      .map((row) => ({
        tournamentId: /** @type {Id} */ (row.tournament_id),
        lastTableId: /** @type {Id} */ (row.last_table_id),
        lastHandNumber: /** @type {number} */ (row.last_hand_number),
        lastPlayedAt: /** @type {string} */ (row.last_played_at),
      }))
  );
  recordPlayerTournamentActivity(
    playerTournamentRows.map((row) => ({
      playerId: toPlayerId,
      tournamentId: row.tournamentId,
      lastTableId: row.lastTableId,
      lastHandNumber: row.lastHandNumber,
      lastPlayedAt: row.lastPlayedAt,
    })),
  );
  db.prepare("DELETE FROM player_tournaments WHERE player_id = ?").run(
    fromPlayerId,
  );
}

/**
 * @param {Id} id
 */
export function deleteUser(id) {
  if (!db) throw new Error("Store not initialized");

  const stmt = db.prepare("DELETE FROM users WHERE id = ?");
  stmt.run(id);
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

/**
 * @param {string|undefined} dbPath
 * @param {boolean} isInMemory
 * @returns {string|undefined}
 */
function openDatabase(dbPath, isInMemory) {
  if (isInMemory) {
    db = new DatabaseSync(":memory:");
    return dbPath;
  }

  const dataDir = getDataDir();
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  const resolvedPath = `${dataDir}/poker.db`;
  db = new DatabaseSync(resolvedPath);
  db.exec("PRAGMA journal_mode=WAL");
  return resolvedPath;
}

function ensureUsersTable() {
  const database = /** @type {DatabaseSync} */ (db);
  const hasUsersTable = database
    .prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='users' LIMIT 1",
    )
    .get();
  if (hasUsersTable) return;

  database.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

function ensureStoreTables() {
  const database = /** @type {DatabaseSync} */ (db);
  database.exec(`
    CREATE TABLE IF NOT EXISTS store_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS tables (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      tournament_id TEXT,
      seat_count INTEGER NOT NULL,
      table_name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      closed_at TEXT
    )
  `);
  database.exec(
    "CREATE INDEX IF NOT EXISTS idx_tables_tournament_id ON tables (tournament_id)",
  );

  database.exec(`
    CREATE TABLE IF NOT EXISTS player_tables (
      player_id TEXT NOT NULL,
      table_id TEXT NOT NULL,
      tournament_id TEXT,
      last_hand_number INTEGER NOT NULL DEFAULT 0,
      last_played_at TEXT NOT NULL,
      PRIMARY KEY (player_id, table_id)
    )
  `);
  database.exec(
    "CREATE INDEX IF NOT EXISTS idx_player_tables_player_id ON player_tables (player_id)",
  );
  database.exec(
    "CREATE INDEX IF NOT EXISTS idx_player_tables_tournament_id ON player_tables (tournament_id)",
  );

  database.exec(`
    CREATE TABLE IF NOT EXISTS player_tournaments (
      player_id TEXT NOT NULL,
      tournament_id TEXT NOT NULL,
      last_table_id TEXT NOT NULL,
      last_hand_number INTEGER NOT NULL DEFAULT 0,
      last_played_at TEXT NOT NULL,
      PRIMARY KEY (player_id, tournament_id)
    )
  `);
  database.exec(
    "CREATE INDEX IF NOT EXISTS idx_player_tournaments_player_id ON player_tournaments (player_id)",
  );
}

/**
 * @param {boolean} isInMemory
 */
function runHistoryBackfills(isInMemory) {
  if (isInMemory) return;

  runBackfill("player_table_links_backfilled_at", () => {
    backfillPlayerTableLinksFromHistory(
      getDataDir(),
      saveTable,
      recordPlayerTableActivity,
      recordPlayerTournamentActivity,
    );
  });
}

/**
 * @param {string} key
 * @param {() => void} callback
 */
function runBackfill(key, callback) {
  if (loadMetaValue(key) !== null) return;
  callback();
  saveMetaValue(key, new Date().toISOString());
}

function migrateUserSchema() {
  const database = /** @type {DatabaseSync} */ (db);
  migrateUserTimestamps();
  if (!columnExists("users", "settings")) {
    database.exec("ALTER TABLE users ADD COLUMN settings TEXT DEFAULT '{}'");
  }
  if (!columnExists("users", "email")) {
    database.exec("ALTER TABLE users ADD COLUMN email TEXT");
  }
}
