import { FOLLOWUP_NOTES } from "./learn-followup-notes.js";
import { BIG_BLIND_NOTES } from "./learn-big-blind.js";

// Teaching heuristics for the recommended actions, not per-action EV estimates.
/** @type {Partial<Record<import("./learn-types.js").Position, string>>} */
const OPENING_CONTEXT = {
  LJ: "Five players still have a chance to enter the pot, and UTG+1, CO and BTN have position on you after the flop.",
  HJ: "Four players remain, and both the cutoff and button have position on you after the flop.",
  CO: "Three players remain, and the button has position on you after the flop.",
  BTN: "Only the blinds remain, and you have position on both of them after the flop.",
  SB: "Only the big blind remains, but you are out of position and act first after the flop.",
};

// Modern Poker Theory, PDF pages 181–207 and 216–250.
// Range-wide takeaways complement the current hand's action reasons. Follow-up
// notes describe the opponent from the learner's perspective and distinguish
// actions already taken from possible responses to a later raise.
/** @satisfies {Partial<Record<import("./learn-types.js").RangeKey, import("./learn-types.js").LearnNote[]>>} */
export const LEARN_RANGE_NOTES = {
  ...BIG_BLIND_NOTES,
  ...FOLLOWUP_NOTES,
  // First-in guidance: PDF pages 181–182, 184–186, 188, 193 and 199.
  LJ: [
    {
      title: "A tight range still needs variety",
      text: "Your opening range favors high-equity hands with useful blockers, but retains some small pairs and suited connectors. Those occasional opens let your range make strong hands on different flop textures instead of relying only on high cards. They remain selective mixes, not permission to open every speculative hand.",
    },
  ],
  HJ: [
    {
      title: "Trim frequency as you move earlier",
      text: "Compared with CO, your opening range gives less room to small pairs, weaker offsuit broadways, suited connectors and weak suited kings or queens. Some remain occasional opens rather than disappearing altogether. Follow their individual mixes instead of treating every pair or suited connector as an automatic raise.",
    },
  ],
  CO: [
    {
      title: "Do not borrow the button’s whole range",
      text: "Moving one seat earlier removes many of BTN’s weak suited kings and queens, offsuit aces and speculative connectors from profitable opens. Being suited or connected is not enough on its own. Use the CO chart rather than carrying over every hand you would open on the button.",
    },
  ],
  BTN: [
    {
      title: "Why the reference raises or folds",
      text: "Unlike SB, you get no discount on an open-limp. Limping invites the blinds to enter or raise, while rake further reduces the value of seeing a cheap flop. Raising or folding keeps you from building a separate limping range that is vulnerable to that pressure.",
    },
  ],
  SB: [
    {
      title: "Limps and raises work together",
      text: "Splitting your playable hands between limps and raises lets you enter more pots without putting every one of those hands into your raising range. That keeps your raises more selective and makes BB’s 3-bets less effective. The two ranges work together; limping is part of the strategy, not simply a weaker substitute for raising.",
    },
  ],
  // Hijack guidance and Hand Ranges 56–57: PDF pages 216–218.
  HJ_VS_LJ_OPEN: [
    {
      title: "Small pairs belong in a tight 3-bet range",
      text: "Your response uses 3-bet or fold, but the raising range is not exclusively big cards. Occasional 3-bets with pairs from 88 down to 22 spread set potential across more flop textures and make opponents’ blockers less effective at narrowing your range. Replacing all those small pairs with more frequent raises of just the highest pair would lose that variety.",
    },
  ],
  HJ_VS_LJ_4BET: [
    {
      title: "Strong calls protect the rest of your defense",
      text: "Most of your continuing range calls in position rather than shoving. Keeping AA among those calls protects hands such as smaller pairs, suited broadways and selected suited connectors or wheel aces. Premiums do not all take the same action: AA mixes calls and shoves, while QQ mostly calls but sometimes shoves.",
    },
  ],
  SB_VS_LJ_OPEN: [
    {
      title: "The blind discount does not justify a call",
      text: "SB uses 3-bet or fold against LJ, entering about 7.3% of all starting hands. Posting 0.5 BB makes a call cheaper, but SB would act first postflop and BB can still squeeze or overcall. Under the book’s raked cash-game assumptions, those disadvantages outweigh the discount.",
    },
    {
      title: "Raise larger from out of position",
      text: "The reference 3-bet is 10 BB against the 2.5 BB open, compared with 8.5 BB in position. The larger size compensates for having to act first after the flop.",
    },
  ],
  SB_VS_HJ_OPEN: [
    {
      title: "Widen against the wider opener",
      text: "SB increases its 3-bet range from about 7.3% against LJ to 8.7% against HJ. A9s, KQo, K9s and J9s enter or gain frequency, alongside hands already near the edge of the range.",
    },
    {
      title: "Keep the 3-bet-or-fold structure",
      text: "The wider response still has no flat calls in this reference. The risk of a BB squeeze, poor equity realization out of position and rake still make flat-calling unattractive.",
    },
  ],
  SB_VS_CO_OPEN: [
    {
      title: "Add another layer of 3-bets",
      text: "Against CO, SB 3-bets about 10.9% of all starting hands, up from 8.7% against HJ. AJo, A8s and T9s gain partial 3-bets, and other hands near the boundary appear more often. CO’s wider opening range allows this expansion.",
    },
    {
      title: "More hands, the same positional problem",
      text: "SB still uses 3-bet or fold. The risk of a BB squeeze, poor equity realization out of position and rake prevent the wider defense from adding flat calls.",
    },
  ],
  SB_VS_BTN_OPEN: [
    {
      title: "Defend most widely against BTN",
      text: "SB 3-bets about 15% of all starting hands against BTN, compared with 10.9% against CO. The range adds offsuit broadways such as ATo, suited hands such as A7s and Q9s, and mixes with T8s, 98s, 87s and 76s. Hands already near the edge also gain frequency.",
    },
    {
      title: "A wider defense still uses 3-bet or fold",
      text: "BTN’s wide open invites more resistance, but SB still has no flat calls in this reference. The risk of a BB squeeze and poor equity realization out of position still discourage calling under the book’s raked assumptions.",
    },
  ],
  SB_VS_LJ_4BET: [
    {
      title: "Calling remains possible out of position",
      text: "After SB 3-bets and LJ 4-bets, the source folds about 33.8%, calls 45.7% and shoves 20.6% of the prior 3-bet range. AKs shoves, AA and AKo mix, and QQ and JJ mostly call. Strong slowplays protect the calls even though SB acts first postflop.",
    },
    {
      title: "Preserve the opponent’s possible bluffs",
      text: "Small suited connectors and medium pairs can make better calls than AQo or suited king- and queen-high hands. They leave more of LJ’s bluff combinations available while retaining useful postflop potential. Raw high-card strength alone does not determine a good defense.",
    },
  ],
  SB_VS_HJ_4BET: [
    {
      title: "A wider 3-bet range needs more defense",
      text: "After expanding against HJ’s open, SB also calls more hands against the 4-bet. AQo begins calling occasionally, while KQs, KJs and KTs gain partial calls. Folding all of those additions would make the wider 3-bet range too easy to attack.",
    },
    {
      title: "Protect a substantial calling range",
      text: "The reference calls with roughly 47% of the range that already 3-bet. Keeping AA among those calls protects the weaker hands in that defense.",
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
      text: "KK, QQ and AK shove, while JJ and TT mix calls with shoves. A5s mostly shoves, with some calls. AQo, suited broadways and selected suited connectors or wheel aces also continue by calling, alongside partial calls with AJo, A9s, K9s and QTs.",
    },
  ],
  BTN_VS_LJ_OPEN: [
    {
      title: "Position makes room for calls",
      text: "BTN always acts last postflop, even if a blind enters. Unlike HJ and CO, it has a flat-calling range against opens: about 6.9% of all starting hands against LJ, alongside 7.3% 3-bets. Calls favor postflop playability and coverage of different boards; 3-bets are more polarized, mixing strong hands with selected bluffs.",
    },
    {
      title: "Protect calls against squeezes",
      text: "The blinds can still re-raise after a call. Keeping some QQ, JJ, TT, 99 and AKo among the calls stops that range from being only weak hands. Suited broadways such as AQs, AJs and KQs also help it withstand squeezes and play postflop.",
    },
    {
      title: "Do not build rules around tiny outliers",
      text: "The source treats unusual K6s, K5s and 53s mixes as likely solver-convergence artifacts, not a special discovery about those hands. The chart retains the measured frequencies, but the practical lesson is the overall range structure rather than memorizing tiny exceptions.",
    },
  ],
  BTN_VS_HJ_OPEN: [
    {
      title: "More 3-bets, slightly fewer calls",
      text: "Against HJ, BTN 3-bets about 8.8% of all starting hands and calls 6.5%, compared with 7.3% and 6.9% against LJ. HJ’s wider opening range lets BTN attack more, while the blinds can squeeze more often and give BTN’s calls less protection.",
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
      text: "The wider 3-bet range adds suited aces and offsuit broadways, emphasizing high-card value and blockers. Calls still retain hands with good postflop playability.",
    },
  ],
  BTN_VS_LJ_4BET: [
    {
      title: "Keep the shove range narrow",
      text: "LJ’s 4-bet range is strong. KK and AKs always shove in the reference, while AKo shoves about 64%, AA 44% and QQ only 5%. AA often calls and QQ mostly calls; even premium hands do not all commit the stack immediately.",
    },
    {
      title: "Most continuing hands call in position",
      text: "After BTN 3-bets and faces LJ’s 4-bet, the source folds 40.6%, calls 40% and shoves 19.4% of that prior 3-bet range. Calling lets hands with enough equity play a flop with position, while strong slowplays protect the calls.",
    },
  ],
  BTN_VS_HJ_4BET: [
    {
      title: "Expand both calls and value shoves",
      text: "Against HJ, QQ shoves about 38% in the source, compared with only 5% against LJ. AQo calls more often, and the defense adds calls with KTs, QJs, JTs and suited wheel aces. The source response is about 40% fold, 41.6% call and 18.4% shove over the hands that already 3-bet. Strong slowplays such as AA protect the calls.",
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
      text: "JJ starts shoving about 40%, while QQ shoves about 66% and AKo about 96% in the source.",
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
      text: "A9s, QTs and JTs gain 3-bet frequency against HJ, along with hands already near the edge of the range. These remain occasional raises rather than automatic additions to every 3-bet.",
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
      text: "Of the range that already 3-bet and now faces HJ’s 4-bet, the source folds about 35.8%, calls 48.2% and shoves 16.1%. Premium slowplays such as AA protect the weaker hands among those calls.",
    },
  ],
};

