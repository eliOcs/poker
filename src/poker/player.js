import { randomBytes } from "crypto";

/**
 * @typedef {import('./seat.js').Player} Player
 */

/**
 * Creates a new player with a unique ID
 * @returns {Player}
 */
export function create() {
  return { id: randomBytes(16).toString("hex") };
}
