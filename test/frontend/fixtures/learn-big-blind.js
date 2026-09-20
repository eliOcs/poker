import { learnScenario } from "./learn.js";

export function bigBlindScenario(opponent, stage = "OPEN") {
  const villain = ["LJ", "HJ", "CO", "BTN", "SB"].indexOf(opponent);
  const situation =
    stage === "OPEN" || stage === "4BET"
      ? openAmounts(opponent, stage)
      : {
          LIMP: {
            hero: 1,
            current: 1,
            min: 2,
            title: "BB vs SB Limp",
            history:
              "Everyone else folded. SB called to 1 BB; you can check or raise.",
          },
          LIMP_RAISE: {
            hero: 3.5,
            current: 13,
            min: 22.5,
            title: "BB Raise vs SB Limp-reraise",
            history:
              "Everyone else folded. SB limped to 1 BB, you raised to 3.5 BB and SB re-raised to 13 BB.",
          },
        }[stage];
  const raised = ["4BET", "LIMP_RAISE"].includes(stage);
  const bets = [0, 0, 0, 0, 250, situation.hero * 500];
  bets[villain] = situation.current * 500;
  return {
    ...learnScenario,
    id: `BB_VS_${opponent}_${stage}-AA`,
    position: "BB",
    actions: stage === "LIMP" ? ["check", "raise"] : ["fold", "call", "raise"],
    title: situation.title,
    history: situation.history,
    currentBet: situation.current * 500,
    minRaiseTo: situation.min * 500,
    seats: learnScenario.seats.map((seat, i) => ({
      ...seat,
      player: { name: ["UTG", "UTG+1", "CO", "BTN", "SB", "You · BB"][i] },
      bet: bets[i],
      stack: 50000 - bets[i],
      isCurrentPlayer: i === 5,
      isActing: i === 5,
      folded: i !== 5 && i !== villain,
      lastAction: lastAction(i, villain, raised, stage),
      cards: i === 5 ? ["As", "Ah"] : i === villain ? ["??", "??"] : [],
    })),
  };
}

function lastAction(seat, villain, raised, stage) {
  if (seat === 5) return raised ? "raise" : undefined;
  if (seat === villain) return stage === "LIMP" ? "call" : "raise";
  return "fold";
}

function openAmounts(opponent, stage) {
  const threeBet = opponent === "SB" ? 9 : 10;
  const fourBet = opponent === "SB" ? 24 : 23;
  const open = opponent === "SB" ? 3 : 2.5;
  return stage === "OPEN"
    ? {
        hero: 1,
        current: open,
        min: 2 * open - 1,
        title: `BB vs ${opponent} Open`,
        history: `${opponent} opened to ${open} BB and everyone else folded. You close the action.`,
      }
    : {
        hero: threeBet,
        current: fourBet,
        min: 2 * fourBet - threeBet,
        title: `BB 3-bet vs ${opponent} 4-bet`,
        history: `${opponent} opened to ${open} BB and everyone else folded. You 3-bet to ${threeBet} BB; ${opponent} 4-bet to ${fourBet} BB.`,
      };
}
