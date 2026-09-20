// Modern Poker Theory, Big Blind, PDF pages 237–250. Bet amounts are totals in BB.
/** @satisfies {Partial<Record<import("./learn-types.js").RangeKey, import("./learn-types.js").SituationDefinition>>} */
export const BIG_BLIND_SITUATIONS = {
  BB_VS_LJ_OPEN: {
    position: "BB",
    opponent: "LJ",
    opponentAction: "Open",
    opponentRangeKey: "LJ",
    title: "BB vs LJ Open",
    history:
      "LJ opened to 2.5 BB; HJ, CO, BTN and SB folded. You close the action.",
    heroBet: 1,
    currentBet: 2.5,
    minRaiseTo: 4,
    explanationTitle: "Out of position vs LJ",
  },
  BB_VS_LJ_4BET: {
    position: "BB",
    opponent: "LJ",
    opponentAction: "4-bet",
    opponentRangeKey: "LJ_RAISE_BB",
    previousRangeKey: "BB_VS_LJ_OPEN",
    lastAction: "raise",
    title: "BB 3-bet vs LJ 4-bet",
    history:
      "LJ opened to 2.5 BB; HJ, CO, BTN and SB folded. You 3-bet to 10 BB and LJ 4-bet to 23 BB.",
    heroBet: 10,
    currentBet: 23,
    minRaiseTo: 36,
    explanationTitle: "Out of position vs LJ",
  },
  BB_VS_HJ_OPEN: {
    position: "BB",
    opponent: "HJ",
    opponentAction: "Open",
    opponentRangeKey: "HJ",
    title: "BB vs HJ Open",
    history:
      "LJ folded, HJ opened to 2.5 BB; CO, BTN and SB folded. You close the action.",
    heroBet: 1,
    currentBet: 2.5,
    minRaiseTo: 4,
    explanationTitle: "Out of position vs HJ",
  },
  BB_VS_HJ_4BET: {
    position: "BB",
    opponent: "HJ",
    opponentAction: "4-bet",
    opponentRangeKey: "HJ_RAISE_BB",
    previousRangeKey: "BB_VS_HJ_OPEN",
    lastAction: "raise",
    title: "BB 3-bet vs HJ 4-bet",
    history:
      "LJ folded, HJ opened to 2.5 BB; CO, BTN and SB folded. You 3-bet to 10 BB and HJ 4-bet to 23 BB.",
    heroBet: 10,
    currentBet: 23,
    minRaiseTo: 36,
    explanationTitle: "Out of position vs HJ",
  },
  BB_VS_CO_OPEN: {
    position: "BB",
    opponent: "CO",
    opponentAction: "Open",
    opponentRangeKey: "CO",
    title: "BB vs CO Open",
    history:
      "LJ and HJ folded, CO opened to 2.5 BB; BTN and SB folded. You close the action.",
    heroBet: 1,
    currentBet: 2.5,
    minRaiseTo: 4,
    explanationTitle: "Out of position vs CO",
  },
  BB_VS_CO_4BET: {
    position: "BB",
    opponent: "CO",
    opponentAction: "4-bet",
    opponentRangeKey: "CO_RAISE_BB",
    previousRangeKey: "BB_VS_CO_OPEN",
    lastAction: "raise",
    title: "BB 3-bet vs CO 4-bet",
    history:
      "LJ and HJ folded, CO opened to 2.5 BB; BTN and SB folded. You 3-bet to 10 BB and CO 4-bet to 23 BB.",
    heroBet: 10,
    currentBet: 23,
    minRaiseTo: 36,
    explanationTitle: "Out of position vs CO",
  },
  BB_VS_BTN_OPEN: {
    position: "BB",
    opponent: "BTN",
    opponentAction: "Open",
    opponentRangeKey: "BTN",
    title: "BB vs BTN Open",
    history:
      "LJ, HJ and CO folded, BTN opened to 2.5 BB and SB folded. You close the action.",
    heroBet: 1,
    currentBet: 2.5,
    minRaiseTo: 4,
    explanationTitle: "Out of position vs BTN",
  },
  BB_VS_BTN_4BET: {
    position: "BB",
    opponent: "BTN",
    opponentAction: "4-bet",
    opponentRangeKey: "BTN_RAISE_BB",
    previousRangeKey: "BB_VS_BTN_OPEN",
    lastAction: "raise",
    title: "BB 3-bet vs BTN 4-bet",
    history:
      "LJ, HJ and CO folded, BTN opened to 2.5 BB and SB folded. You 3-bet to 10 BB and BTN 4-bet to 23 BB.",
    heroBet: 10,
    currentBet: 23,
    minRaiseTo: 36,
    explanationTitle: "Out of position vs BTN",
  },
  BB_VS_SB_OPEN: {
    position: "BB",
    opponent: "SB",
    opponentAction: "Open",
    opponentRangeKey: "SB",
    title: "BB vs SB Open",
    history:
      "LJ, HJ, CO and BTN folded, then SB opened to 3 BB. You close the action.",
    heroBet: 1,
    currentBet: 3,
    minRaiseTo: 5,
    explanationTitle: "In position vs SB",
  },
  BB_VS_SB_4BET: {
    position: "BB",
    opponent: "SB",
    opponentAction: "4-bet",
    opponentRangeKey: "SB_RAISE_BB",
    previousRangeKey: "BB_VS_SB_OPEN",
    lastAction: "raise",
    title: "BB 3-bet vs SB 4-bet",
    history:
      "LJ, HJ, CO and BTN folded, then SB opened to 3 BB. You 3-bet to 9 BB and SB 4-bet to 24 BB.",
    heroBet: 9,
    currentBet: 24,
    minRaiseTo: 39,
    explanationTitle: "In position vs SB",
  },
  BB_VS_SB_LIMP: {
    position: "BB",
    opponent: "SB",
    opponentAction: "Limp",
    opponentRangeKey: "SB",
    opponentRangeAction: "call",
    title: "BB vs SB Limp",
    history:
      "LJ, HJ, CO and BTN folded. SB called to 1 BB. You can check or raise.",
    heroBet: 1,
    currentBet: 1,
    minRaiseTo: 2,
    explanationTitle: "A free flop in position",
  },
  BB_VS_SB_LIMP_RAISE: {
    position: "BB",
    opponent: "SB",
    opponentAction: "Limp-reraise",
    opponentRangeKey: "SB_LIMP_BB",
    opponentPriorAction: "call",
    previousRangeKey: "BB_VS_SB_LIMP",
    lastAction: "raise",
    title: "BB Raise vs SB Limp-reraise",
    history:
      "LJ, HJ, CO and BTN folded. SB limped to 1 BB, you raised to 3.5 BB and SB re-raised to 13 BB.",
    heroBet: 3.5,
    currentBet: 13,
    minRaiseTo: 22.5,
    explanationTitle: "In position vs SB’s limp-reraise",
  },
};

