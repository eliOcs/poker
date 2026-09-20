import { randomInt } from "node:crypto";
import LEARN_RANGES from "./learn-ranges.json" with { type: "json" };
import {
  explainLearnHand,
  OPPONENT_RANGE_NOTES,
  LEARN_RANGE_NOTES,
} from "./learn-explanations.js";
import { describePlayability } from "./learn-playability.js";
import { conditionLearnRange } from "./learn-opponent-range.js";
import { HttpError } from "./http-error.js";
import { learnSituation, LEARN_SITUATION_KEYS } from "./learn-situations.js";

/**
 * @typedef {import('./learn-types.js').HandClass} HandClass
 * @typedef {import('./learn-types.js').LearnRange} LearnRange
 * @typedef {import('./learn-types.js').RangeKey} RangeKey
 * @typedef {import('./learn-types.js').SituationKey} SituationKey
 * @typedef {import('./learn-types.js').LearnSituation} LearnSituation
 * @typedef {import('./poker/deck.js').Card} Card
 */

/** @type {import('./learn-types.js').Position[]} */
const POSITIONS = ["LJ", "HJ", "CO", "BTN", "SB", "BB"];
// Keep the reference chart keys internally; use familiar table labels for learners.
const POSITION_LABELS = {
  LJ: "UTG",
  HJ: "UTG+1",
  CO: "CO",
  BTN: "BTN",
  SB: "SB",
  BB: "BB",
};
// JSON imports widen action literals to string; narrow them at the data boundary.
const ranges = /** @type {Record<RangeKey, LearnRange>} */ (
  Object.fromEntries(
    Object.entries(LEARN_RANGES).map(([key, range]) => {
      const actions = range.actions.map((action) => {
        if (
          action === "fold" ||
          action === "call" ||
          action === "check" ||
          action === "raise"
        )
          return action;
        throw new Error(`Invalid learning action in ${key}: ${action}`);
      });
      const typedRange = /** @satisfies {LearnRange} */ ({ ...range, actions });
      return [key, typedRange];
    }),
  )
);

/**
 * Weight the displayed chart by combinations and the action that reached it.
 * @param {LearnRange} range
 * @param {LearnSituation} situation
 * @returns {import('./learn-types.js').Frequencies}
 */
function rangeTotals(range, situation) {
  const previousRange =
    situation.opponent && situation.lastAction
      ? ranges[
          situation.previousRangeKey ??
            /** @type {RangeKey} */ (situation.position)
        ]
      : undefined;
  const previousAction = previousRange
    ? previousRange.actions.indexOf(
        /** @type {import("./learn-types.js").LearnAction} */ (
          situation.lastAction
        ),
      )
    : 0;
  const totals = range.actions.map((_, index) => ({ index, total: 0 }));
  let weightTotal = 0;
  for (const [
    hand,
    frequencies,
  ] of /** @type {[HandClass, import("./learn-types.js").Frequencies][]} */ (
    Object.entries(range.hands)
  )) {
    const combinations = hand.length === 2 ? 6 : hand.endsWith("s") ? 4 : 12;
    const weight =
      combinations *
      (previousRange
        ? /** @type {number} */ (
            /** @type {number[]} */ (previousRange.hands[hand])[previousAction]
          )
        : 100);
    weightTotal += weight;
    totals.forEach((action) => {
      action.total +=
        /** @type {number} */ (frequencies[action.index]) * weight;
    });
  }
  const percentages = totals.map(({ total }) => {
    const percent = total / weightTotal;
    return { rounded: Math.floor(percent), fraction: percent % 1 };
  });
  // Give leftover percentage points to the largest fractions so the total is 100%.
  const remaining = 100 - percentages.reduce((sum, n) => sum + n.rounded, 0);
  const order = percentages.toSorted((a, b) => b.fraction - a.fraction);
  for (const action of order.slice(0, remaining)) action.rounded++;
  return percentages.map(({ rounded }) => rounded);
}

