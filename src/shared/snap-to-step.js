/**
 * @typedef {object} StepRange
 * @property {number} min
 * @property {number} max
 * @property {number} step
 */

/**
 * Snaps a value to the nearest one allowed in a range: the bounds themselves,
 * or a multiple of the step between them. Bets use this with the table's
 * smallest chip. The bounds stay allowed even when they are not multiples,
 * so a player can still make the minimum raise or move an odd stack all in.
 * @param {number} value
 * @param {StepRange} range
 * @returns {number}
 */
export function snapToStep(value, { min, max, step }) {
  if (value <= min) return min;
  if (value >= max) return max;
  const multiple = Math.floor(value / step) * step;
  const below = Math.max(multiple, min);
  const above = Math.min(multiple + step, max);
  return value - below < above - value ? below : above;
}
