// Bet amounts here are street totals in BB. Convert to cents at the view boundary.
const FOLLOWUPS = {
  SB_LIMP_BB: {
    position: "SB",
    opponent: "BB",
    title: "SB Limp vs BB Raise",
    history: "You called to 1 BB. BB raised to 3.5 BB.",
    heroBet: 1,
    currentBet: 3.5,
    minRaiseTo: 6,
    lastAction: "call",
    explanation:
      "You limped from the small blind and the big blind raised. You will act first after the flop. The reference re-raises a range built around high-equity hands, while calling with other hands that can continue for the extra 2.5 BB.",
  },
  SB_RAISE_BB: {
    position: "SB",
    opponent: "BB",
    title: "SB Open vs BB 3-bet",
    history: "You raised to 3 BB. BB 3-bet to 9 BB.",
    heroBet: 3,
    currentBet: 9,
    minRaiseTo: 15,
    lastAction: "raise",
    explanation:
      "You opened from the small blind and the big blind re-raised. You will act first after the flop. Many medium-strength hands prefer calling the extra 6 BB. The reference 4-bets a polarized range of strong hands and selected bluffs, including hands that block strong opposing holdings.",
  },
  BTN_RAISE_SB: {
    position: "BTN",
    opponent: "SB",
    title: "BTN Open vs SB 3-bet",
    history: "You raised to 2.5 BB. SB 3-bet to 10 BB and BB folded.",
    heroBet: 2.5,
    currentBet: 10,
    minRaiseTo: 17.5,
    lastAction: "raise",
    explanation:
      "You opened on the button and the small blind re-raised. The big blind folded, leaving its 1 BB in the pot. You will act last after the flop, which helps you realize your hand’s equity by seeing what your opponent does first. The reference mostly calls with its continuing hands and uses a polarized 4-bet range of strong hands and selected bluffs with useful blockers.",
  },
  BTN_RAISE_BB: {
    position: "BTN",
    opponent: "BB",
    title: "BTN Open vs BB 3-bet",
    history: "You raised to 2.5 BB. SB folded and BB 3-bet to 10 BB.",
    heroBet: 2.5,
    currentBet: 10,
    minRaiseTo: 17.5,
    lastAction: "raise",
    explanation:
      "You opened on the button and the big blind re-raised after the small blind folded. The small blind’s 0.5 BB remains in the pot. You will act last after the flop, so many hands prefer calling to using a 4-bet that could face an all-in. The reference combines strong hands with selected bluffs in its 4-bet range, while preserving hands that play well after the flop in its calling range.",
  },
};

export function learnSituation(key) {
  const followup = FOLLOWUPS[key];
  const situation = {
    position: key,
    title: "First In",
    history: "Everyone before you folded.",
    heroBet: key === "SB" ? 0.5 : 0,
    currentBet: 1,
    minRaiseTo: 2,
    ...followup,
  };
  /** @type {Record<string, number>} */
  const bets = { SB: 0.5, BB: 1, [situation.position]: situation.heroBet };
  if (situation.opponent) bets[situation.opponent] = situation.currentBet;
  return {
    ...situation,
    bets,
    pot: Object.values(bets).reduce((sum, bet) => sum + bet, 0),
  };
}