/** @returns {import("./learn-types.js").LearnScenario} */
export function createLearnScenario() {
  const keys = LEARN_SITUATION_KEYS;
  const key = /** @type {SituationKey} */ (keys[randomInt(keys.length)]);
  const situation = learnSituation(key);
  const { position } = situation;
  const range = ranges[key];
  const hands = Object.keys(range.hands);
  const hand = /** @type {HandClass} */ (hands[randomInt(hands.length)]);
  /** @type {import("./poker/deck.js").Suit[]} */
  const suits = ["s", "h", "d", "c"];
  const first = randomInt(4);
  const second = hand.endsWith("s") ? first : (first + 1 + randomInt(3)) % 4;
  const firstSuit = /** @type {import("./poker/deck.js").Suit} */ (
    suits[first]
  );
  const secondSuit = /** @type {import("./poker/deck.js").Suit} */ (
    suits[second]
  );
  const hero = POSITIONS.indexOf(position);
  return {
    id: `${key}-${hand}`,
    position,
    actions: range.actions,
    hand,
    title: situation.title,
    history:
      position === "LJ" && !situation.opponent
        ? "You are first to act."
        : situation.history,
    currentBet: situation.currentBet * 500,
    minRaiseTo: situation.minRaiseTo * 500,
    blinds: { small: 250, big: 500 },
    seats: POSITIONS.map((name, i) => {
      const folded = hasFolded(name, i, hero, situation);
      const bet = (situation.bets[name] ?? 0) * 500;
      return {
        empty: false,
        allIn: false,
        sittingOut: false,
        disconnected: false,
        player: {
          name: `${i === hero ? "You · " : ""}${POSITION_LABELS[name]}`,
        },
        isCurrentPlayer: i === hero,
        isActing: i === hero,
        folded,
        lastAction: folded
          ? "fold"
          : i === hero
            ? situation.lastAction
            : name === situation.opponent
              ? situation.opponentAction === "Limp"
                ? "call"
                : "raise"
              : undefined,
        stack: 50000 - bet,
        bet,
        cards:
          i === hero
            ? [
                /** @type {Card} */ (`${hand.charAt(0)}${firstSuit}`),
                /** @type {Card} */ (`${hand.charAt(1)}${secondSuit}`),
              ]
            : folded
              ? []
              : ["??", "??"],
      };
    }),
  };
}

/**
 * @param {import('./learn-types.js').Position} position
 * @param {number} index
 * @param {number} hero
 * @param {LearnSituation} situation
 */
function hasFolded(position, index, hero, situation) {
  if (situation.opponentAction === "Open") {
    return index < hero && position !== situation.opponent;
  }
  return situation.opponent
    ? position !== situation.position && position !== situation.opponent
    : index < hero;
}

/** @returns {never} */
function invalidStrategy() {
  throw new HttpError(400, "Invalid learning strategy");
}

/** @param {unknown} id */
function parseScenario(id) {
  if (typeof id !== "string") {
    invalidStrategy();
  }
  const [rawKey = "", rawHand = "", extra] = id.split("-");
  if (
    extra !== undefined ||
    !LEARN_SITUATION_KEYS.some((key) => key === rawKey)
  ) {
    invalidStrategy();
  }
  const key = /** @type {SituationKey} */ (rawKey);
  const range = ranges[key];
  if (!Object.hasOwn(range.hands, rawHand)) {
    invalidStrategy();
  }
  const hand = /** @type {HandClass} */ (rawHand);
  const expected = range.hands[hand];
  if (!expected) {
    invalidStrategy();
  }
  return { key, situation: learnSituation(key), hand, range, expected };
}

/** @param {unknown} n @returns {n is number} */
function validFrequency(n) {
  return typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 100;
}

/**
 * @param {unknown} frequencies
 * @param {number} count
 * @returns {asserts frequencies is import('./learn-types.js').Frequencies}
 */
function validateFrequencies(frequencies, count) {
  if (
    !Array.isArray(frequencies) ||
    frequencies.length !== count ||
    !frequencies.every(validFrequency)
  ) {
    invalidStrategy();
  }
  if (frequencies.reduce((sum, n) => sum + n, 0) !== 100) {
    invalidStrategy();
  }
}

/**
 * @param {unknown} raiseTo
 * @param {import('./learn-types.js').BigBlinds} minimum
 * @returns {asserts raiseTo is import('./learn-types.js').BigBlinds}
 */
function validateRaiseTo(raiseTo, minimum) {
  if (
    typeof raiseTo !== "number" ||
    !Number.isFinite(raiseTo) ||
    raiseTo < minimum ||
    raiseTo > 100
  )
    invalidStrategy();
}

/**
 * Validate the submitted strategy at the HTTP boundary, then grade its distribution.
 * @param {unknown} input
 * @returns {import('./learn-types.js').LearnEvaluation}
 */
