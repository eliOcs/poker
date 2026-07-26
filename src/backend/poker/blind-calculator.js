/**
 * Generates gradual tournament blind structures from the expected chip pool.
 *
 * The model follows the useful parts of PokerSoup's calculator:
 * - blind growth is geometric, so percentage increases stay broadly consistent;
 * - the requested duration is the estimated finish point, not the last level;
 * - rebuys and add-ons contribute to the expected chip pool;
 * - antes start after four levels and reduce the blinds needed at the finish.
 *
 * @typedef {import('./types.js').Cents} Cents
 */

const RUNOUT_LEVELS = 3;
const ANTE_FREE_LEVELS = 4;
const CHIPS_TO_FORCED_BETS_AT_FINISH = 8;
const EXPECTED_PLAYERS_AT_FINISH = 6;
const ANTE_SMALL_BLIND_RATIO = 1 / 4;
const BLINDS_PER_ORBIT_IN_SMALL_BLINDS = 3;

/**
 * Conventional blind values within each power of ten. Quarter values keep
 * slower structures gradual while the wider upper steps avoid awkward blinds.
 */
const NICE_MANTISSAS = [1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5, 6, 8, 10];

/**
 * @typedef {object} BlindStructureOptions
 * @property {number} playerCount
 * @property {Cents} startingStack
 * @property {number} tournamentDurationMinutes
 * @property {number} levelDurationMinutes
 * @property {Cents} smallestChip
 * @property {Cents} [startingSmallBlind]
 * @property {number} [expectedRebuys]
 * @property {Cents} [rebuyStack]
 * @property {number} [expectedAddOns]
 * @property {Cents} [addOnStack]
 * @property {boolean} [antes]
 */

/**
 * @typedef {object} CalculatedBlindLevel
 * @property {number} level
 * @property {Cents} small
 * @property {Cents} big
 * @property {Cents} ante
 * @property {number} startsAtMinutes
 */

/**
 * @typedef {object} BlindStructure
 * @property {Cents} totalChips
 * @property {number} targetLevel - Level beginning at or just after the target duration
 * @property {CalculatedBlindLevel[]} levels
 */

/**
 * @param {string} name
 * @param {number} value
 */
function requirePositiveSafeInteger(name, value) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive safe integer`);
  }
}

/**
 * @param {string} name
 * @param {number} value
 */
function requireNonNegativeSafeInteger(name, value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative safe integer`);
  }
}

/**
 * @param {string} name
 * @param {number} value
 */