// Original paraphrases of the position guidance; chart approximations grade practice.
/** @satisfies {Partial<Record<import("./learn-types.js").RangeKey, import("./learn-types.js").LearnNote[]>>} */
export const BIG_BLIND_NOTES = {
  BB_VS_LJ_OPEN: [
    {
      title: "Defend the blind, but respect LJ’s tight range",
      text: "Folding every BB would lose 100 BB per 100 hands from this seat. The aim is to reduce that loss through profitable defenses, not to defend everything. Against LJ, the source 3-bets about 5.8% and calls 22.8% of starting hands. The blind discount and closing the action help, but LJ’s strength still limits speculative calls and bluffs.",
    },
    {
      title: "Playability can beat a higher card",
      text: "AQo–ATo favor calls over 3-bets against LJ: they struggle in bigger pots out of position and often cannot continue against a 4-bet. Suited broadways, suited aces and connected hands make better candidates for aggressive mixes. A9o folds while K2s calls in the reference, illustrating why equity realization matters more than a high card alone.",
    },
  ],
  BB_VS_LJ_4BET: [
    {
      title: "Keep premiums in both calls and shoves",
      text: "AKs shoves, while AA, KK, AKo and QQ mix calls with shoves. A5s also has a bluff-shove frequency. These responses apply after BB has already 3-bet; a strong starting hand does not automatically mean an all-in.",
    },
    {
      title: "Use postflop potential in the calling defense",
      text: "Pairs, suited aces and connected suited hands make up much of the calling range, including mixes with JTs and 54s. BB is out of position and calls another 13 BB into 33.5 BB. Immediate pot odds are about 28%, but later betting and equity realization still matter.",
    },
  ],
  BB_VS_HJ_OPEN: [
    {
      title: "Widen a little from LJ to HJ",
      text: "Against HJ, the source 3-bets about 7.6% and calls 23.9% of all starting hands, compared with 5.8% and 22.8% against LJ. Much of the expansion comes from giving hands near the boundary more frequency. Continue to distinguish a hand that mixes from one that always defends.",
    },
    {
      title: "Closing the action supports calls",
      text: "Only HJ remains in the pot, so calling cannot invite a squeeze behind you. The 1 BB already posted reduces the extra price to 1.5 BB. That supports a substantial calling range, although BB still acts first after the flop.",
    },
  ],
  BB_VS_HJ_4BET: [
    {
      title: "A wider 3-bet range needs additional calls",
      text: "The response resembles BB’s defense against LJ, but adds some KJs and KTs calls to support the wider preceding 3-bet range. Calls and shoves are conditional responses to the 4-bet, not percentages of all starting hands.",
    },
    {
      title: "Do not overgeneralize small solver quirks",
      text: "The chart mixes shoves with JJ while QQ calls. The source treats such small irregularities as possible blocker effects rather than universal rules to memorize. Learn the overall defense and use the displayed hand mix for this specific situation.",
    },
  ],
  BB_VS_CO_OPEN: [
    {
      title: "Expand both calls and 3-bets",
      text: "Against CO, the source defends about 35.4% of starting hands: 9.7% 3-bets and 25.7% calls. That is about 3.9 percentage points more defense than against HJ. Both parts widen by adding hands and increasing frequencies near their boundaries.",
    },
    {
      title: "Weak offsuit hands still struggle",
      text: "K8o and Q9o fold against CO in the reference. Disconnected offsuit hands often struggle to realize equity out of position with deep stacks. A wider opener and a blind discount do not make every high-card hand a profitable call.",
    },
  ],
  BB_VS_CO_4BET: [
    {
      title: "More polarized 4-bets invite more calls",
      text: "CO’s 4-bet range has a clearer mix of strong hands and bluffs than LJ’s or HJ’s. BB responds by calling more and keeping AA among its calls more often. The source calls roughly half of the range that already 3-bet, while shoving less often than against the earlier positions.",
    },
    {
      title: "Broaden the calling defense selectively",
      text: "The defense incorporates more calls with hands such as KQs, AQo, A5s, A9s and A4s. Those hands do not all use the same frequency. Follow the displayed mixes and preserve strong slowplays rather than treating every call as a capped, weak range.",
    },
  ],
  BB_VS_BTN_OPEN: [
    {
      title: "A much wider calling defense",
      text: "BTN’s wide opening range lets BB defend substantially more: the source 3-bets about 13.4% and calls 43.4% of starting hands. Calls include many suited hands, offsuit aces, connectors and broadways. BTN has fewer strong hands relative to its whole range, reducing the pressure it can apply indiscriminately after the flop.",
    },
    {
      title: "Build a more linear 3-bet range",
      text: "Against BTN, BB 3-bets more aggressively with a range built around high-equity hands. This differs from the more polarized approach used in position against SB. The raise is 10 BB against BTN’s 2.5 BB open, and BB still acts first postflop.",
    },
  ],
  BB_VS_BTN_4BET: [
    {
      title: "Defend mainly by calling",
      text: "BTN’s polarized 4-bet range gives BB reason to continue mainly through calls. Strong slowplays sit alongside hands with useful equity and postflop playability, including suited aces, suited kings, AQo, connected suited hands and pairs. The displayed chart governs each hand’s mix.",
    },
    {
      title: "Mix value shoves and selected wheel-ace bluffs",
      text: "The shoving range includes strong pairs and ace-king, with some mixed actions and wheel-ace bluffs such as A5s and A4s. AA also remains among the calls. A hand’s shove percentage describes what to do when holding it here, not how much of the entire 3-bet range it represents.",
    },
  ],
  BB_VS_SB_OPEN: [
    {
      title: "Position changes the range structure",
      text: "Against SB’s 3 BB open, BB has position and uses a polarized 3-bet range: strong hands that can continue against a 4-bet, plus selected blocker and board-coverage bluffs that can fold. Medium-strength hands often prefer calling and realizing equity in position. The reference 3-bet is 9 BB.",
    },
    {
      title: "Even position does not rescue the worst hands",
      text: "The source 3-bets about 16.3%, calls 48.3% and folds 35.4% of all starting hands. Some offsuit aces and kings appear as blocker bluffs. The worst hands still fold under the book’s raked cash-game assumptions; the positional advantage is not a reason to enter with everything.",
    },
  ],
  BB_VS_SB_4BET: [
    {
      title: "Slowplay strong hands in position",
      text: "Against SB’s polarized 4-bet, BB calls AA every time in the reference and often calls KK and AKs too. Position makes taking a flop attractive, so even very strong hands need not shove. Calls also include other hands with enough playability.",
    },
    {
      title: "Release the bottom of the polarized range",
      text: "Some hands entered as 3-bet bluffs and now fold. The source response is about 41.2% fold, 46.2% call and 12.6% shove over the preceding 3-bet range. SB has raised to 24 BB after BB’s 9 BB 3-bet; calling costs 15 BB into 33 BB, about 31% immediate pot odds.",
    },
  ],
  BB_VS_SB_LIMP: [
    {
      title: "A free flop is a real option",
      text: "SB has matched the 1 BB blind, so BB can check without paying more and see a flop in position. There is no need to fold. The source checks about 59.4% and raises 40.6% of starting hands, using a raise to 3.5 BB.",
    },
    {
      title: "Raise hands with different responses to a reraise",
      text: "The raising range combines hands that can call an SB limp-reraise in position with selected hands that can raise and then fold. Keeping medium-strength hands among the checks preserves their equity without inflating the pot. Raising does not commit every hand to further aggression.",
    },
  ],
  BB_VS_SB_LIMP_RAISE: [
    {
      title: "A narrow 4-bet range after the limp-reraise",
      text: "After SB limps, BB raises to 3.5 BB and SB reraises to 13 BB, the source 4-bets only about 7.3% of BB’s prior raising range. Those raises mix strong hands such as TT+ and AK with selected ace and king blockers. The reference 4-bet is 28 BB, leaving chips behind.",
    },
    {
      title: "Continue selectively in position",
      text: "The source calls about 41.3% and folds 51.4% of the hands that already raised the limp. BB calls another 9.5 BB into 16.5 BB, about 37% immediate pot odds, and acts last postflop. SB’s range must reflect both its initial limp and its later reraise; it is not the same as an opening-raise range.",
    },
  ],
};
