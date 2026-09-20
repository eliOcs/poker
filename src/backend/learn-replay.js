import { learnSituation, LEARN_POSITIONS } from "./learn-situations.js";

/**
 * @typedef {import('./learn-types.js').LearnSituation} LearnSituation
 * @typedef {import('./learn-types.js').LearnReplayAction} LearnReplayAction
 * @typedef {import('./learn-types.js').LearnReplayStep} LearnReplayStep
 * @typedef {import('./learn-types.js').LearnSeat} LearnSeat
 */

/**
 * Build only the actions that precede this decision, never the learner's answer.
 * Follow-up lessons reuse their earlier situation for the opening/limping round.
 * @param {LearnSituation} situation
 * @param {number} bigBlind
 * @returns {LearnReplayAction[]}
 */
function precedingActions(situation, bigBlind) {
  const hero = LEARN_POSITIONS.indexOf(situation.position);
  const opponent = situation.opponent
    ? LEARN_POSITIONS.indexOf(situation.opponent)
    : -1;
  const actions = situation.previousRangeKey
    ? precedingActions(
        learnSituation(
          // Playable follow-ups reference another playable decision.
          /** @type {import('./learn-types.js').SituationKey} */ (
            situation.previousRangeKey
          ),
        ),
        bigBlind,
      )
    : Array.from(
        { length: hero },
        (_, seat) =>
          /** @type {LearnReplayAction} */ (
            seat === opponent && !situation.lastAction
              ? {
                  seat,
                  action:
                    situation.opponentAction === "Limp" ? "call" : "raise",
                  amount: situation.currentBet * bigBlind,
                }
              : { seat, action: "fold" }
          ),
      );
  if (!situation.lastAction) return actions;

  actions.push({
    seat: hero,
    action: situation.lastAction,
    amount: situation.heroBet * bigBlind,
  });
  const folded = new Set(
    actions.filter(({ action }) => action === "fold").map(({ seat }) => seat),
  );
  for (let seat = (hero + 1) % 6; seat !== hero; seat = (seat + 1) % 6) {
    if (folded.has(seat)) continue;
    actions.push(
      seat === opponent
        ? { seat, action: "raise", amount: situation.currentBet * bigBlind }
        : { seat, action: "fold" },
    );
  }
  return actions;
}

/**
 * Server-authored snapshots keep the browser responsible only for playback.
 * @param {LearnSituation} situation
 * @param {LearnSeat[]} decisionSeats
 * @param {import('./learn-types.js').LearnScenario['blinds']} blinds
 * @returns {LearnReplayStep[]}
 */
export function createLearnReplay(situation, decisionSeats, blinds) {
  const actions = precedingActions(situation, blinds.big);
  if (!actions.length) return [];
  /** @type {LearnSeat[]} */
  let seats = decisionSeats.map((seat, index) => {
    const bet = index === 4 ? blinds.small : index === 5 ? blinds.big : 0;
    return /** @satisfies {LearnSeat} */ ({
      ...seat,
      folded: false,
      lastAction: undefined,
      bet,
      stack: seat.stack + seat.bet - bet,
      cards: seat.isCurrentPlayer ? seat.cards : ["??", "??"],
      isActing: index === 0,
    });
  });
  /** @type {LearnReplayStep[]} */
  const steps = [{ seats }];
  const hero = decisionSeats.findIndex((seat) => seat.isCurrentPlayer);
  actions.forEach((action, index) => {
    const nextActor = actions[index + 1]?.seat ?? hero;
    seats = seats.map((seat, seatIndex) => {
      const updated = { ...seat, isActing: seatIndex === nextActor };
      if (seatIndex !== action.seat) return updated;
      updated.lastAction = action.action;
      if (action.action === "fold") {
        updated.folded = true;
        updated.cards = [];
      } else {
        updated.stack -= action.amount - updated.bet;
        updated.bet = action.amount;
      }
      return updated;
    });
    steps.push({ seats, action });
  });
  return steps;
}
