export const learnScenario = {
  id: "SB-AA",
  position: "SB",
  hand: "AA",
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
