import { randomInt } from "node:crypto";
import LEARN_RANGES from "./learn-ranges.json" with { type: "json" };
import { describePlayability } from "./learn-playability.js";
import { HttpError } from "./http-error.js";

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
/** @type {Record<string, {page: number, chart: number, raiseTo: number, hands: Record<string, number[]>}>} */
const ranges = LEARN_RANGES;
const explanations = {
  LJ: "Five players still have a chance to enter the pot. Start with a strong range: several opponents can have position on you after the flop.",
  HJ: "Four players are still to act. You can open more hands than from the first seat, but the cutoff and button can still play with position on you.",
  CO: "Only three players remain, so more hands become playable. The button can still call or raise with position on you.",
  BTN: "Only the blinds remain, and you will act after them on later rounds. That positional advantage lets you open a wider range.",
  SB: "Only the big blind remains. Calling adds half a big blind to reach 1 BB, letting you play more hands. This is also called limping. Raising larger helps offset having to act first after the flop.",
};

export function createLearnScenario() {
  const position = /** @type {string} */ (POSITIONS[randomInt(5)]);
  const range = /** @type {NonNullable<typeof ranges[string]>} */ (
    ranges[position]
  );
  const hands = Object.keys(range.hands);
  const hand = /** @type {string} */ (hands[randomInt(hands.length)]);
  const suits = ["s", "h", "d", "c"];
  const first = randomInt(4);
  const second = hand.endsWith("s") ? first : (first + 1 + randomInt(3)) % 4;
  const hero = POSITIONS.indexOf(position);
  return {
    id: `${position}-${hand}`,
    position,
    hand,
    blinds: { small: 250, big: 500 },
    seats: POSITIONS.map((name, i) => ({
      empty: false,
      allIn: false,
      sittingOut: false,
      disconnected: false,
      player: { name: `${i === hero ? "You · " : ""}${POSITION_LABELS[name]}` },
      isCurrentPlayer: i === hero,
      isActing: i === hero,
      folded: i < hero,
      lastAction: i < hero ? "fold" : undefined,
      stack: 50000 - (i === 4 ? 250 : i === 5 ? 500 : 0),
      bet: i === 4 ? 250 : i === 5 ? 500 : 0,
      cards:
        i === hero
          ? [
              hand.charAt(0) + suits.at(first),
              hand.charAt(1) + suits.at(second),
            ]
          : i < hero
            ? []
            : ["??", "??"],
    })),
  };
}

/** @returns {never} */
function invalidStrategy() {
  throw new HttpError(400, "Invalid learning strategy");
}

function parseScenario(id) {
  if (typeof id !== "string") {
    invalidStrategy();
  }
  const [position = "", hand = "", extra] = id.split("-");
  if (extra !== undefined || !Object.hasOwn(ranges, position)) {
    invalidStrategy();
  }
  const range = ranges[position];
  if (!range || !Object.hasOwn(range.hands, hand)) {
    invalidStrategy();
  }
  const expected = range.hands[hand];
  if (!expected) {
    invalidStrategy();
  }
  return { position, hand, range, expected };
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
  const { position, hand, range, expected } = parseScenario(id);
  validateFrequencies(frequencies);
  if (
    frequencies[2] > 0 &&
    (!Number.isFinite(raiseTo) || raiseTo < 2 || raiseTo > 100)
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
    playability: describePlayability(hand, range.raiseTo),
    explanation: explanationFor(position, expected, frequencies),
    page: range.page,
    chart: range.chart,
    hands: range.hands,
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

function explanationFor(position, expected, frequencies) {
  if (position !== "SB" && frequencies[1] > 0) {
    return (
      explanations[position] +
      " The reference strategy never calls first in from this position. Calling pays the full big blind and encourages more players into the pot. Raising can win the blinds immediately and makes it harder for opponents to enter cheaply; hands outside the opening range fold instead."
    );
  }
  if (expected.filter((n) => n > 0).length > 1) {
    return (
      explanations[position] +
      " This hand mixes actions in the reference strategy. The mix matters over repeated decisions; choosing one of those actions is not a mistake on its own."
    );
  }
  return (
    explanations[position] +
    (expected[0] === 100
      ? " This hand is outside the reference opening range. Folding saves chips for stronger opportunities."
      : " This hand consistently takes the same action in the reference strategy.")
  );
}
