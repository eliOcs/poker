export const learnScenario = {
  id: "SB-AA",
  position: "SB",
  hand: "AA",
  title: "First In",
  history: "Everyone before you folded.",
  currentBet: 500,
  minRaiseTo: 1000,
  blinds: { small: 250, big: 500 },
  seats: Array.from({ length: 6 }, (_, i) => ({
    empty: false,
    allIn: false,
    sittingOut: false,
    disconnected: false,
    player: { name: ["UTG", "UTG+1", "CO", "BTN", "You · SB", "BB"][i] },
    stack: 50000 - (i === 4 ? 250 : i === 5 ? 500 : 0),
    bet: i === 4 ? 250 : i === 5 ? 500 : 0,
    cards: i === 4 ? ["As", "Ah"] : i === 5 ? ["??", "??"] : [],
    isCurrentPlayer: i === 4,
    isActing: i === 4,
    folded: i < 4,
  })),
};

export function followupScenario(raised = false) {
  return {
    ...learnScenario,
    id: `${raised ? "SB_RAISE_BB" : "SB_LIMP_BB"}-AA`,
    title: raised ? "SB Open vs BB 3-bet" : "SB Limp vs BB Raise",
    history: raised
      ? "You raised to 3 BB. BB 3-bet to 9 BB."
      : "You called to 1 BB. BB raised to 3.5 BB.",
    currentBet: raised ? 4500 : 1750,
    minRaiseTo: raised ? 7500 : 3000,
    seats: learnScenario.seats.map((seat, i) => {
      const bet =
        i === 4 ? (raised ? 1500 : 500) : i === 5 ? (raised ? 4500 : 1750) : 0;
      return {
        ...seat,
        bet,
        stack: 50000 - bet,
        lastAction: i < 4 ? "fold" : i === 5 || raised ? "raise" : "call",
      };
    }),
  };
}

export function openFollowupScenario(position, opponent) {
  const positions = ["LJ", "HJ", "CO", "BTN", "SB", "BB"];
  const hero = positions.indexOf(position);
  const villain = positions.indexOf(opponent);
  const currentBet = ["HJ", "CO", "BTN"].includes(opponent) ? 4250 : 5000;
  const bets = [0, 0, 0, 0, 250, 500];
  bets[hero] = 1250;
  bets[villain] = currentBet;
  return {
    ...learnScenario,
    id: `${position}_RAISE_${opponent}-AA`,
    position,
    title: `${position} Open vs ${opponent} 3-bet`,
    history: `You raised to 2.5 BB. ${opponent} 3-bet to ${currentBet / 500} BB; everyone else folded.`,
    currentBet,
    minRaiseTo: currentBet * 2 - 1250,
    seats: learnScenario.seats.map((seat, i) => ({
      ...seat,
      player: {
        name: `${i === hero ? "You · " : ""}${["UTG", "UTG+1", "CO", "BTN", "SB", "BB"][i]}`,
      },
      bet: bets[i],
      stack: 50000 - bets[i],
      folded: i !== hero && i !== villain,
      lastAction: i === hero || i === villain ? "raise" : "fold",
      isCurrentPlayer: i === hero,
      isActing: i === hero,
      cards: i === hero ? ["As", "Ah"] : i === villain ? ["??", "??"] : [],
    })),
  };
}

export function hijackScenario(facingFourBet = false) {
  return earlyPositionScenario("HJ", "LJ", facingFourBet);
}

export function cutoffScenario(opponent, facingFourBet = false) {
  return earlyPositionScenario("CO", opponent, facingFourBet);
}

export function buttonScenario(opponent, facingFourBet = false) {
  return earlyPositionScenario("BTN", opponent, facingFourBet);
}

function earlyPositionScenario(position, opponent, facingFourBet) {
  const positions = ["LJ", "HJ", "CO", "BTN", "SB", "BB"];
  const hero = positions.indexOf(position);
  const villain = positions.indexOf(opponent);
  const amounts = facingFourBet
    ? { heroBet: 4250, currentBet: 11500, minRaiseTo: 18750 }
    : { heroBet: 0, currentBet: 1250, minRaiseTo: 2000 };
  const bets = [0, 0, 0, 0, 250, 500];
  bets[hero] = amounts.heroBet;
  bets[villain] = amounts.currentBet;
  const behind = {
    HJ: "CO, BTN and both blinds",
    CO: "BTN and both blinds",
    BTN: "Both blinds",
  }[position];
  const opening = {
    HJ_LJ: "LJ raised to 2.5 BB.",
    CO_LJ: "LJ raised to 2.5 BB and HJ folded.",
    CO_HJ: "LJ folded and HJ raised to 2.5 BB.",
    BTN_LJ: "LJ raised to 2.5 BB; HJ and CO folded.",
    BTN_HJ: "LJ folded, HJ raised to 2.5 BB and CO folded.",
    BTN_CO: "LJ and HJ folded, then CO raised to 2.5 BB.",
  }[`${position}_${opponent}`];
  return {
    ...learnScenario,
    id: `${position}_VS_${opponent}_${facingFourBet ? "4BET" : "OPEN"}-AA`,
    position,
    title: facingFourBet
      ? `${position} 3-bet vs ${opponent} 4-bet`
      : `${position} vs ${opponent} Open`,
    history: facingFourBet
      ? `${opening} You 3-bet to 8.5 BB; ${behind} folded. ${opponent} 4-bet to 23 BB.`
      : `${opening} ${behind} are still to act.`,
    currentBet: amounts.currentBet,
    minRaiseTo: amounts.minRaiseTo,
    seats: learnScenario.seats.map((seat, i) => {
      const folded = i !== hero && i !== villain && (facingFourBet || i < hero);
      return {
        ...seat,
        player: {
          name: `${i === hero ? "You · " : ""}${["UTG", "UTG+1", "CO", "BTN", "SB", "BB"][i]}`,
        },
        bet: bets[i],
        stack: 50000 - bets[i],
        folded,
        lastAction: folded
          ? "fold"
          : i === villain || (i === hero && facingFourBet)
            ? "raise"
            : undefined,
        isCurrentPlayer: i === hero,
        isActing: i === hero,
        cards: lessonCards(i === hero, folded),
      };
    }),
  };
}

function lessonCards(hero, folded) {
  if (hero) return ["As", "Ah"];
  return folded ? [] : ["??", "??"];
}
