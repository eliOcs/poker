// Teaching heuristics for the recommended actions, not per-action EV estimates.
const OPENING_CONTEXT = {
  LJ: "Five players still have a chance to enter the pot, and UTG+1, CO and BTN have position on you after the flop.",
  HJ: "Four players remain, and both the cutoff and button have position on you after the flop.",
  CO: "Three players remain, and the button has position on you after the flop.",
  BTN: "Only the blinds remain, and you have position on both of them after the flop.",
  SB: "Only the big blind remains, but you are out of position and act first after the flop.",
};

export function explainLearnHand(hand, situation, expected) {
  const inPosition =
    ["SB", "BB"].includes(situation.opponent) && situation.position !== "SB";
  const context = situation.opponent
    ? `You are ${inPosition ? "in" : "out of"} position against ${situation.opponent} and act ${inPosition ? "last" : "first"} after the flop.`
    : OPENING_CONTEXT[situation.position];
  const reasons = [
    () => foldReason(hand, situation, expected[0] === 100, inPosition),
    () => callReason(situation, inPosition),
    () => raiseReason(situation, inPosition),
  ];
  const actions = ["Fold", "Call", "Raise"];
  const recommended = actions.flatMap((action, i) =>
    expected[i] > 0 ? [`${action} ${expected[i]}%`] : [],
  );
  return [
    `${recommended.join(", ")}.`,
    context,
    ...reasons.flatMap((reason, i) => (expected[i] > 0 ? [reason()] : [])),
    ...(recommended.length > 1
      ? [
          "Mix these actions over repeated decisions with this hand; the frequencies describe how often to use each one.",
        ]
      : []),
  ].join(" ");
}

function foldReason(hand, situation, pure, inPosition) {
  const decision = pure
    ? `${hand} stays outside the continuing range here.`
    : `Folding some of the time keeps ${hand} from continuing too often here.`;
  if (situation.opponent) {
    return `${decision} ${
      inPosition
        ? "Position helps, but does not make every hand worth the extra chips against this stronger range."
        : "Facing this stronger range while acting first makes it harder to reach showdown without committing more chips."
    } The chips already in the pot do not oblige you to risk more.`;
  }
  const pressure =
    situation.position === "SB"
      ? "Even with the blind discount, playing the rest of the hand out of position can cost more chips."
      : situation.position === "BTN"
        ? "Having position and only two opponents left does not make every hand worth entering the pot."
        : "With several opponents still to act, you need a hand that can handle stronger opposing hands and pressure after the flop.";
  return `${decision} ${pressure} Folding preserves your stack without investing more.`;
}

function callReason(situation, inPosition) {
  if (!situation.opponent) {
    return "Limping costs just another 0.5 BB. The discount lets this hand see a flop cheaply when BB checks, while keeping the pot small out of position.";
  }
  const cost = situation.currentBet - situation.heroBet;
  return `Calling the extra ${cost} BB keeps this hand in the pot without increasing the price further. ${
    inPosition
      ? "Acting last lets you see your opponent’s decision before making yours, helping you realize your hand’s equity."
      : "Keeping the pot smaller leaves room to use the hand’s postflop potential, though acting first makes future decisions harder."
  }`;
}

function raiseReason(situation, inPosition) {
  if (!situation.opponent) {
    return situation.position === "SB"
      ? "Raising puts pressure on the only remaining opponent and builds the pot when BB continues. The larger opening size discourages calls and compensates for playing out of position."
      : "Raising can win the blinds immediately and builds the pot when an opponent continues. This hand is part of the opening range from this position.";
  }
  if (situation.lastAction === "call") {
    return "Re-raising puts this hand in the linear range built from high-equity hands. These hands can continue against a further raise and play well when the remaining stacks are small relative to the pot.";
  }
  return `4-betting puts pressure on the opponent and builds a larger pot if they continue. ${
    inPosition
      ? "You retain the advantage of acting last after the flop."
      : "Leaving less money behind relative to the pot reduces the opponent’s positional advantage."
  } The 4-bet range contains both strong hands and selected bluffs, so raising alone does not mean a hand should continue against a shove.`;
}