export function evaluateLearnStrategy(input) {
  if (!input || typeof input !== "object") {
    invalidStrategy();
  }
  const { id, frequencies, raiseTo } = /** @type {Record<string, unknown>} */ (
    input
  );
  const { key, situation, hand, range, expected } = parseScenario(id);
  validateFrequencies(frequencies, range.actions.length);
  const raising = (frequencies[range.actions.indexOf("raise")] ?? 0) > 0;
  if (raising) validateRaiseTo(raiseTo, situation.minRaiseTo);
  const actionsMatch = expected.every(
    (n, i) =>
      (n < 10 || (frequencies[i] ?? 0) > 0) && (n > 0 || frequencies[i] === 0),
  );
  const frequencyMatch = expected.every(
    (n, i) => Math.abs(n - /** @type {number} */ (frequencies[i])) <= 15,
  );
  const sizingDifference = raising
    ? /** @type {number} */ (raiseTo) - range.raiseTo
    : 0;
  const sizingMatch = raising ? Math.abs(sizingDifference) < 0.01 : undefined;
  const distributionMatch = expected.every((n, i) => n === frequencies[i]);
  return {
    actions: range.actions,
    expected,
    distributionMatch,
    grade: strategyGrade(
      actionsMatch,
      frequencyMatch,
      distributionMatch,
      sizingMatch,
      sizingDifference,
    ),
    actionsMatch,
    frequencyMatch,
    sizingMatch,
    raiseTo: range.raiseTo,
    playability: describePlayability(
      hand,
      range.raiseTo,
      situation,
      expected,
      range.actions,
    ),
    explanationTitle: situation.explanationTitle,
    explanation: explainLearnHand(hand, situation, expected, range.actions),
    lessonNotes:
      /** @type {Partial<Record<RangeKey, import("./learn-types.js").LearnNote[]>>} */ (
        LEARN_RANGE_NOTES
      )[key],
    page: range.page,
    chart: range.chart,
    hands: range.hands,
    rangeTotals: rangeTotals(range, situation),
    opponentRange: opponentRange(situation, hand),
  };
}

/**
 * @param {LearnSituation} situation
 * @param {HandClass} heroHand
 * @returns {import('./learn-types.js').OpponentRange | undefined}
 */
function opponentRange(situation, heroHand) {
  if (!situation.opponent) return undefined;
  const facing = situation.lastAction === "call" ? "LIMP" : "OPEN";
  const key =
    situation.opponentRangeKey ??
    /** @type {RangeKey} */ (
      `${situation.opponent}_VS_${situation.position}_${facing}`
    );
  const range = ranges[key];
  return {
    page: range.page,
    chart: range.chart,
    ...conditionLearnRange(
      range,
      situation.opponentRangeAction ?? "raise",
      heroHand,
      opponentOpeningRange(situation),
      situation.opponentPriorAction ?? "raise",
    ),
    position: situation.opponent,
    action: situation.opponentAction ?? (facing === "LIMP" ? "Raise" : "3-bet"),
    raiseTo: situation.currentBet,
    ...(situation.opponentPriorAction === "call"
      ? { openingAction: "Limp" }
      : {}),
    notes: OPPONENT_RANGE_NOTES[key],
  };
}

/** @param {LearnSituation} situation @returns {LearnRange | undefined} */
function opponentOpeningRange(situation) {
  if (situation.opponentAction === "4-bet" || situation.opponentPriorAction)
    return ranges[/** @type {RangeKey} */ (situation.opponent)];
  return undefined;
}

/**
 * @param {boolean} actionsMatch
 * @param {boolean} frequencyMatch
 * @param {boolean} distributionMatch
 * @param {boolean | undefined} sizingMatch
 * @param {import('./learn-types.js').BigBlinds} sizingDifference
 * @returns {import('./learn-types.js').StrategyGrade}
 */
function strategyGrade(
  actionsMatch,
  frequencyMatch,
  distributionMatch,
  sizingMatch,
  sizingDifference,
) {
  // Teaching tolerance, not a claim that nearby sizes have equal EV.
  if (
    (sizingMatch === false && Math.abs(sizingDifference) > 1) ||
    !actionsMatch ||
    !frequencyMatch
  )
    return "incorrect";
  return distributionMatch && sizingMatch !== false ? "correct" : "close";
}
