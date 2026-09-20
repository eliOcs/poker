/**
 * Condition a strategy on an observed action and the learner's hole cards.
 * Suits are interchangeable preflop, so a canonical representative of the
 * learner's hand class gives the exact remaining counts for each hand class.
 * @param {{actions: string[], hands: Record<string, number[]>}} range
 * @param {string} action
 * @param {string} heroHand
 * @param {{actions: string[], hands: Record<string, number[]>}} [openingRange]
 * @param {string} [openingAction]
 */
export function conditionLearnRange(
  range,
  action,
  heroHand,
  openingRange,
  openingAction = "raise",
) {
  const blocked = [
    heroHand[0] + "s",
    heroHand[1] + (heroHand.endsWith("s") ? "s" : "h"),
  ];
  const actionIndex = range.actions.indexOf(action);
  const openingIndex = openingRange
    ? openingRange.actions.indexOf(openingAction)
    : 0;
  const hands = Object.fromEntries(
    Object.keys(openingRange?.hands ?? range.hands).map((hand) => {
      const combinations = availableCombinations(hand, blocked);
      return [
        hand,
        {
          frequency: range.hands[hand]?.[actionIndex] ?? 0,
          ...(openingRange
            ? {
                openingFrequency: openingRange.hands[hand]?.[openingIndex] ?? 0,
              }
            : {}),
          combinations,
          blockedCombinations: availableCombinations(hand, []) - combinations,
          probability: 0,
        },
      ];
    }),
  );
  const total = Object.values(hands).reduce(
    (sum, hand) =>
      sum +
      (hand.combinations * hand.frequency * (hand.openingFrequency ?? 100)) /
        100,
    0,
  );
  if (!Number.isFinite(total) || total <= 0) {
    throw new Error("Opponent action has no valid range weight");
  }
  for (const hand of Object.values(hands)) {
    hand.probability =
      (hand.combinations * hand.frequency * (hand.openingFrequency ?? 100)) /
      total;
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
