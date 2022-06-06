/**
 * @typedef {object} Seat
 * @property {boolean} empty
 */

/**
 * @returns {Seat} empty seat
 */
export function empty() {
  return { empty: true };
}
