import { runInTransaction } from "./sqlite-transaction.js";

/**
 * @typedef {import('node:sqlite').DatabaseSync} DatabaseSync
 * @typedef {{ columns: Record<string, string>, primaryKey: string[], notNull: string[], defaults: Record<string, string> }} ExpectedTable
 */

// Append only: each array position is persisted in PRAGMA user_version.
/** @type {Array<(database: DatabaseSync) => void>} */
const migrations = [createInitialSchema];

/** @param {DatabaseSync} database */
export function migrateStore(database) {
  const row = /** @type {{ user_version: number }} */ (
    database.prepare("PRAGMA user_version").get()
  );
  const currentVersion = row.user_version;

  validateVersion(currentVersion);

  if (currentVersion === migrations.length) {
    validateSchema(database);
    return;
  }

  runInTransaction(database, () => {
    for (const migrate of migrations.slice(currentVersion)) migrate(database);
    validateSchema(database);
    database.exec(`PRAGMA user_version = ${migrations.length}`);
  });
}

/** @param {number} version */
function validateVersion(version) {
  if (!Number.isInteger(version) || version < 0) {
    throw new Error(`Database schema version ${version} is invalid`);
  }
  if (version > migrations.length) {
    throw new Error(
      `Database schema version ${version} is newer than supported version ${migrations.length}`,
    );
  }
}

/** @param {DatabaseSync} database */
function validateSchema(database) {
  for (const [table, expected] of Object.entries(expectedSchema)) {
    validateTable(database, table, expected);
  }

  const invalidUser = database
    .prepare(
      `SELECT 1 FROM users
       WHERE settings IS NULL OR settings = ''
          OR CASE
            WHEN NOT json_valid(settings) THEN 1
            ELSE json_type(settings) != 'object'
              OR COALESCE(json_type(settings, '$.volume'), '') NOT IN ('integer', 'real')
              OR COALESCE(json_type(settings, '$.vibration'), '') NOT IN ('true', 'false')
          END
          OR created_at IS NULL OR created_at = ''
          OR updated_at IS NULL OR updated_at = ''
       LIMIT 1`,
    )
    .get();
  if (invalidUser) {
    throw new Error("Database schema is incompatible: invalid user data");
  }
}

/**
 * @param {DatabaseSync} database
 * @param {string} table
 * @param {ExpectedTable} expected
 */
function validateTable(database, table, expected) {
  const rows = database.prepare(`PRAGMA table_info(${table})`).all();
  const columns = new Map(rows.map((row) => [row.name, row]));
  const missing = Object.keys(expected.columns).filter(
    (column) => !columns.has(column),
  );
  if (missing.length > 0) {
    throw new Error(
      `Database schema is incompatible: ${table} is missing ${missing.join(", ")}`,
    );
  }

  validateColumnTypes(table, columns, expected.columns);
  validatePrimaryKey(table, rows, expected.primaryKey);
  validateNotNull(table, columns, expected.notNull);
  validateDefaults(table, columns, expected.defaults);
}

/**
 * @param {string} table
 * @param {Map<unknown, Record<string, unknown>>} columns
 * @param {Record<string, string>} expected
 */
function validateColumnTypes(table, columns, expected) {
  for (const [column, type] of Object.entries(expected)) {
    if (String(columns.get(column)?.type).toUpperCase() !== type) {
      throw new Error(
        `Database schema is incompatible: ${table}.${column} must be ${type}`,
      );
    }
  }
}

/**
 * @param {string} table
 * @param {Record<string, unknown>[]} rows
 * @param {string[]} expected
 */
function validatePrimaryKey(table, rows, expected) {
  const primaryKey = rows
    .filter((row) => Number(row.pk) > 0)
    .sort((a, b) => Number(a.pk) - Number(b.pk))
    .map((row) => row.name);
  if (primaryKey.join(",") !== expected.join(",")) {
    throw new Error(
      `Database schema is incompatible: ${table} primary key must be (${expected.join(", ")})`,
    );
  }
}

/**
 * @param {string} table
 * @param {Map<unknown, Record<string, unknown>>} columns
 * @param {string[]} expected
 */
function validateNotNull(table, columns, expected) {
  for (const column of expected) {
    if (Number(columns.get(column)?.notnull) !== 1) {
      throw new Error(
        `Database schema is incompatible: ${table}.${column} must be NOT NULL`,
      );
    }
  }
}

/**
 * @param {string} table
 * @param {Map<unknown, Record<string, unknown>>} columns
 * @param {Record<string, string>} expected
 */
function validateDefaults(table, columns, expected) {
  for (const [column, defaultValue] of Object.entries(expected)) {
    if (columns.get(column)?.dflt_value !== defaultValue) {
      throw new Error(
        `Database schema is incompatible: ${table}.${column} has an invalid default`,
      );
    }
  }
}

/** @param {DatabaseSync} database */
function createInitialSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      settings TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS player_tables (
      player_id TEXT NOT NULL,
      table_id TEXT NOT NULL,
      tournament_id TEXT,
      last_hand_number INTEGER NOT NULL DEFAULT 0,
      last_played_at TEXT NOT NULL,
      PRIMARY KEY (player_id, table_id)
    );
    CREATE INDEX IF NOT EXISTS idx_player_tables_player_id
      ON player_tables (player_id);
    CREATE INDEX IF NOT EXISTS idx_player_tables_tournament_id
      ON player_tables (tournament_id);
    CREATE TABLE IF NOT EXISTS player_tournaments (
      player_id TEXT NOT NULL,
      tournament_id TEXT NOT NULL,
      last_table_id TEXT NOT NULL,
      last_hand_number INTEGER NOT NULL DEFAULT 0,
      last_played_at TEXT NOT NULL,
      PRIMARY KEY (player_id, tournament_id)
    );
    CREATE INDEX IF NOT EXISTS idx_player_tournaments_player_id
      ON player_tournaments (player_id)
  `);
}

/** @type {Record<string, ExpectedTable>} */
const expectedSchema = {
  users: {
    columns: {
      id: "TEXT",
      name: "TEXT",
      email: "TEXT",
      settings: "TEXT",
      created_at: "TEXT",
      updated_at: "TEXT",
    },
    primaryKey: ["id"],
    notNull: [],
    defaults: {
      created_at: "datetime('now')",
      updated_at: "datetime('now')",
    },
  },
  player_tables: {
    columns: {
      player_id: "TEXT",
      table_id: "TEXT",
      tournament_id: "TEXT",
      last_hand_number: "INTEGER",
      last_played_at: "TEXT",
    },
    primaryKey: ["player_id", "table_id"],
    notNull: ["player_id", "table_id", "last_hand_number", "last_played_at"],
    defaults: { last_hand_number: "0" },
  },
  player_tournaments: {
    columns: {
      player_id: "TEXT",
      tournament_id: "TEXT",
      last_table_id: "TEXT",
      last_hand_number: "INTEGER",
      last_played_at: "TEXT",
    },
    primaryKey: ["player_id", "tournament_id"],
    notNull: [
      "player_id",
      "tournament_id",
      "last_table_id",
      "last_hand_number",
      "last_played_at",
    ],
    defaults: { last_hand_number: "0" },
  },
};
