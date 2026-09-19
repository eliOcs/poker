// Bet amounts here are street totals in BB. Convert to cents at the view boundary.
const FOLLOWUPS = {
  SB_LIMP_BB: {
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
    title: "SB Open vs BB 3-bet",
    history: "You raised to 3 BB. BB 3-bet to 9 BB.",
    heroBet: 3,
    currentBet: 9,
    minRaiseTo: 15,
    lastAction: "raise",
    explanation:
      "You opened from the small blind and the big blind re-raised. You will act first after the flop. Many medium-strength hands prefer calling the extra 6 BB. The reference 4-bets a polarized range of strong hands and selected bluffs, including hands that block strong opposing holdings.",
  },
};

export function learnSituation(key) {
  const followup = FOLLOWUPS[key];
  return {
    position: followup ? "SB" : key,
    title: "First In",
    history: "Everyone before you folded.",
    heroBet: key === "SB" ? 0.5 : 0,
    currentBet: 1,
    minRaiseTo: 2,
    ...followup,
  };
}
