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
 * @param {string} hand
 * @param {number} raiseTo
 * @param {ReturnType<import('./learn-situations.js').learnSituation>} [situation]
 */
export function describePlayability(hand, raiseTo, situation = undefined) {
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
    situation: situationNotes(raiseTo, situation),
  };
}

function situationNotes(raiseTo, situation) {
  return [
    situation?.explanation
      ? {
          title: `${situation.heroBet + situation.currentBet} BB in the pot`,
          text: `You have already put in ${situation.heroBet} BB. Calling costs another ${situation.currentBet - situation.heroBet} BB. Both players started with 100 BB; earlier contributions are already part of the pot.`,
        }
      : {
          title: "1.5 BB to play for",
          text: "The pot contains just the blinds, with no antes. Extra money in the pot would make stealing it more rewarding.",
        },
    ...(situation?.currentBet > 1 ? [potOddsNote(situation)] : []),
    {
      title: `${raiseTo} BB ${situation?.explanation ? "re-raise total" : "opening size"}`,
      text: situation?.explanation
        ? "This is the total bet, including chips you already committed. The reference range assumes this sizing and the preceding bets; different sizes change the decision."
        : "A larger raise risks more chips to win the same pot. The weakest opening hands are especially sensitive to that price.",
    },
    {
      title: "Cash-game rake",
      text: "The house takes a fee from eligible pots, reducing what you can win. This makes marginal hands less attractive.",
    },
  ];
}

// Modern Poker Theory, Pot Odds and Outs, PDF pages 37–38.
// These follow-ups are heads-up: both players' street bets form the entire pot.
function potOddsNote(situation) {
  const pot = situation.heroBet + situation.currentBet;
  const call = situation.currentBet - situation.heroBet;
  const percentage = Math.round((100 * call) / (pot + call));
  return {
    title: `Pot odds: ≈${percentage}%`,
    text: `Call cost ÷ pot after calling: ${call} ÷ (${pot} + ${call}) ≈ ${percentage}%, with amounts in BB. Ignoring rake and assuming no further betting, winning more often than the exact threshold makes calling profitable over time; matching it breaks even. Preflop, future bets may cost more or force you to fold before showdown, so pot odds alone do not tell you whether to call.`,
  };
}

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
