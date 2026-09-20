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
  },
  CO_RAISE_BTN: {
    position: "CO",
    opponent: "BTN",
    title: "CO Open vs BTN 3-bet",
    history:
      "You raised to 2.5 BB. BTN 3-bet to 8.5 BB and both blinds folded.",
    heroBet: 2.5,
    currentBet: 8.5,
    minRaiseTo: 14.5,
    lastAction: "raise",
    explanationTitle: "Out of position vs BTN",
  },
  CO_RAISE_SB: {
    position: "CO",
    opponent: "SB",
    title: "CO Open vs SB 3-bet",
    history:
      "You raised to 2.5 BB. BTN folded, SB 3-bet to 10 BB and BB folded.",
    heroBet: 2.5,
    currentBet: 10,
    minRaiseTo: 17.5,
    lastAction: "raise",
    explanationTitle: "In position vs SB",
  },
  CO_RAISE_BB: {
    position: "CO",
    opponent: "BB",
    title: "CO Open vs BB 3-bet",
    history: "You raised to 2.5 BB. BTN and SB folded, then BB 3-bet to 10 BB.",
    heroBet: 2.5,
    currentBet: 10,
    minRaiseTo: 17.5,
    lastAction: "raise",
    explanationTitle: "In position vs BB",
  },
  HJ_RAISE_CO: {
    position: "HJ",
    opponent: "CO",
    title: "HJ Open vs CO 3-bet",
    history:
      "You raised to 2.5 BB. CO 3-bet to 8.5 BB; BTN and both blinds folded.",
    heroBet: 2.5,
    currentBet: 8.5,
    minRaiseTo: 14.5,
    lastAction: "raise",
    explanationTitle: "Out of position vs CO",
  },
  HJ_RAISE_BTN: {
    position: "HJ",
    opponent: "BTN",
    title: "HJ Open vs BTN 3-bet",
    history:
      "You raised to 2.5 BB. CO folded, BTN 3-bet to 8.5 BB and both blinds folded.",
    heroBet: 2.5,
    currentBet: 8.5,
    minRaiseTo: 14.5,
    lastAction: "raise",
    explanationTitle: "Out of position vs BTN",
  },
  HJ_RAISE_SB: {
    position: "HJ",
    opponent: "SB",
    title: "HJ Open vs SB 3-bet",
    history:
      "You raised to 2.5 BB. CO and BTN folded, SB 3-bet to 10 BB and BB folded.",
    heroBet: 2.5,
    currentBet: 10,
    minRaiseTo: 17.5,
    lastAction: "raise",
    explanationTitle: "In position vs SB",
  },
  HJ_RAISE_BB: {
    position: "HJ",
    opponent: "BB",
    title: "HJ Open vs BB 3-bet",
    history:
      "You raised to 2.5 BB. CO, BTN and SB folded, then BB 3-bet to 10 BB.",
    heroBet: 2.5,
    currentBet: 10,
    minRaiseTo: 17.5,
    lastAction: "raise",
    explanationTitle: "In position vs BB",
  },
  LJ_RAISE_HJ: {
    position: "LJ",
    opponent: "HJ",
    title: "LJ Open vs HJ 3-bet",
    history:
      "You raised to 2.5 BB. HJ 3-bet to 8.5 BB; CO, BTN and both blinds folded.",
    heroBet: 2.5,
    currentBet: 8.5,
    minRaiseTo: 14.5,
    lastAction: "raise",
    explanationTitle: "Out of position vs HJ",
  },
  LJ_RAISE_CO: {
    position: "LJ",
    opponent: "CO",
    title: "LJ Open vs CO 3-bet",
    history:
      "You raised to 2.5 BB. HJ folded, CO 3-bet to 8.5 BB; BTN and both blinds folded.",
    heroBet: 2.5,
    currentBet: 8.5,
    minRaiseTo: 14.5,
    lastAction: "raise",
    explanationTitle: "Out of position vs CO",
  },
  LJ_RAISE_BTN: {
    position: "LJ",
    opponent: "BTN",
    title: "LJ Open vs BTN 3-bet",
    history:
      "You raised to 2.5 BB. HJ and CO folded, BTN 3-bet to 8.5 BB and both blinds folded.",
    heroBet: 2.5,
    currentBet: 8.5,
    minRaiseTo: 14.5,
    lastAction: "raise",
    explanationTitle: "Out of position vs BTN",
  },
  LJ_RAISE_SB: {
    position: "LJ",
    opponent: "SB",
    title: "LJ Open vs SB 3-bet",
    history:
      "You raised to 2.5 BB. HJ, CO and BTN folded, SB 3-bet to 10 BB and BB folded.",
    heroBet: 2.5,
    currentBet: 10,
    minRaiseTo: 17.5,
    lastAction: "raise",
    explanationTitle: "In position vs SB",
  },
  LJ_RAISE_BB: {
    position: "LJ",
    opponent: "BB",
    title: "LJ Open vs BB 3-bet",
    history:
      "You raised to 2.5 BB. HJ, CO, BTN and SB folded, then BB 3-bet to 10 BB.",
    heroBet: 2.5,
    currentBet: 10,
    minRaiseTo: 17.5,
    lastAction: "raise",
    explanationTitle: "In position vs BB",
  },
};

// The range catalog also contains strategies that are not yet practice lessons.
export const LEARN_SITUATION_KEYS = [
  "LJ",
  "HJ",
  "CO",
  "BTN",
  "SB",
  ...Object.keys(FOLLOWUPS),
];

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