/**
 * @param {import('./learn-types.js').HandClass} hand
 * @param {import('./learn-types.js').LearnSituation} situation
 * @param {import('./learn-types.js').Frequencies} expected
 * @param {import('./learn-types.js').LearnAction[]} [actions]
 * @returns {string}
 */
export function explainLearnHand(
  hand,
  situation,
  expected,
  actions = ["fold", "call", "raise"],
) {
  const postflopOrder = ["SB", "BB", "LJ", "HJ", "CO", "BTN"];
  const inPosition =
    postflopOrder.indexOf(situation.position) >
    postflopOrder.indexOf(situation.opponent ?? "");
  const context =
    situation.opponentAction === "Open"
      ? facingOpenContext(situation)
      : situation.opponent
        ? `You are ${inPosition ? "in" : "out of"} position against ${situation.opponent} and act ${inPosition ? "last" : "first"} after the flop.`
        : OPENING_CONTEXT[situation.position];
  const reasons = {
    fold: () => foldReason(hand, situation, expected[0] === 100, inPosition),
    call: () => callReason(situation, inPosition),
    raise: () => raiseReason(situation, inPosition),
    check: () =>
      "Checking costs nothing and guarantees a flop without risking a limp-reraise.",
  };
  const recommended = actions.filter((_, i) => (expected[i] ?? 0) > 0);
  return [context, ...recommended.map((action) => reasons[action]())].join(" ");
}

