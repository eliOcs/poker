import { BIG_BLIND_NOTES } from "./learn-big-blind.js";

// Teaching heuristics for the recommended actions, not per-action EV estimates.
const OPENING_CONTEXT = {
  LJ: "Five players still have a chance to enter the pot, and UTG+1, CO and BTN have position on you after the flop.",
  HJ: "Four players remain, and both the cutoff and button have position on you after the flop.",
  CO: "Three players remain, and the button has position on you after the flop.",
  BTN: "Only the blinds remain, and you have position on both of them after the flop.",
  SB: "Only the big blind remains, but you are out of position and act first after the flop.",
};

// Modern Poker Theory, Cutoff through Small Blind, PDF pages 218–237.
// Range-wide takeaways are separate from reasons for the current hand's actions.
export const LEARN_RANGE_NOTES = {
  ...BIG_BLIND_NOTES,
  SB_VS_LJ_OPEN: [
    {
      title: "The blind discount does not justify a call",
      text: "SB uses 3-bet or fold against LJ, entering about 7.3% of all starting hands. Posting 0.5 BB makes a call cheaper, but SB would act first postflop and BB can still squeeze or overcall. Under the book’s raked cash-game assumptions, those disadvantages outweigh the discount.",
    },
    {
      title: "Raise larger from out of position",
      text: "The reference 3-bet is 10 BB against the 2.5 BB open, compared with 8.5 BB in position. It puts pressure on LJ and the active BB. LJ’s tight opening range still demands a selective response; being in a blind does not make a wide defense automatic.",
    },
  ],
  SB_VS_HJ_OPEN: [
    {
      title: "Widen against the wider opener",
      text: "SB increases its 3-bet range from about 7.3% against LJ to 8.7% against HJ. A9s, KQo, K9s and J9s enter or gain frequency, alongside hands already near the edge of the range. These are selective additions, with each hand following its displayed mix.",
    },
    {
      title: "Keep the 3-bet-or-fold structure",
      text: "The wider response still has no flat calls in this reference. BB remains active and SB will act first after the flop. Use the 10 BB 3-bet sizing; the blind discount alone does not remove the pressure of playing out of position.",
    },
  ],
  SB_VS_CO_OPEN: [
    {
      title: "Add another layer of 3-bets",
      text: "Against CO, SB 3-bets about 10.9% of all starting hands, up from 8.7% against HJ. AJo, A8s and T9s gain partial 3-bets, and other hands near the boundary appear more often. CO’s wider opening range allows this expansion.",
    },
    {
      title: "More hands, the same positional problem",
      text: "SB still uses 3-bet or fold, with a 10 BB raise against the 2.5 BB open. BB can enter behind, and SB acts first postflop. The response widens through selected hands and frequencies rather than adding a flat-calling range.",
    },
  ],
  SB_VS_BTN_OPEN: [
    {
      title: "Defend most widely against BTN",
      text: "SB 3-bets about 15% of all starting hands against BTN, compared with 10.9% against CO. The range adds offsuit broadways such as ATo, suited hands such as A7s and Q9s, and mixes with T8s, 98s, 87s and 76s. Hands already near the edge also gain frequency.",
    },
    {
      title: "A wider defense still uses 3-bet or fold",
      text: "BTN’s wide open invites more resistance, but SB still has no flat calls in this reference. BB is yet to act and SB acts first postflop. Raise to 10 BB at the recommended frequency; the 15% figure describes all starting hands, not how often to raise every individual hand.",
    },
  ],
  SB_VS_LJ_4BET: [
    {
      title: "Calling remains possible out of position",
      text: "After SB 3-bets and LJ 4-bets, the source folds about 33.8%, calls 45.7% and shoves 20.6% of the prior 3-bet range. AKs shoves, AA and AKo mix, and QQ and JJ mostly call. Strong slowplays protect the calls even though SB acts first postflop.",
    },
    {
      title: "Preserve the opponent’s possible bluffs",
      text: "Small suited connectors and medium pairs can make better calls than AQo or suited king- and queen-high hands. They leave more of LJ’s bluff combinations available while retaining useful postflop potential. Raw high-card strength alone does not determine a good defense; follow each hand’s actual mix.",
    },
  ],
  SB_VS_HJ_4BET: [
    {
      title: "A wider 3-bet range needs more defense",
      text: "After expanding against HJ’s open, SB also calls more hands against the 4-bet. AQo begins calling occasionally, while KQs, KJs and KTs gain partial calls. Folding all of those additions would make the wider 3-bet range too easy to attack.",
    },
    {
      title: "Defend at the new price, still out of position",
      text: "SB has invested 10 BB and faces 23 BB, so calling costs another 13 BB into a 34 BB pot. The reference calls with roughly 47% of the range that already 3-bet. Position still matters: SB acts first postflop, and a previous 3-bet does not commit it to an all-in.",
    },
  ],
  SB_VS_CO_4BET: [
    {
      title: "More polarized 4-bets allow more calls",
      text: "CO’s 4-bet range contains a clearer mix of strong hands and bluffs than the earlier positions. SB slowplays AA more often and adds calls with AQo, A3s and JTs. The source response calls about 52.2%, folds 29.2% and shoves 18.6% of the prior 3-bet range.",
    },
    {
      title: "Wheel aces can defend better than higher kickers",
      text: "Suited wheel aces remove some AA and AK combinations while leaving bluffs such as KJs, KTs, K9s and J9s available. Their straight and flush potential also helps after the flop. That can make them better calls than hands such as A9s, despite the lower kicker.",
    },
    {
      title: "Some 5-bet bluffs now appear",
      text: "ATs and A5s enter the shoving range at small frequencies against CO. The earlier positions’ strong, blocker-heavy 4-bet ranges gave SB less reason to use these bluffs. Against a later opener, their blockers and equity when called support occasional shoves; they are still mixed actions, not automatic all-ins.",
    },
  ],
  SB_VS_BTN_4BET: [
    {
      title: "Always slowplay AA in this reference",
      text: "BTN’s highly polarized 4-bet range gives SB more reason to call and less reason to shove. AA calls 100%, protecting a broad calling range. The source calls about 56% of the hands that already 3-bet, compared with about 46% against LJ.",
    },
    {
      title: "Shove selectively and keep enough calls",
      text: "KK, QQ and AK shove, while JJ and TT mix calls with shoves. A5s mostly shoves, with some calls. AQo, suited broadways and selected suited connectors or wheel aces also continue by calling, alongside partial calls with AJo, A9s, K9s and QTs. The hand’s displayed mix distinguishes each response.",
    },
  ],
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

// Modern Poker Theory, Hijack through Small Blind, PDF pages 216–237.
// These describe the opponent's strategy, not the learner's current action.
export const OPPONENT_RANGE_NOTES = {
  BB_VS_LJ_OPEN: [
    ...BIG_BLIND_NOTES.BB_VS_LJ_OPEN,
    ...BIG_BLIND_NOTES.BB_VS_LJ_4BET,
  ],
  BB_VS_HJ_OPEN: [
    ...BIG_BLIND_NOTES.BB_VS_HJ_OPEN,
    ...BIG_BLIND_NOTES.BB_VS_HJ_4BET,
  ],
  BB_VS_CO_OPEN: [
    ...BIG_BLIND_NOTES.BB_VS_CO_OPEN,
    ...BIG_BLIND_NOTES.BB_VS_CO_4BET,
  ],
  BB_VS_BTN_OPEN: [
    ...BIG_BLIND_NOTES.BB_VS_BTN_OPEN,
    ...BIG_BLIND_NOTES.BB_VS_BTN_4BET,
  ],
  BB_VS_SB_OPEN: [
    ...BIG_BLIND_NOTES.BB_VS_SB_OPEN,
    ...BIG_BLIND_NOTES.BB_VS_SB_4BET,
  ],
  BB_VS_SB_LIMP: [
    ...BIG_BLIND_NOTES.BB_VS_SB_LIMP,
    ...BIG_BLIND_NOTES.BB_VS_SB_LIMP_RAISE,
  ],

  SB_VS_LJ_OPEN: [
    ...LEARN_RANGE_NOTES.SB_VS_LJ_OPEN,
    ...LEARN_RANGE_NOTES.SB_VS_LJ_4BET,
  ],
  SB_VS_HJ_OPEN: [
    ...LEARN_RANGE_NOTES.SB_VS_HJ_OPEN,
    ...LEARN_RANGE_NOTES.SB_VS_HJ_4BET,
  ],
  SB_VS_CO_OPEN: [
    ...LEARN_RANGE_NOTES.SB_VS_CO_OPEN,
    ...LEARN_RANGE_NOTES.SB_VS_CO_4BET,
  ],
  SB_VS_BTN_OPEN: [
    ...LEARN_RANGE_NOTES.SB_VS_BTN_OPEN,
    ...LEARN_RANGE_NOTES.SB_VS_BTN_4BET,
  ],
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

export function explainLearnHand(
  hand,
  situation,
  expected,
  actions = ["fold", "call", "raise"],
) {
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
  const reasons = {
    fold: () => foldReason(hand, situation, expected[0] === 100, inPosition),
    call: () => callReason(hand, situation, inPosition),
    raise: () => raiseReason(hand, situation, inPosition),
    check: () =>
      "Checking costs nothing and guarantees a flop without risking a limp-reraise.",
  };
  const recommended = actions.filter((_, i) => expected[i] > 0);
  return [context, ...recommended.map((action) => reasons[action]())].join(" ");
}

function facingOpenContext(situation) {
  if (situation.position === "BB")
    return `You are the last player to respond to ${situation.opponent}’s open. ${situation.opponent === "SB" ? "You have position on SB and act last after the flop." : "You are out of position and act first after the flop."}`;
  if (situation.position === "SB")
    return `You are out of position against ${situation.opponent}. BB is still to act, and you will act first after the flop against either opponent.`;
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
  if (situation.opponentAction === "Open")
    return openFoldReason(decision, situation);
  if (situation.opponent) {
    return `${decision} ${
      inPosition
        ? "Position helps, but does not make every hand worth the extra chips against this stronger range."
        : "This stronger range can pressure you into committing more chips before showdown."
    } The chips already in the pot do not oblige you to risk more.`;
  }
  const pressure =
    situation.position === "SB"
      ? "The blind discount does not offset the risk of costly decisions on later streets."
      : situation.position === "BTN"
        ? "This hand’s equity and playability are too limited to profitably contest the blinds more often."
        : "You need a hand that can handle stronger opposing hands and pressure after the flop.";
  return `${decision} ${pressure} Folding preserves your stack without investing more.`;
}

function callReason(hand, situation, inPosition) {
  if (!situation.opponent) {
    return "Limping costs just another 0.5 BB, keeping the pot small when BB checks.";
  }
  const cost = situation.currentBet - situation.heroBet;
  if (situation.position === "BB" && situation.opponentAction === "Open")
    return `Calling the extra ${cost} BB guarantees a flop. ${inPosition ? "The blind discount and ability to respond to SB’s decisions help you realize equity without building a larger pot." : "The blind discount makes more hands worth defending, though future pressure can prevent you from realizing all of their equity."}`;
  if (situation.opponentAction === "Open") {
    return `Calling the extra ${cost} BB keeps the pot smaller. Strong hands in the calling range protect the more speculative ones. Both blinds can still squeeze, so a call does not guarantee a flop at this price.`;
  }
  if (situation.opponentAction === "4-bet")
    return fourBetCallReason(hand, situation, inPosition, cost);
  return `Calling the extra ${cost} BB keeps the pot smaller ${
    inPosition
      ? "while letting you use your opponent’s decisions to guide your play."
      : "and leaves room to use this hand’s postflop potential."
  }`;
}

function raiseReason(hand, situation, inPosition) {
  if (situation.opponentAction === "Limp")
    return "Raising to 3.5 BB puts pressure on SB’s limp. The raising range includes hands that can continue against a limp-reraise and selected hands that can release to further pressure.";
  if (situation.opponentAction === "Limp-reraise")
    return "4-betting to 28 BB pressures SB’s strong limp-reraising range. Only a narrow portion of the prior raising range takes this line, mixing strong hands with selected ace and king blockers. This raise leaves chips for later decisions.";
  if (situation.opponentAction === "Open")
    return openRaiseReason(hand, situation);
  if (situation.opponentAction === "4-bet") {
    return `5-betting all-in to 100 BB commits your remaining ${100 - situation.heroBet} BB. This hand belongs in the reference’s narrow shoving range at the recommended frequency.`;
  }
  if (!situation.opponent) {
    return situation.position === "SB"
      ? "Raising puts pressure on BB and builds the pot when it continues. The larger opening size discourages calls and compensates for the positional disadvantage."
      : "Raising can win the blinds immediately and builds the pot when an opponent continues.";
  }
  if (situation.lastAction === "call") {
    return "Re-raising puts this hand in the linear range built from high-equity hands. These hands can continue against a further raise and play well when the remaining stacks are small relative to the pot.";
  }
  return `4-betting puts pressure on the opponent and builds a larger pot if they continue.${
    inPosition
      ? ""
      : " Leaving less money behind relative to the pot reduces the opponent’s positional advantage."
  } The 4-bet range contains both strong hands and selected bluffs, so raising alone does not mean a hand should continue against a shove.`;
}

function openRaiseReason(hand, situation) {
  if (situation.position === "BB")
    return situation.opponent === "SB"
      ? "3-betting to 9 BB applies pressure to SB. The polarized range combines strong hands with selected blocker and board-coverage bluffs, while many medium-strength hands take a flop instead."
      : `3-betting to 10 BB pressures ${situation.opponent}. ${situation.opponent === "BTN" ? "Against BTN’s wider opening range, the reference uses a more linear range built around strong hands." : "Suitedness, connectivity and useful blockers help selected hands handle the stronger opening range."}`;
  if (situation.position === "SB")
    return `3-betting to 10 BB puts pressure on ${situation.opponent} and BB. This reference uses 3-bet or fold from SB: the larger size compensates for playing out of position and discourages BB from entering. The range widens against later openers, following each hand’s recommended frequency.`;
  if (situation.position === "BTN") {
    return `3-betting to 8.5 BB puts pressure on ${situation.opponent} and the blinds. BTN’s polarized 3-bet range mixes strong hands with selected bluffs.`;
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

function openFoldReason(decision, situation) {
  if (situation.position === "BB")
    return `${decision} The 1 BB already posted is a discount, not a reason to defend every hand. This hand’s equity and postflop playability do not justify continuing at a higher frequency against ${situation.opponent}. Folding preserves your stack without investing more.`;
  if (situation.position === "SB")
    return `${decision} The 0.5 BB already posted is only a discount on entry. Acting first postflop and facing an active BB make it harder to realize this hand’s equity. Folding preserves your stack without investing more.`;
  if (situation.position === "BTN")
    return `${decision} You still need enough strength against ${situation.opponent}’s opening range. Folding preserves your stack without investing more.`;
  const pressure =
    situation.opponent === "HJ"
      ? "HJ starts wider than LJ, but still has a stronger range than a random hand."
      : "LJ starts with a tight range.";
  return `${decision} ${pressure} Folding limits exposure to that pressure and preserves your stack without investing more.`;
}

function fourBetCallReason(hand, situation, inPosition, cost) {
  const strength =
    hand === "AA"
      ? "Keeping AA in the calling range protects it: a call can still contain the strongest starting hand."
      : inPosition
        ? "You can use the opponent’s decisions to guide your play against a strong range."
        : "This hand has enough postflop potential to continue, though future pressure can prevent it from realizing all of its equity.";
  const widerDefense =
    situation.position === "CO" &&
    situation.opponent === "HJ" &&
    ["KJs", "ATs", "KTs"].includes(hand)
      ? " Against HJ’s wider starting range, suited broadways like this one join CO’s defense at the recommended frequency."
      : "";
  return `Calling the extra ${cost} BB leaves chips for postflop play. ${strength}${widerDefense}`;
}