function requirePositiveNumber(name, value) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive number`);
  }
}

/**
 * @param {string} name
 * @param {number} expectedCount
 * @param {Cents} stack
 */
function requireStackWhenExpected(name, expectedCount, stack) {
  if (expectedCount > 0) requirePositiveSafeInteger(name, stack);
}

/**
 * @param {Required<BlindStructureOptions>} options
 */
function validateOptions(options) {
  requirePositiveSafeInteger("playerCount", options.playerCount);
  requirePositiveSafeInteger("startingStack", options.startingStack);
  requirePositiveNumber(
    "tournamentDurationMinutes",
    options.tournamentDurationMinutes,
  );
  requirePositiveNumber("levelDurationMinutes", options.levelDurationMinutes);
  requirePositiveSafeInteger("smallestChip", options.smallestChip);
  requirePositiveSafeInteger("startingSmallBlind", options.startingSmallBlind);
  requireNonNegativeSafeInteger("expectedRebuys", options.expectedRebuys);
  requireNonNegativeSafeInteger("expectedAddOns", options.expectedAddOns);
  requireStackWhenExpected(
    "rebuyStack",
    options.expectedRebuys,
    options.rebuyStack,
  );
  requireStackWhenExpected(
    "addOnStack",
    options.expectedAddOns,
    options.addOnStack,
  );

  if (options.startingSmallBlind % options.smallestChip !== 0) {
    throw new RangeError(
      "startingSmallBlind must be divisible by smallestChip",
    );
  }
}

/**
 * @param {BlindStructureOptions} options
 * @returns {Required<BlindStructureOptions>}
 */
function withDefaults(options) {
  return {
    ...options,
    startingSmallBlind: options.startingSmallBlind ?? options.smallestChip,
    expectedRebuys: options.expectedRebuys ?? 0,
    rebuyStack: options.rebuyStack ?? options.startingStack,
    expectedAddOns: options.expectedAddOns ?? 0,
    addOnStack: options.addOnStack ?? options.startingStack,
    antes: options.antes ?? false,
  };
}

/**
 * Produces playable candidates near an unrounded amount.
 * @param {Cents} amount
 * @param {Cents} smallestChip
 * @returns {Cents[]}
 */
function blindCandidates(amount, smallestChip) {
  const minimumExponent = Math.floor(Math.log10(smallestChip)) - 1;
  const maximumExponent = Math.floor(Math.log10(amount)) + 1;
  const candidates = new Set([smallestChip]);

  for (
    let exponent = minimumExponent;
    exponent <= maximumExponent;
    exponent += 1
  ) {
    const scale = 10 ** exponent;
    for (const mantissa of NICE_MANTISSAS) {
      const candidate =
        Math.round((mantissa * scale) / smallestChip) * smallestChip;
      if (candidate >= smallestChip && Number.isSafeInteger(candidate)) {
        candidates.add(candidate);
      }
    }
  }

  return [...candidates].sort((left, right) => left - right);
}

/**
 * Rounds to the closest conventional blind value. Logarithmic distance makes
 * rounding symmetric by percentage rather than by absolute chip difference.
 * @param {number} amount
 * @param {Cents} smallestChip
 * @param {Cents} [greaterThan]
 * @returns {Cents}
 */
function roundBlind(amount, smallestChip, greaterThan = 0) {
  const candidateRange = Math.max(amount, greaterThan + smallestChip);
  const candidates = blindCandidates(candidateRange, smallestChip).filter(
    (candidate) => candidate > greaterThan,
  );

  const closest = candidates.reduce((best, candidate) => {
    const distance = Math.abs(Math.log(candidate / amount));
    const bestDistance = Math.abs(Math.log(best / amount));
    return distance < bestDistance ? candidate : best;
  });

  return closest;
}

/**
 * @param {Required<BlindStructureOptions>} options
 * @returns {Cents}
 */
function calculateTotalChips(options) {
  const totalChips =
    options.playerCount * options.startingStack +
    options.expectedRebuys * options.rebuyStack +
    options.expectedAddOns * options.addOnStack;
  requirePositiveSafeInteger("totalChips", totalChips);
  return totalChips;
}

/**
 * @param {boolean} antes
 * @returns {number}
 */
function calculateFinishPressure(antes) {
  const antePressure = antes
    ? EXPECTED_PLAYERS_AT_FINISH * ANTE_SMALL_BLIND_RATIO
    : 0;
  return (
    CHIPS_TO_FORCED_BETS_AT_FINISH *
    (BLINDS_PER_ORBIT_IN_SMALL_BLINDS + antePressure)
  );
}

/**
 * @param {boolean} antes
 * @param {number} index
 * @param {Cents} small
 * @param {Cents} smallestChip
 * @returns {Cents}
 */
function calculateAnte(antes, index, small, smallestChip) {
  if (!antes || index < ANTE_FREE_LEVELS) return 0;
  return roundBlind(small * ANTE_SMALL_BLIND_RATIO, smallestChip);
}

/**
 * @param {number} index
 * @param {Cents} previousSmall
 * @param {Required<BlindStructureOptions>} options
 * @param {number} growthFactor
 * @returns {CalculatedBlindLevel}
 */
function calculateLevel(index, previousSmall, options, growthFactor) {
  const rawSmall = options.startingSmallBlind * growthFactor ** index;
  const small =
    index === 0
      ? options.startingSmallBlind
      : roundBlind(rawSmall, options.smallestChip, previousSmall);

  return {
    level: index + 1,
    small,
    big: small * 2,
    ante: calculateAnte(options.antes, index, small, options.smallestChip),
    startsAtMinutes: index * options.levelDurationMinutes,
  };
}

/**
 * @param {BlindStructureOptions} options
 * @returns {BlindStructure}
 */
export function calculateBlindStructure(options) {
  const resolvedOptions = withDefaults(options);
  validateOptions(resolvedOptions);
  const totalChips = calculateTotalChips(resolvedOptions);

  const targetIntervals = Math.ceil(
    resolvedOptions.tournamentDurationMinutes /
      resolvedOptions.levelDurationMinutes,
  );
  const targetLevel = targetIntervals + 1;
  const targetSmallBlind = Math.max(
    resolvedOptions.startingSmallBlind * 2,
    totalChips / calculateFinishPressure(resolvedOptions.antes),
  );
  const growthFactor =
    (targetSmallBlind / resolvedOptions.startingSmallBlind) **
    (1 / targetIntervals);

  /** @type {CalculatedBlindLevel[]} */
  const levels = [];
  const levelCount = targetLevel + RUNOUT_LEVELS;

  for (let index = 0; index < levelCount; index += 1) {
    const previousSmall = levels[index - 1]?.small ?? 0;
    levels.push(
      calculateLevel(index, previousSmall, resolvedOptions, growthFactor),
    );
  }

  return { totalChips, targetLevel, levels };
}