/**
 * @param {import('./learn-types.js').LearnSituation & {opponent: import('./learn-types.js').Position}} situation
 */
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

/**
 * @param {import('./learn-types.js').HandClass} hand
 * @param {import('./learn-types.js').LearnSituation} situation
 * @param {boolean} pure
 * @param {boolean} inPosition
 */
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
  return `${decision} ${pressure}`;
}

/**
 * @param {import('./learn-types.js').LearnSituation} situation
 * @param {boolean} inPosition
 */
function callReason(situation, inPosition) {
  if (!situation.opponent) {
    return "Limping costs just another 0.5 BB, keeping the pot small when BB checks.";
  }
  if (situation.position === "BB" && situation.opponentAction === "Open")
    return `Calling guarantees a flop. ${inPosition ? "Responding to SB’s decisions helps you realize equity without building a larger pot." : "Keeping the pot smaller gives this hand room to realize its equity, though future pressure can still force a fold."}`;
  if (situation.opponentAction === "Open") {
    return "Calling keeps the pot smaller and leaves room to use this hand’s postflop potential.";
  }
  if (situation.opponentAction === "4-bet")
    return `Calling leaves chips for postflop play. ${
      inPosition
        ? "You can use the opponent’s decisions to guide your play against a strong range."
        : "This hand has enough postflop potential to continue, though future pressure can prevent it from realizing all of its equity."
    }`;
  return `Calling keeps the pot smaller ${
    inPosition
      ? "while letting you use your opponent’s decisions to guide your play."
      : "and leaves room to use this hand’s postflop potential."
  }`;
}

