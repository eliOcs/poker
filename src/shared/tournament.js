/**
 * Tournament configuration for Sit & Go tournaments
 * @typedef {import('../backend/poker/types.js').Cents} Cents
 */

/**
 * @typedef {object} BlindLevel
 * @property {number} level - Level number (1-7)
 * @property {Cents} small - Small blind amount
 * @property {Cents} big - Big blind amount
 * @property {Cents} ante - Ante amount
 */

/** @type {BlindLevel[]} */
export const BLIND_LEVELS = [
  { level: 1, small: 2500, big: 5000, ante: 0 },
  { level: 2, small: 5000, big: 10000, ante: 0 },
  { level: 3, small: 10000, big: 20000, ante: 0 },
  { level: 4, small: 15000, big: 30000, ante: 0 },
  // Break after level 4
  { level: 5, small: 20000, big: 40000, ante: 0 },
  { level: 6, small: 30000, big: 60000, ante: 0 },
  { level: 7, small: 50000, big: 100000, ante: 0 },
];

/** Level duration in ticks (seconds) - 15 minutes */
export const LEVEL_DURATION_TICKS = 15 * 60;

/** Break duration in ticks (seconds) - 5 minutes */
export const BREAK_DURATION_TICKS = 5 * 60;

/** Break occurs after this level */
export const BREAK_AFTER_LEVEL = 4;

/** @type {Cents} Starting stack for tournament players */
export const INITIAL_STACK = 500000;

/** Default number of seats for Sit & Go */
export const DEFAULT_SEATS = 6;

/**
 * Get blinds for a specific level
 * @param {number} level - Level number (1-7)
 * @returns {BlindLevel}
 */
export function getBlindsForLevel(level) {
  const found = BLIND_LEVELS.find((l) => l.level === level);
  return found || BLIND_LEVELS[BLIND_LEVELS.length - 1];
}

/**
 * Get the maximum level number
 * @returns {number}
 */
export function getMaxLevel() {
  return BLIND_LEVELS.length;
}
