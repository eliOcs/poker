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
  const currentBet = opponent === "CO" || opponent === "BTN" ? 4250 : 5000;
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
