/**
 * Generates gradual tournament blind structures from the expected chip pool.
 *
 * The model follows common PokerChipForum guidance for home tournaments:
 * - blind growth is geometric, so percentage increases stay broadly consistent;
 * - the requested duration is the estimated finish point, not the last level;
 * - rebuys and add-ons contribute to the expected chip pool;
 * - the finish is estimated when about 20 big blinds remain in play;
 * - optional antes start after four levels and reduce the finishing blinds.
 *
 * @typedef {number} Cents
 */

const RUNOUT_LEVELS = 3;
const ANTE_FREE_LEVELS = 4;
const BIG_BLINDS_IN_PLAY_AT_FINISH = 20;
const EXPECTED_PLAYERS_AT_FINISH = 6;
const ANTE_SMALL_BLIND_RATIO = 1 / 4;

/**
 * Conventional blind values within each power of ten. Quarter values keep
 * slower structures gradual while the wider upper steps avoid awkward blinds.
 */
const NICE_MANTISSAS = [1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5, 6, 8, 10];

/**
 * @typedef {object} BlindStructureOptions
 * @property {number} playerCount
 * @property {Cents} startingStack
 * @property {number} [tournamentDurationMinutes]
 * @property {number} levelDurationMinutes
 * @property {Cents} smallestChip
 * @property {Cents} [startingSmallBlind]
 * @property {number} [expectedRebuys]
 * @property {Cents} [rebuyStack]
 * @property {number} [expectedAddOns]
 * @property {Cents} [addOnStack]
 * @property {boolean} [antes]
 * @property {number} [targetAverageGrowth] - Desired average increase per level (for example 0.4 for 40%)
 */

/**
 * @typedef {BlindStructureOptions & {
 *   startingSmallBlind: Cents,
 *   expectedRebuys: number,
 *   rebuyStack: Cents,
 *   expectedAddOns: number,
 *   addOnStack: Cents,
 *   antes: boolean
 * }} ResolvedBlindStructureOptions
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
function requireNonNegativeNumber(name, value) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative number`);
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
 * @param {ResolvedBlindStructureOptions} options
 */
function validateOptions(options) {
  requirePositiveSafeInteger("playerCount", options.playerCount);
  requirePositiveSafeInteger("startingStack", options.startingStack);
  if (options.targetAverageGrowth === undefined) {
    requirePositiveNumber(
      "tournamentDurationMinutes",
      /** @type {number} */ (options.tournamentDurationMinutes),
    );
  } else {
    requirePositiveNumber("targetAverageGrowth", options.targetAverageGrowth);
  }
  requirePositiveNumber("levelDurationMinutes", options.levelDurationMinutes);
  requirePositiveSafeInteger("smallestChip", options.smallestChip);
  requirePositiveSafeInteger("startingSmallBlind", options.startingSmallBlind);
  requireNonNegativeNumber("expectedRebuys", options.expectedRebuys);
  requireNonNegativeNumber("expectedAddOns", options.expectedAddOns);
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
 * @returns {ResolvedBlindStructureOptions}
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
 * @param {ResolvedBlindStructureOptions} options
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
  const bigBlindPressure = BIG_BLINDS_IN_PLAY_AT_FINISH * 2;
  return bigBlindPressure + BIG_BLINDS_IN_PLAY_AT_FINISH * antePressure;
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
 * @param {ResolvedBlindStructureOptions} options
 * @param {number} growthFactor
 * @returns {CalculatedBlindLevel}
 */
function calculateLevel(index, previousSmall, options, growthFactor) {
  const rawSmall = options.startingSmallBlind * growthFactor ** index;
  const small =
    index === 0
      ? options.startingSmallBlind
      : roundBlind(rawSmall, options.smallestChip, previousSmall);

  const big = small * 2;
  requirePositiveSafeInteger("big blind", big);

  return {
    level: index + 1,
    small,
    big,
    ante: calculateAnte(options.antes, index, small, options.smallestChip),
    startsAtMinutes: index * options.levelDurationMinutes,
  };
}

/**
 * Builds a structure whose unrounded blinds grow by the requested percentage,
 * stopping at the first conventionally rounded level that reaches the
 * 20-big-blind finish estimate.
 * @param {ResolvedBlindStructureOptions & { targetAverageGrowth: number }} options
 * @param {Cents} totalChips
 * @returns {{ targetLevel: number, levels: CalculatedBlindLevel[] }}
 */
function calculateGrowthTargetStructure(options, totalChips) {
  const growthFactor = 1 + options.targetAverageGrowth;
  const targetBigBlind = totalChips / BIG_BLINDS_IN_PLAY_AT_FINISH;
  /** @type {CalculatedBlindLevel[]} */
  const levels = [];
  let targetLevel;

  for (let index = 0; index < 100; index += 1) {
    const previousSmall = levels[index - 1]?.small ?? 0;
    const level = calculateLevel(index, previousSmall, options, growthFactor);
    levels.push(level);

    if (targetLevel === undefined && index > 0 && level.big >= targetBigBlind) {
      targetLevel = level.level;
    }
    if (
      targetLevel !== undefined &&
      levels.length >= targetLevel + RUNOUT_LEVELS
    ) {
      return { targetLevel, levels };
    }
  }

  throw new RangeError("blind structure exceeds the supported level count");
}

/**
 * @param {BlindStructureOptions} options
 * @returns {BlindStructure}
 */
export function calculateBlindStructure(options) {
  const resolvedOptions = withDefaults(options);
  validateOptions(resolvedOptions);
  const totalChips = calculateTotalChips(resolvedOptions);

  if (resolvedOptions.targetAverageGrowth !== undefined) {
    return {
      totalChips,
      ...calculateGrowthTargetStructure(
        /** @type {ResolvedBlindStructureOptions & { targetAverageGrowth: number }} */ (
          resolvedOptions
        ),
        totalChips,
      ),
    };
  }

  const targetIntervals = Math.ceil(
    /** @type {number} */ (resolvedOptions.tournamentDurationMinutes) /
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
