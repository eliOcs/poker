import * as Id from "./id.js";

/**
 * @typedef {import('./seat.js').Player} Player
 */

/**
 * Creates a new player with a unique ID
 * @returns {Player}
 */
export function create() {
  return { id: Id.generate(), name: null };
}
