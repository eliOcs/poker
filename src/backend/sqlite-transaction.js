/**
 * @template T
 * @param {import("node:sqlite").DatabaseSync|undefined} database
 * @param {() => T} callback
 * @returns {T}
 */
export function runInTransaction(database, callback) {
  if (!database) throw new Error("Store not initialized");
  if (database.isTransaction) return callback();

  database.exec("BEGIN IMMEDIATE");
  try {
    const result = callback();
    database.exec("COMMIT");
    return result;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}
