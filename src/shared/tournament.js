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

/**
 * @typedef {object} BuyInPreset
 * @property {string} label - Display label (e.g., "$5")
 * @property {Cents} amount - Buy-in amount in cents
 */

/** @type {BuyInPreset[]} */
export const BUYIN_PRESETS = [
  { label: "$2", amount: 200 },
  { label: "$5", amount: 500 },
  { label: "$10", amount: 1000 },
  { label: "$20", amount: 2000 },
  { label: "$50", amount: 5000 },
  { label: "$100", amount: 10000 },
  { label: "$200", amount: 20000 },
  { label: "$500", amount: 50000 },
  { label: "$1000", amount: 100000 },
  { label: "$2000", amount: 200000 },
];

/** @type {BuyInPreset} */
export const DEFAULT_BUYIN = BUYIN_PRESETS[1]; // $5

/**
 * Validates that a buy-in amount matches a preset
 * @param {number} amount - Amount in cents
 * @returns {boolean}
 */
export function isValidBuyin(amount) {
  return BUYIN_PRESETS.some((p) => p.amount === amount);
}

/**
 * @typedef {object} Prize
 * @property {number} position - Finishing position (1-based)
 * @property {Cents} amount - Prize amount in cents
 */

/**
 * Calculates prize distribution based on player count and buy-in
 * @param {number} playerCount - Number of players
 * @param {Cents} buyinAmount - Buy-in amount per player in cents
 * @returns {Prize[]}
 */
export function calculatePrizes(playerCount, buyinAmount) {
  const pool = playerCount * buyinAmount;

  if (playerCount <= 1) {
    return [];
  }

  if (playerCount <= 4) {
    return [{ position: 1, amount: pool }];
  }

  if (playerCount <= 7) {
    return [
      { position: 1, amount: Math.round(pool * 0.8) },
      { position: 2, amount: Math.round(pool * 0.2) },
    ];
  }

  // 8-9 players
  return [
    { position: 1, amount: Math.round(pool * 0.7) },
    { position: 2, amount: Math.round(pool * 0.2) },
    { position: 3, amount: Math.round(pool * 0.1) },
  ];
}
