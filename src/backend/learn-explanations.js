// Teaching heuristics for the recommended actions, not per-action EV estimates.
const OPENING_CONTEXT = {
  LJ: "Five players still have a chance to enter the pot, and UTG+1, CO and BTN have position on you after the flop.",
  HJ: "Four players remain, and both the cutoff and button have position on you after the flop.",
  CO: "Three players remain, and the button has position on you after the flop.",
  BTN: "Only the blinds remain, and you have position on both of them after the flop.",
  SB: "Only the big blind remains, but you are out of position and act first after the flop.",
};

// Modern Poker Theory, Cutoff and Button, PDF pages 218–229 (Hand Ranges 58–67).
// Range-wide takeaways are separate from reasons for the current hand's actions.
export const LEARN_RANGE_NOTES = {
  BTN_VS_LJ_OPEN: [
    {
      title: "Position makes room for calls",
      text: "BTN always acts last postflop, even if a blind enters. Unlike HJ and CO, it has a flat-calling range against opens: about 6.9% of all starting hands against LJ, alongside 7.3% 3-bets. Calls favor postflop playability and coverage of different boards; 3-bets are more polarized, mixing strong hands with selected bluffs.",
    },
    {
      title: "Protect calls against squeezes",
      text: "The blinds can still re-raise after a call. Keeping some QQ, JJ, TT, 99 and AKo among the calls stops that range from being only weak hands. Suited broadways such as AQs, AJs and KQs also help it withstand squeezes and play postflop. Use each hand’s displayed mix rather than always raising the strongest hands.",
    },
    {
      title: "Do not build rules around tiny outliers",
      text: "The source treats unusual K6s, K5s and 53s mixes as likely solver-convergence artifacts, not a special discovery about those hands. The chart retains the measured frequencies, but the practical lesson is the overall range structure rather than memorizing tiny exceptions.",
    },
  ],
  BTN_VS_HJ_OPEN: [
    {
      title: "More 3-bets, slightly fewer calls",
      text: "Against HJ, BTN 3-bets about 8.8% of all starting hands and calls 6.5%, compared with 7.3% and 6.9% against LJ. HJ’s wider opening range lets BTN attack more, while the blinds can squeeze more often and give BTN’s calls less protection. Guaranteed postflop position still makes a calling range possible.",
    },
    {
      title: "Add selected high-card blockers",
      text: "QJo and ATo enter the 3-bet range at low frequencies, about 16% and 13% in the source. Their high cards remove some strong hands an opponent could hold. They are occasional additions to a polarized range, not automatic 3-bets whenever BTN faces HJ.",
    },
  ],
  BTN_VS_CO_OPEN: [
    {
      title: "Attack wider while trimming calls",
      text: "Against CO, BTN 3-bets about 11.7% of all starting hands and calls 5.4%. CO opens wider, but the blinds can also squeeze more often. BTN therefore continues more overall while shifting away from flat calls, despite always having postflop position.",
    },
    {
      title: "High-card value matters more",
      text: "The wider 3-bet range adds suited aces and offsuit broadways, emphasizing high-card value and blockers. Calls still retain hands with good postflop playability. Follow the individual mixes: a wider defense does not make every suited hand or broadway a pure raise.",
    },
  ],
  BTN_VS_LJ_4BET: [
    {
      title: "Keep the shove range narrow",
      text: "LJ’s 4-bet range is strong. KK and AKs always shove in the reference, while AKo shoves about 64%, AA 44% and QQ only 5%. AA often calls and QQ mostly calls; even premium hands do not all commit the stack immediately.",
    },
    {
      title: "Most continuing hands call in position",
      text: "After BTN 3-bets and faces LJ’s 4-bet, the source folds 40.6%, calls 40% and shoves 19.4% of that prior 3-bet range. Calling lets hands with enough equity play a flop with position, while strong slowplays protect the calls. These percentages are conditional on already having 3-bet.",
    },
  ],
  BTN_VS_HJ_4BET: [
    {
      title: "Expand both calls and value shoves",
      text: "Against HJ, QQ shoves about 38% in the source, compared with only 5% against LJ. AQo calls more often, and the defense adds calls with KTs, QJs, JTs and suited wheel aces. The source response is about 40% fold, 41.6% call and 18.4% shove over the hands that already 3-bet.",
    },
    {
      title: "A pure call can still be a rare hand",
      text: "54s calls 100% when it reaches this decision, but BTN only 3-bets it about 4% of the time against HJ in the source. It is therefore a tiny part of the range facing a 4-bet. A cell’s action frequency is not its share of the overall range; the range totals also account for the preceding 3-bet frequency.",
    },
  ],
  BTN_VS_CO_4BET: [
    {
      title: "AA always calls against CO",
      text: "CO’s 4-bet range is wider and more polarized than HJ’s, so BTN defends more through calls. AA slowplays 100% in the reference. AQo, QJs and JTs call more often, and K9s calls about 68% in the source. Keeping AA among these calls protects the range’s strength.",
    },
    {
      title: "The value shove range changes too",
      text: "JJ starts shoving about 40%, while QQ shoves about 66% and AKo about 96% in the source. These are 5-bets all-in after CO’s 4-bet. They show why the highest pair need not be the hand raised most often: AA calls while other strong hands mix or favor shoving.",
    },
  ],
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

// Modern Poker Theory, Hijack, Cutoff and Button, PDF pages 216–229.
// These describe the opponent's strategy, not the learner's current action.
export const OPPONENT_RANGE_NOTES = {
  BTN_VS_LJ_OPEN: [
    ...LEARN_RANGE_NOTES.BTN_VS_LJ_OPEN,
    ...LEARN_RANGE_NOTES.BTN_VS_LJ_4BET,
  ],
  BTN_VS_HJ_OPEN: [
    ...LEARN_RANGE_NOTES.BTN_VS_HJ_OPEN,
    ...LEARN_RANGE_NOTES.BTN_VS_HJ_4BET,
  ],
  BTN_VS_CO_OPEN: [
    ...LEARN_RANGE_NOTES.BTN_VS_CO_OPEN,
    ...LEARN_RANGE_NOTES.BTN_VS_CO_4BET,
  ],
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
      ? facingOpenContext(situation)
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

function facingOpenContext(situation) {
  if (situation.position === "BTN")
    return `You have position on ${situation.opponent}. Both blinds are still to act, but you will act last postflop even if they enter.`;
  return situation.position === "CO"
    ? `You have position on ${situation.opponent}, but BTN and both blinds are still to act. BTN would have position on you if it enters.`
    : "You have position on LJ, but CO, BTN and both blinds are still to act. CO or BTN would have position on you if they enter.";
}

function foldReason(hand, situation, pure, inPosition) {
  const decision = pure
    ? `${hand} stays outside the continuing range here.`
    : `Folding some of the time keeps ${hand} from continuing too often here.`;
  if (situation.opponentAction === "Open") {
    if (situation.position === "BTN")
      return `${decision} Having position does not remove the need for enough strength against ${situation.opponent}’s opening range. Both blinds can still enter the pot. Folding preserves your stack without investing more.`;
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
  if (situation.opponentAction === "Open") {
    return `Calling the extra ${cost} BB uses BTN’s guaranteed postflop position without building a 3-bet pot. The calling range balances playable hands with strong hands that protect it. Both blinds can still squeeze, so calling does not guarantee a cheap flop.`;
  }
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
  if (situation.position === "BTN") {
    return `3-betting to 8.5 BB puts pressure on ${situation.opponent} and the blinds while retaining position after the flop. BTN’s polarized 3-bet range mixes strong hands with selected bluffs at their recommended frequencies.`;
  }
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
