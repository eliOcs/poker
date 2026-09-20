// Teaching heuristics for the recommended actions, not per-action EV estimates.
const OPENING_CONTEXT = {
  LJ: "Five players still have a chance to enter the pot, and UTG+1, CO and BTN have position on you after the flop.",
  HJ: "Four players remain, and both the cutoff and button have position on you after the flop.",
  CO: "Three players remain, and the button has position on you after the flop.",
  BTN: "Only the blinds remain, and you have position on both of them after the flop.",
  SB: "Only the big blind remains, but you are out of position and act first after the flop.",
};

// Modern Poker Theory, Hijack, PDF pages 216–218 (Hand Ranges 56–57).
// These describe the opponent's strategy, not the learner's current action.
export const OPPONENT_RANGE_NOTES = {
  HJ_VS_LJ_OPEN: [
    {
      title: "A tight 3-bet-or-fold range",
      text: "Against an LJ open, HJ 3-bets about 8% of all starting hands and folds the rest in this reference strategy. There is no calling range. The 3-bet range is built mainly around strong hands.",
    },
    {
      title: "Small pairs give board coverage",
      text: "Pairs from 88 down to 22 appear at low frequencies, letting HJ make sets on more flop textures. Spreading these occasional 3-bets across different pairs also makes opponents’ blockers less effective at narrowing down HJ’s hands.",
    },
    {
      title: "A 4-bet does not always end the hand",
      text: "If LJ 4-bets, HJ has position and calls with most of the continuing range. The reference response is 38.3% fold, 43.3% call and 18.4% shove. These percentages describe hands that already 3-bet and now face a 4-bet.",
    },
    {
      title: "Calls can still contain very strong hands",
      text: "Against the 4-bet, HJ calls AA about half the time. AKo, AQs, AJs and KQs also appear among the calls, alongside some small suited connectors and suited wheel aces. A call can conceal strength; a 3-bet does not commit HJ to shoving.",
    },
  ],
};

export function explainLearnHand(hand, situation, expected) {
  const postflopOrder = ["SB", "BB", "LJ", "HJ", "CO", "BTN"];
  const inPosition =
    postflopOrder.indexOf(situation.position) >
    postflopOrder.indexOf(situation.opponent);
  const context =
    situation.opponentAction === "Open"
      ? "You have position on LJ, but CO, BTN and both blinds are still to act. CO or BTN would have position on you if they enter."
      : situation.opponent
        ? `You are ${inPosition ? "in" : "out of"} position against ${situation.opponent} and act ${inPosition ? "last" : "first"} after the flop.`
        : OPENING_CONTEXT[situation.position];
  const reasons = [
    () => foldReason(hand, situation, expected[0] === 100, inPosition),
    () => callReason(hand, situation, inPosition),
    () => raiseReason(hand, situation, inPosition),
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
  if (situation.opponentAction === "Open") {
    return `${decision} LJ starts with a tight range, and four players behind you can still enter. Folding limits exposure to that pressure and preserves your stack without investing more.`;
  }
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

function callReason(hand, situation, inPosition) {
  if (!situation.opponent) {
    return "Limping costs just another 0.5 BB. The discount lets this hand see a flop cheaply when BB checks, while keeping the pot small out of position.";
  }
  const cost = situation.currentBet - situation.heroBet;
  if (situation.opponentAction === "4-bet") {
    const strength =
      hand === "AA"
        ? "Keeping AA in the calling range protects it: a call can still contain the strongest starting hand."
        : "This hand keeps its postflop potential without committing the whole stack now.";
    return `Calling the extra ${cost} BB lets you see the flop in position. Acting last helps you realize equity against LJ’s strong range. ${strength}`;
  }
  return `Calling the extra ${cost} BB keeps this hand in the pot without increasing the price further. ${
    inPosition
      ? "Acting last lets you see your opponent’s decision before making yours, helping you realize your hand’s equity."
      : "Keeping the pot smaller leaves room to use the hand’s postflop potential, though acting first makes future decisions harder."
  }`;
}

function raiseReason(hand, situation, inPosition) {
  if (situation.opponentAction === "Open") {
    const coverage =
      hand.length === 2 && "2345678".includes(hand[0])
        ? " Occasional 3-bets with small pairs spread set potential across more flop textures and make opponents’ blockers less effective at narrowing your range."
        : "";
    return `3-betting to 8.5 BB puts pressure on LJ and the players behind you. HJ continues with only about 8% of starting hands in this reference, using a tight 3-bet-or-fold strategy.${coverage}`;
  }
  if (situation.opponentAction === "4-bet") {
    return "5-betting all-in to 100 BB commits your remaining 91.5 BB. This hand belongs in the reference’s narrow shoving range at the recommended frequency, putting LJ to a decision for the full stack. There are no chips left for postflop betting if LJ calls.";
  }
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
