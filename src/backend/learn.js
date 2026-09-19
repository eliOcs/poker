import { randomInt } from "node:crypto";
import LEARN_RANGES from "./learn-ranges.json" with { type: "json" };
import { describePlayability } from "./learn-playability.js";
import { HttpError } from "./http-error.js";
import { learnSituation } from "./learn-situations.js";

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
  CO: "The button still has position on you and can call or 3-bet, so open a tighter range than on the button: about 28% of hands instead of 43%. Play raise or fold, using the reference opening size of 2.5 BB. Weaker button opens such as K2s, Q2s and 98o fold here because there is another player to get through, and you will act before the button after the flop.",
  BTN: "With only the blinds left, play raise or fold: the reference opens to 2.5 BB with about 43% of hands. You have position on both blinds and act last after the flop, but unlike SB you get no discount to limp. Limping invites both blinds into the pot or lets them raise and force you to pay more or fold. Raising keeps your range easier to defend against 3-bets. If the blinds fold too often, you can open wider than this baseline.",
  SB: "Only the big blind remains, but you will be out of position and act first after the flop. Split your opening range between limping, raising and folding. Limping (calling to 1 BB) costs just another 0.5 BB, so you can play more hands while raising less often and making BB’s 3-bets less effective. When you raise, the reference uses 3 BB to discourage calls and compensate for playing out of position.",
};

/** Weight the displayed chart by combinations and the action that reached it. */
function rangeTotals(range, situation) {
  const previousHands = situation.opponent
    ? /** @type {NonNullable<typeof ranges[string]>} */ (
        ranges[situation.position]
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
  const keys = Object.keys(ranges);
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
    history: position === "LJ" ? "You are first to act." : situation.history,
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
  if (extra !== undefined || !Object.hasOwn(ranges, key)) {
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
  return { situation: learnSituation(key), hand, range, expected };
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
  const { situation, hand, range, expected } = parseScenario(id);
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
    playability: describePlayability(hand, range.raiseTo, situation),
    explanationTitle: situation.explanationTitle,
    explanation: explanationFor(situation, expected, frequencies),
    page: range.page,
    chart: range.chart,
    hands: range.hands,
    rangeTotals: rangeTotals(range, situation),
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

function explanationFor(situation, expected, frequencies) {
  const { position } = situation;
  const explanation = situation.explanation ?? explanations[position];
  if (!situation.explanation && position !== "SB" && frequencies[1] > 0) {
    return (
      explanation +
      " The reference strategy never calls first in from this position. Calling pays the full big blind and encourages more players into the pot. Raising can win the blinds immediately and makes it harder for opponents to enter cheaply; hands outside the opening range fold instead."
    );
  }
  if (expected.filter((n) => n > 0).length > 1) {
    return (
      explanation +
      " This hand mixes actions in the reference strategy. The mix matters over repeated decisions; choosing one of those actions is not a mistake on its own."
    );
  }
  return (
    explanation +
    (expected[0] === 100
      ? " This hand folds in the reference strategy. Folding saves the remaining stack for stronger opportunities."
      : " This hand consistently takes the same action in the reference strategy.")
  );
}
