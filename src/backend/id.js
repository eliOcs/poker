import { randomBytes } from "crypto";

/**
 * Unique identifier type for games and players.
 * Time-sortable: IDs created later sort after earlier ones.
 *
 * @typedef {string} Id
 */

/**
 * Generates a unique, time-sortable ID.
 * Format: base36 timestamp (8 chars) + random suffix (4 chars)
 * Example: "lz1abc12x9k2"
 * @returns {Id}
 */
export function generate() {
  const timestamp = Date.now().toString(36).padStart(8, "0");
  const random = randomBytes(2).toString("hex");
  return timestamp + random;
}
