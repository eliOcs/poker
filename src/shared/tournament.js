/**
 * Tournament configuration for Sit & Go tournaments
 * @typedef {import('../backend/poker/types.js').Cents} Cents
 */

/**
 * @typedef {object} BlindLevel
 * @property {number} level - Level number (1-12)
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
  { level: 8, small: 75000, big: 150000, ante: 0 },
  // Break after level 8
  { level: 9, small: 100000, big: 200000, ante: 0 },
  { level: 10, small: 150000, big: 300000, ante: 0 },
  { level: 11, small: 200000, big: 400000, ante: 0 },
  { level: 12, small: 300000, big: 600000, ante: 0 },
];

/** Level duration in ticks (seconds) - 20 minutes */
export const LEVEL_DURATION_TICKS = 20 * 60;

/** Sit & Go level duration in ticks (seconds) - 15 minutes */
export const SITNGO_LEVEL_DURATION_TICKS = 15 * 60;

/** Break duration in ticks (seconds) - 5 minutes */
export const BREAK_DURATION_TICKS = 5 * 60;

/** Number of playing levels between breaks */
export const BREAK_INTERVAL_LEVELS = 4;

/** Break levels, excluding the final level because no play follows it */
export const BREAK_AFTER_LEVELS = BLIND_LEVELS.filter(
  ({ level }) =>
    level % BREAK_INTERVAL_LEVELS === 0 && level < BLIND_LEVELS.length,
).map(({ level }) => level);

/** Default playing time represented by the static tournament structure */
export const DEFAULT_TOURNAMENT_DURATION_MINUTES =
  (BLIND_LEVELS.length * LEVEL_DURATION_TICKS) / 60;

/**
 * @typedef {object} TournamentSchedule
 * @property {BlindLevel[]} blindLevels
 * @property {number} levelDurationTicks
 * @property {number[]} breakAfterLevels
 * @property {number} breakDurationTicks
 * @property {number} durationMinutes
 */

/**
 * Copies a schedule so each tournament owns its mutable arrays and level data.
 * @param {TournamentSchedule} schedule
 * @returns {TournamentSchedule}
 */
export function copyTournamentSchedule(schedule) {
  return {
    blindLevels: schedule.blindLevels.map((level) => ({ ...level })),
    levelDurationTicks: schedule.levelDurationTicks,
    breakAfterLevels: [...schedule.breakAfterLevels],
    breakDurationTicks: schedule.breakDurationTicks,
    durationMinutes: schedule.durationMinutes,
  };
}

/**
 * Creates the default schedule used by MTTs until they support length presets.
 * @returns {TournamentSchedule}
 */
export function createDefaultTournamentSchedule() {
  return copyTournamentSchedule({
    blindLevels: BLIND_LEVELS,
    levelDurationTicks: LEVEL_DURATION_TICKS,
    breakAfterLevels: BREAK_AFTER_LEVELS,
    breakDurationTicks: BREAK_DURATION_TICKS,
    durationMinutes: DEFAULT_TOURNAMENT_DURATION_MINUTES,
  });
}

/** @type {Cents} Starting stack for tournament players */
export const INITIAL_STACK = 500000;

/** Default number of seats for Sit & Go */
export const DEFAULT_SEATS = 6;

/** @typedef {{ label: string, minutes: number }} SitAndGoLengthPreset */

/** @type {SitAndGoLengthPreset[]} */
export const SITNGO_LENGTH_PRESETS = [
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
  { label: "3 hours", minutes: 180 },
];

/** @type {SitAndGoLengthPreset} */
export const DEFAULT_SITNGO_LENGTH = /** @type {SitAndGoLengthPreset} */ (
  SITNGO_LENGTH_PRESETS[1]
);

/**
 * @param {number} minutes
 * @returns {boolean}
 */
export function isValidSitAndGoLength(minutes) {
  return SITNGO_LENGTH_PRESETS.some((preset) => preset.minutes === minutes);
}

/**
 * @param {number} levelCount
 * @returns {number[]}
 */
export function getBreaksForLevelCount(levelCount) {
  return Array.from(
    { length: Math.floor((levelCount - 1) / BREAK_INTERVAL_LEVELS) },
    (_, index) => (index + 1) * BREAK_INTERVAL_LEVELS,
  );
}

/**
 * Get blinds for a specific level
 * @param {number} level - Level number (1-12)
 * @returns {BlindLevel}
 */
export function getBlindsForLevel(level) {
  const found = BLIND_LEVELS.find((l) => l.level === level);
  return (
    found ?? /** @type {BlindLevel} */ (BLIND_LEVELS[BLIND_LEVELS.length - 1])
  );
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
export const DEFAULT_BUYIN = /** @type {BuyInPreset} */ (BUYIN_PRESETS[1]); // $5

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
 * Prize payout structures indexed by minimum player count.
 * Each entry is [minPlayers, percentages[]].
 * The last matching entry (where playerCount >= minPlayers) is used.
 * @type {Array<[number, number[]]>}
 */
const PAYOUT_TIERS = [
  [2, [1.0]],
  [5, [0.8, 0.2]],
  [8, [0.7, 0.2, 0.1]],
  [13, [0.55, 0.25, 0.12, 0.08]],
  [19, [0.45, 0.25, 0.15, 0.1, 0.05]],
  [28, [0.38, 0.23, 0.14, 0.09, 0.06, 0.04, 0.03, 0.03]],
];

/**
 * Calculates prize distribution based on player count and prize pool.
 * The player count selects the payout tier independently of the pool size.
 * @param {number} playerCount - Number of players
 * @param {Cents} prizePool - Total prize pool in cents
 * @returns {Prize[]}
 */
export function calculatePrizesFromPool(playerCount, prizePool) {
  if (playerCount <= 1) {
    return [];
  }

  let percentages = /** @type {number[]} */ (
    /** @type {*} */ (PAYOUT_TIERS[0])[1]
  );
  for (const [minPlayers, pcts] of PAYOUT_TIERS) {
    if (playerCount >= minPlayers) {
      percentages = pcts;
    }
  }

  return percentages.map((pct, i) => ({
    position: i + 1,
    amount: Math.round(prizePool * pct),
  }));
}

/**
 * Calculates prize distribution based on player count and buy-in.
 * @param {number} playerCount - Number of players
 * @param {Cents} buyinAmount - Buy-in amount per player in cents
 * @returns {Prize[]}
 */
export function calculatePrizes(playerCount, buyinAmount) {
  return calculatePrizesFromPool(playerCount, playerCount * buyinAmount);
}
