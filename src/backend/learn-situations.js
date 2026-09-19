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
      "After you limp and BB raises to 3.5 BB, the reference re-raises a linear range built from high-equity hands. These hands can continue against a further raise and play well when the remaining stacks are small relative to the pot (low SPR). You are still out of position after the flop; other playable hands call the extra 2.5 BB.",
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
      "After you open to 3 BB and BB 3-bets to 9 BB, medium-strength hands often prefer calling the extra 6 BB: they want to see a flop without 4-betting and then folding to an all-in. This leaves a polarized 4-bet range of strong hands and selected bluffs with useful blockers. Those hands have a plan to call or fold against a 5-bet shove, while retaining coverage of different boards if BB calls. You still act first after the flop.",
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
      "You have position on the small blind and act last after the flop. Preserve that advantage by mostly calling with hands that continue. Keep a polarized 4-bet range of strong hands and selected bluffs with useful blockers and coverage of different boards. A 4-bet lets the blind respond with a 5-bet shove, forcing you to fold some hands that could have played well by calling. The book uses similar defenses against both blinds, but recommends slightly more defense against SB: the folded BB leaves 1 BB, giving you better calling odds than against BB.",
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
      "You have position on the big blind and act last after the flop. Preserve that advantage by mostly calling with hands that continue. Keep a polarized 4-bet range of strong hands and selected bluffs with useful blockers and coverage of different boards. A 4-bet lets the blind respond with a 5-bet shove, forcing you to fold some hands that could have played well by calling. The book uses similar defenses against both blinds, but recommends slightly less defense against BB: the folded SB leaves only 0.5 BB, giving you a smaller pot than against SB.",
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
    explanation:
      "The button is the exception: you are out of position and must act first after the flop. Compared with facing either blind, the reference 4-bets more and calls less, trying to win the pot preflop. If called, the larger pot leaves less money behind relative to it, reducing the button’s positional advantage. Weaker hands also fold more often because playing them out of position is harder.",
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
    explanation:
      "You are in position against the small blind: you act last after the flop and can see what your opponent does before deciding. That advantage makes calling more attractive. Compared with facing the button, the reference calls more and 4-bets less, continuing mostly by calling. Its smaller, polarized 4-bet range combines strong hands with selected bluffs.",
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
    explanation:
      "You are in position against the big blind: you act last after the flop and can see what your opponent does before deciding. That advantage makes calling more attractive. Compared with facing the button, the reference calls more and 4-bets less, continuing mostly by calling. Its smaller, polarized 4-bet range combines strong hands with selected bluffs.",
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
