import { html } from "lit";
import { formatAmount } from "./currency.js";

/** @param {import('./learn.js').Learn} learn */
export function stopLearnReplay(learn) {
  clearTimeout(learn.replayTimer);
  learn.replayTimer = undefined;
  learn.replayIndex = undefined;
}

/** @param {import('./learn.js').Learn} learn */
export function startLearnReplay(learn) {
  stopLearnReplay(learn);
  if (!learn.scenario?.replay.length) return;
  learn.replayIndex = 0;
  scheduleAdvance(learn);
}

/** @param {import('./learn.js').Learn} learn */
function scheduleAdvance(learn) {
  learn.replayTimer = setTimeout(() => {
    if (learn.replayIndex === undefined) return;
    learn.replayIndex++;
    if (learn.replayStep) scheduleAdvance(learn);
    else stopLearnReplay(learn);
  }, 900);
}

/**
 * @param {import('./learn.js').Learn} learn
 * @param {import('../backend/learn-types.js').LearnReplayStep} step
 */
function describeAction(learn, step) {
  const action = step.action;
  if (!action) return "Watch the action before your turn.";
  const seat = /** @type {import('../backend/learn-types.js').LearnSeat} */ (
    step.seats[action.seat]
  );
  const player = seat.isCurrentPlayer ? "You" : seat.player.name;
  if (action.action === "fold") return `${player} folds.`;
  const verb = action.action === "call" ? "call" : "raise";
  return `${player} ${verb}${seat.isCurrentPlayer ? "" : "s"} to ${formatAmount(action.amount, learn.displayBigBlind)}.`;
}

/**
 * @param {import('./learn.js').Learn} learn
 * @param {import('../backend/learn-types.js').LearnReplayStep} step
 */
export function renderLearnReplay(learn, step) {
  return html`<h2 class="learn-question">Playing to your turn</h2>
    <p role="status">${describeAction(learn, step)}</p>
    <button
      class="button"
      @click=${() => {
        stopLearnReplay(learn);
      }}
    >
      Skip to decision
    </button>`;
}
