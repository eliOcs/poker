// Teaching heuristics for the recommended actions, not per-action EV estimates.
const OPENING_CONTEXT = {
  LJ: "Five players still have a chance to enter the pot, and UTG+1, CO and BTN have position on you after the flop.",
  HJ: "Four players remain, and both the cutoff and button have position on you after the flop.",
  CO: "Three players remain, and the button has position on you after the flop.",
  BTN: "Only the blinds remain, and you have position on both of them after the flop.",
  SB: "Only the big blind remains, but you are out of position and act first after the flop.",
};

// Modern Poker Theory, Cutoff, PDF pages 218–222 (Hand Ranges 58–61).
// Range-wide takeaways are separate from reasons for the current hand's actions.
export const LEARN_RANGE_NOTES = {
  CO_VS_LJ_OPEN: [
    {
      title: "One fewer player, only a little wider",
      text: "With HJ out of the way, CO can 3-bet slightly more often than HJ could against LJ: about 8.6% of all starting hands versus 8.1%. LJ’s tight opening range still limits how far CO can widen.",
    },
    {
      title: "Continue by 3-betting",
      text: "The reference uses a 3-bet-or-fold strategy, with no flat calls. BTN and both blinds still have a decision, and BTN would have position on CO if it enters. Having position on LJ does not make every playable-looking hand a profitable entry.",
    },
  ],
  CO_VS_HJ_OPEN: [
    {
      title: "A wider opener allows more 3-bets",
      text: "HJ opens about 21% of starting hands, compared with LJ’s 17%. CO therefore increases its 3-bet range from about 8.6% against LJ to 9.9% against HJ, still using 3-bet or fold with no flat calls.",
    },
    {
      title: "Add hands at the edge, not every suited hand",
      text: "A9s, QTs and JTs gain 3-bet frequency against HJ, along with hands already near the edge of the range. The source uses these hands only some of the time; the hand’s displayed mix gives the rounded practice frequencies.",
    },
  ],
  CO_VS_LJ_4BET: [
    {
      title: "Strong hands do not all shove",
      text: "Against LJ’s 4-bet, KK and AKs always shove in the reference, but QQ shoves only about 7% of the time. AA calls roughly half the time. Keeping very strong hands among the calls protects the calling range.",
    },
    {
      title: "Use position to keep a calling range",
      text: "AKo mixes calls and shoves; A5s and A4s sometimes call too. Of the range that already 3-bet and now faces LJ’s 4-bet, the source folds 37.4%, calls 45.1% and shoves 17.5%. Calling is the main way the continuing range plays on.",
    },
  ],
  CO_VS_HJ_4BET: [
    {
      title: "Wider 3-bets need a wider defense",
      text: "After 3-betting more hands against HJ, CO must also continue with more hands against the 4-bet. KJs always calls in the reference, while ATs and KTs call at smaller frequencies. Folding all these extra hands would leave the wider 3-bet range too easy to attack.",
    },
    {
      title: "Most continuing hands take a flop in position",
      text: "Of the range that already 3-bet and now faces HJ’s 4-bet, the source folds about 35.8%, calls 48.2% and shoves 16.1%. CO acts after HJ postflop, and calls can still contain premium hands. These are frequencies over the prior 3-bet range, not all starting hands.",
    },
  ],
};

// Modern Poker Theory, Hijack and Cutoff, PDF pages 216–222.
// These describe the opponent's strategy, not the learner's current action.
export const OPPONENT_RANGE_NOTES = {
  CO_VS_LJ_OPEN: [
    ...LEARN_RANGE_NOTES.CO_VS_LJ_OPEN,
    ...LEARN_RANGE_NOTES.CO_VS_LJ_4BET,
  ],
  CO_VS_HJ_OPEN: [
    ...LEARN_RANGE_NOTES.CO_VS_HJ_OPEN,
    ...LEARN_RANGE_NOTES.CO_VS_HJ_4BET,
  ],
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
      ? situation.position === "CO"
        ? `You have position on ${situation.opponent}, but BTN and both blinds are still to act. BTN would have position on you if it enters.`
        : "You have position on LJ, but CO, BTN and both blinds are still to act. CO or BTN would have position on you if they enter."
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
    const pressure =
      situation.position === "CO"
        ? `${situation.opponent === "HJ" ? "HJ starts wider than LJ, but still has a stronger range than a random hand" : "LJ starts with a tight range"}, and three players behind you can still enter.`
        : "LJ starts with a tight range, and four players behind you can still enter.";
    return `${decision} ${pressure} Folding limits exposure to that pressure and preserves your stack without investing more.`;
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
    const widerDefense =
      situation.position === "CO" &&
      situation.opponent === "HJ" &&
      ["KJs", "ATs", "KTs"].includes(hand)
        ? " Against HJ’s wider starting range, suited broadways like this one join CO’s defense at the recommended frequency."
        : "";
    return `Calling the extra ${cost} BB lets you see the flop in position. Acting last helps you realize equity against ${situation.opponent}’s strong range. ${strength}${widerDefense}`;
  }
  return `Calling the extra ${cost} BB keeps this hand in the pot without increasing the price further. ${
    inPosition
      ? "Acting last lets you see your opponent’s decision before making yours, helping you realize your hand’s equity."
      : "Keeping the pot smaller leaves room to use the hand’s postflop potential, though acting first makes future decisions harder."
  }`;
}

function raiseReason(hand, situation, inPosition) {
  if (situation.opponentAction === "Open")
    return openRaiseReason(hand, situation);
  if (situation.opponentAction === "4-bet") {
    return `5-betting all-in to 100 BB commits your remaining 91.5 BB. This hand belongs in the reference’s narrow shoving range at the recommended frequency, putting ${situation.opponent} to a decision for the full stack. There are no chips left for postflop betting if ${situation.opponent} calls.`;
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

function openRaiseReason(hand, situation) {
  if (situation.position === "CO") {
    const adjustment =
      situation.opponent === "LJ"
        ? "With one fewer player behind than HJ, CO can widen slightly to about 8.6% of starting hands, but LJ’s tight range keeps that increase small."
        : "HJ opens wider than LJ, so CO can 3-bet about 9.9% of starting hands, adding frequency with hands such as A9s, QTs and JTs.";
    return `3-betting to 8.5 BB puts pressure on ${situation.opponent} and the players behind you. ${adjustment} This reference uses a 3-bet-or-fold strategy.`;
  }
  const coverage =
    hand.length === 2 && "2345678".includes(hand[0])
      ? " Occasional 3-bets with small pairs spread set potential across more flop textures and make opponents’ blockers less effective at narrowing your range."
      : "";
  return `3-betting to 8.5 BB puts pressure on LJ and the players behind you. HJ continues with only about 8% of starting hands in this reference, using a tight 3-bet-or-fold strategy.${coverage}`;
}
