// Modern Poker Theory: Main Variables that Affect Pre-flop Hand Ranges,
// PDF pages 163–167. These describe observable features, not action EVs.
const RANKS = "23456789TJQKA";
const STRAIGHTS = Array.from({ length: 10 }, (_, start) =>
  Array.from({ length: 5 }, (_, offset) => {
    const rank = start + offset + 1;
    return rank === 1 ? 14 : rank;
  }),
);

/**
 * Hand is a validated canonical class, for example T9s, AKo or 55.
 * @param {import("./learn-types.js").HandClass} hand
 * @param {import("./learn-types.js").BigBlinds} raiseTo
 * @param {import("./learn-types.js").LearnSituation} [situation]
 * @param {import("./learn-types.js").Frequencies} [expected]
 * @param {import("./learn-types.js").LearnAction[]} [actions]
 * @returns {import("./learn-types.js").Playability}
 */
export function describePlayability(
  hand,
  raiseTo,
  situation = undefined,
  expected = [0, 0, 0],
  actions = ["fold", "call", "raise"],
) {
  const high = RANKS.indexOf(hand.charAt(0)) + 2;
  const low = RANKS.indexOf(hand.charAt(1)) + 2;
  const pair = high === low;
  const straightPatterns = pair
    ? 0
    : STRAIGHTS.filter((ranks) => ranks.includes(high) && ranks.includes(low))
        .length;
  const highCards = [high, low].filter((rank) => rank >= 10).length;
  const suited = hand.endsWith("s");
  return {
    features: { pair, suited, highCards, straightPatterns },
    cards: pair
      ? pairNotes(high)
      : [
          highCardNote(highCards),
          {
            title: suited ? "Suited" : "Different suits",
            text: suited
              ? high === 14
                ? "Your cards can work together toward an ace-high flush, the highest flush in that suit."
                : "Your cards can work together toward a flush. A lower flush can still lose to a higher one."
              : "You do not have the extra flush potential of the suited version of this hand.",
          },
          connectionNote(high, low, straightPatterns),
        ],
    situation: situationNotes(raiseTo, situation, [
      0,
      expected[actions.indexOf("call")] ?? 0,
      /** @type {number} */ (expected[actions.indexOf("raise")]),
    ]),
  };
}

/**
 * @param {import('./learn-types.js').BigBlinds} raiseTo
 * @param {import('./learn-types.js').LearnSituation | undefined} situation
 * @param {[number, number, number]} expected
 * @returns {import('./learn-types.js').LearnNote[]}
 */
function situationNotes(raiseTo, situation, expected) {
  const notes = [];
  const followup = situation?.opponent !== undefined;
  if (expected[1] > 0 && followup) notes.push(potOddsNote(situation));
  if (expected[2] > 0) {
    if (!followup)
      notes.push({
        title: "1.5 BB to play for",
        text: "The pot contains just the blinds, with no antes. Extra money in the pot would make stealing it more rewarding.",
      });
    notes.push({
      title: `${raiseTo} BB ${followup ? "re-raise total" : "opening size"}`,
      text:
        situation?.opponentAction === "4-bet"
          ? `This is the total bet, including the ${situation.heroBet} BB already committed. The reference assumes ${situation.opponent}’s ${situation.currentBet} BB 4-bet and 100 BB starting stacks.`
          : followup
            ? "This is the total bet, including chips you already committed. The reference range assumes this sizing and the preceding bets; different sizes change the decision."
            : "A larger raise risks more chips to win the same pot. The weakest opening hands are especially sensitive to that price.",
    });
  }
  return notes;
}

// Modern Poker Theory, Pot Odds and Outs, PDF pages 37–38.
// Include folded players' contributions when pricing the outstanding call.
/** @param {import("./learn-types.js").LearnSituation} situation */
function potOddsNote(situation) {
  const pot = situation.pot;
  const call = situation.currentBet - situation.heroBet;
  const percentage = Math.round((100 * call) / (pot + call));
  return {
    title: `${pot} BB in the pot`,
    text: `Calling costs another ${call} BB. Pot odds: ${call} ÷ (${pot} + ${call}) ~ ${percentage}%. With no further betting, this is the break-even win rate; winning more often is profitable. Future bets and folds still matter.`,
  };
}

/** @param {number} rank */
function pairNotes(rank) {
  return [
    {
      title: "Pocket pair",
      text:
        rank >= 10
          ? "You already have a high pair. Higher pairs beat lower pairs without needing to improve."
          : "You already have a pair, but bigger cards on the board can make it harder to continue. Matching your rank on the flop gives you three of a kind.",
    },
  ];
}

/** @param {number} count */
function highCardNote(count) {
  if (count === 2)
    return {
      title: "Two high cards",
      text: "Both cards are ten or higher, giving you ways to make strong pairs. Your other card still matters when an opponent pairs the same rank.",
    };
  if (count === 1)
    return {
      title: "One high card",
      text: "One card is ten or higher. Pairing it can help, but the lower card can leave you with a weaker kicker against the same pair.",
    };
  return {
    title: "Lower cards",
    text: "Neither card is ten or higher. Pairs made with these cards are more vulnerable to higher pairs, so other ways to improve matter more.",
  };
}

/** @param {number} high @param {number} low @param {number} count */
function connectionNote(high, low, count) {
  if (!count)
    return {
      title: "Disconnected",
      text: "No five-card straight can contain both of these ranks. A straight is still possible using one hole card or the board.",
    };
  const gap = Math.min(high - low, high === 14 ? low - 1 : high - low) - 1;
  const title =
    gap === 0 ? "Connected" : `${gap} ${gap === 1 ? "gap" : "gaps"}`;
  return {
    title,
    text:
      count === 1
        ? "Both cards fit together in just one possible straight, so their shared straight potential is limited."
        : `Both cards fit together in ${count} different straights. That gives them more ways to improve together than widely separated cards.`,
  };
}
