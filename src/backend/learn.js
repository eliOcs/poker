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
/** @type {Record<string, {page: number, chart: number, raiseTo: number, actions: string[], hands: Record<string, number[]>}>} */
const ranges = LEARN_RANGES;

/** Weight the displayed chart by combinations and the action that reached it. */
function rangeTotals(range, situation) {
  const previousHands =
    situation.opponent && situation.lastAction
      ? /** @type {NonNullable<typeof ranges[string]>} */ (
          ranges[situation.previousRangeKey ?? situation.position]
        ).hands
      : undefined;
  const previousAction = situation.lastAction === "call" ? 1 : 2;
  const totals = [0, 1, 2].map((index) => ({ index, total: 0 }));
  let weightTotal = 0;
  for (const [hand, frequencies] of Object.entries(range.hands)) {
    const combinations = hand.length === 2 ? 6 : hand.endsWith("s") ? 4 : 12;
    const weight =
      combinations *
      (previousHands
        ? /** @type {number} */ (
            /** @type {number[]} */ (previousHands[hand])[previousAction]
          )
        : 100);
    weightTotal += weight;
    totals.forEach((action) => {
      action.total += frequencies[action.index] * weight;
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

export function createLearnScenario() {
  const keys = LEARN_SITUATION_KEYS;
  const key = /** @type {string} */ (keys[randomInt(keys.length)]);
  const situation = learnSituation(key);
  const { position } = situation;
  const range = /** @type {NonNullable<typeof ranges[string]>} */ (ranges[key]);
  const hands = Object.keys(range.hands);
  const hand = /** @type {string} */ (hands[randomInt(hands.length)]);
  const suits = ["s", "h", "d", "c"];
  const first = randomInt(4);
  const second = hand.endsWith("s") ? first : (first + 1 + randomInt(3)) % 4;
  const hero = POSITIONS.indexOf(position);
  return {
    id: `${key}-${hand}`,
    position,
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
              ? "raise"
              : undefined,
        stack: 50000 - bet,
        bet,
        cards:
          i === hero
            ? [
                hand.charAt(0) + suits.at(first),
                hand.charAt(1) + suits.at(second),
              ]
            : folded
              ? []
              : ["??", "??"],
      };
    }),
  };
}

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

function parseScenario(id) {
  if (typeof id !== "string") {
    invalidStrategy();
  }
  const [key = "", hand = "", extra] = id.split("-");
  if (extra !== undefined || !LEARN_SITUATION_KEYS.includes(key)) {
    invalidStrategy();
  }
  const range = ranges[key];
  if (!range || !Object.hasOwn(range.hands, hand)) {
    invalidStrategy();
  }
  const expected = range.hands[hand];
  if (!expected) {
    invalidStrategy();
  }
  return { key, situation: learnSituation(key), hand, range, expected };
}

function validFrequency(n) {
  return Number.isInteger(n) && n >= 0 && n <= 100;
}

function validateFrequencies(frequencies) {
  if (
    !Array.isArray(frequencies) ||
    frequencies.length !== 3 ||
    !frequencies.every(validFrequency)
  ) {
    invalidStrategy();
  }
  if (frequencies.reduce((sum, n) => sum + n, 0) !== 100) {
    invalidStrategy();
  }
}

/** Validate the submitted strategy at the HTTP boundary, then grade its distribution. */
export function evaluateLearnStrategy(input) {
  if (!input || typeof input !== "object") {
    invalidStrategy();
  }
  const { id, frequencies, raiseTo } = input;
  const { key, situation, hand, range, expected } = parseScenario(id);
  validateFrequencies(frequencies);
  if (
    frequencies[2] > 0 &&
    (!Number.isFinite(raiseTo) ||
      raiseTo < situation.minRaiseTo ||
      raiseTo > 100)
  ) {
    invalidStrategy();
  }
  const actionsMatch = expected.every(
    (n, i) => (n < 10 || frequencies[i] > 0) && (n > 0 || frequencies[i] === 0),
  );
  const frequencyMatch = expected.every(
    (n, i) => Math.abs(n - frequencies[i]) <= 15,
  );
  const sizingMatch =
    frequencies[2] > 0 ? Math.abs(raiseTo - range.raiseTo) < 0.01 : undefined;
  const distributionMatch = expected.every((n, i) => n === frequencies[i]);
  return {
    expected,
    distributionMatch,
    grade: strategyGrade(
      actionsMatch,
      frequencyMatch,
      distributionMatch,
      sizingMatch,
      raiseTo - range.raiseTo,
    ),
    actionsMatch,
    frequencyMatch,
    sizingMatch,
    raiseTo: range.raiseTo,
    playability: describePlayability(hand, range.raiseTo, situation, expected),
    explanationTitle: situation.explanationTitle,
    explanation: explainLearnHand(hand, situation, expected),
    lessonNotes: LEARN_RANGE_NOTES[key],
    page: range.page,
    chart: range.chart,
    hands: range.hands,
    rangeTotals: rangeTotals(range, situation),
    opponentRange: opponentRange(situation, hand),
  };
}

function opponentRange(situation, heroHand) {
  if (!situation.opponent) return undefined;
  const facing = situation.lastAction === "call" ? "LIMP" : "OPEN";
  const key =
    situation.opponentRangeKey ??
    `${situation.opponent}_VS_${situation.position}_${facing}`;
  const range = /** @type {NonNullable<typeof ranges[string]>} */ (ranges[key]);
  return {
    page: range.page,
    chart: range.chart,
    ...conditionLearnRange(
      range,
      "raise",
      heroHand,
      situation.opponentAction === "4-bet"
        ? ranges[situation.opponent]
        : undefined,
    ),
    position: situation.opponent,
    action: situation.opponentAction ?? (facing === "LIMP" ? "Raise" : "3-bet"),
    raiseTo: range.raiseTo,
    notes: OPPONENT_RANGE_NOTES[key],
  };
}

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