/**
 * @param {import('./learn-types.js').LearnSituation} situation
 * @param {boolean} inPosition
 */
function raiseReason(situation, inPosition) {
  if (situation.opponentAction === "Limp")
    return "Raising can win the pot immediately or build it when SB calls.";
  if (situation.opponentAction === "Limp-reraise")
    return "4-betting pressures SB’s strong limp-reraising range and builds a larger pot when called. This raise leaves chips for later decisions.";
  if (situation.opponentAction === "Open") return openRaiseReason(situation);
  if (situation.opponentAction === "4-bet") {
    return `5-betting all-in commits your remaining ${100 - situation.heroBet} BB. There are no chips left for postflop decisions if called.`;
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

/**
 * @param {import('./learn-types.js').LearnSituation & {opponent: import('./learn-types.js').Position}} situation
 */
function openRaiseReason(situation) {
  return `3-betting puts pressure on ${situation.opponent}${situation.position === "BB" ? "" : " and the players behind you"}, building a larger pot when called.`;
}

/**
 * @param {string} decision
 * @param {import('./learn-types.js').LearnSituation & {opponent: import('./learn-types.js').Position}} situation
 */
function openFoldReason(decision, situation) {
  if (situation.position === "BB")
    return `${decision} This hand’s equity and postflop playability do not justify continuing at a higher frequency against ${situation.opponent}, even with the blind discount.`;
  if (situation.position === "SB")
    return `${decision} The blind discount does not compensate for this hand’s difficulty realizing equity under pressure.`;
  if (situation.position === "BTN")
    return `${decision} You still need enough strength against ${situation.opponent}’s opening range.`;
  const pressure =
    situation.opponent === "HJ"
      ? "HJ starts wider than LJ, but still has a stronger range than a random hand."
      : "LJ starts with a tight range.";
  return `${decision} ${pressure}`;
}
