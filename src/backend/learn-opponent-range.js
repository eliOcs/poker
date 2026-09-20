/**
 * Condition a strategy on an observed action and the learner's hole cards.
 * Suits are interchangeable preflop, so a canonical representative of the
 * learner's hand class gives the exact remaining counts for each hand class.
 * @param {{actions: string[], hands: Record<string, number[]>}} range
 * @param {string} action
 * @param {string} heroHand
 */
export function conditionLearnRange(range, action, heroHand) {
  const blocked = [
    heroHand[0] + "s",
    heroHand[1] + (heroHand.endsWith("s") ? "s" : "h"),
  ];
  const actionIndex = range.actions.indexOf(action);
  const hands = Object.fromEntries(
    Object.entries(range.hands).map(([hand, frequencies]) => {
      const combinations = availableCombinations(hand, blocked);
      return [
        hand,
        {
          frequency: /** @type {number} */ (frequencies[actionIndex]),
          combinations,
          blockedCombinations: availableCombinations(hand, []) - combinations,
          probability: 0,
        },
      ];
    }),
  );
  const total = Object.values(hands).reduce(
    (sum, hand) => sum + hand.combinations * hand.frequency,
    0,
  );
  if (!Number.isFinite(total) || total <= 0) {
    throw new Error("Opponent action has no valid range weight");
  }
  for (const hand of Object.values(hands)) {
    hand.probability = (100 * hand.combinations * hand.frequency) / total;
  }
  return { hands, totalWeight: total / 100 };
}

function availableCombinations(hand, blocked) {
  const suits = ["s", "h", "d", "c"];
  const first = suits.filter((suit) => !blocked.includes(hand[0] + suit));
  if (hand.length === 2) return (first.length * (first.length - 1)) / 2;
  const second = suits.filter((suit) => !blocked.includes(hand[1] + suit));
  const suited = first.filter((suit) => second.includes(suit)).length;
  return hand.endsWith("s") ? suited : first.length * second.length - suited;
}
