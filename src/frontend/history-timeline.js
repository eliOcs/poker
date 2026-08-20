import { html } from "lit";
import { formatCurrency } from "./currency.js";
import {
  getReplayEntryStatus,
  getReplayStepIndexForAction,
  getReplayStepIndexForStreet,
} from "./history-replay.js";

/**
 * @param {import('./history.js').History} history
 * @param {string} status
 */
function renderResult(history, status) {
  const mainPot = history.hand?.pots[0];
  if (!mainPot) return "";

  const winningHand = mainPot.winning_hand;
  const winningCards = mainPot.winning_cards;
  const winTotals = new Map();
  for (const pot of history.hand.pots) {
    for (const win of pot.player_wins) {
      winTotals.set(
        win.player_id,
        (winTotals.get(win.player_id) ?? 0) + win.win_amount,
      );
    }
  }

  return html`<div class="result-entry ${status}">
    ${[...winTotals].map(([winnerId, winAmount]) => {
      const isYou = winnerId === history.playerId;
      const playerName = history.getPlayerName(winnerId);
      return html`
        <div class="showdown-winner ${isYou ? "you" : ""}">
          <span class="winner-name">${playerName}</span> won
          <span class="winner-amount">${formatCurrency(winAmount)}</span>
        </div>
      `;
    })}
    ${winningHand ? html`<div class="showdown-hand">${winningHand}</div>` : ""}
    ${winningCards?.length
      ? html`<div class="showdown-cards">
          ${winningCards.map(
            (card) =>
              html`<phg-card
                .card=${card}
                noAnimation
                size="medium"
              ></phg-card>`,
          )}
        </div>`
      : ""}
  </div>`;
}

/**
 * @param {import('./history.js').History} history
 * @param {object} action
 */
function renderAction(history, action) {
  const actionStepIndex = getReplayStepIndexForAction(
    history,
    action.action_number,
  );
  const status = getReplayEntryStatus(history, actionStepIndex);
  const isYou = action.player_id === history.playerId;
  const playerName = history.getPlayerName(action.player_id);

  return html`
    <div class="action-item ${status}">
      <span class="action-player ${isYou ? "you" : ""}">${playerName}</span>
      ${action.action}
      ${action.cards?.length
        ? html`<span class="action-cards"
            >${action.cards.map(
              (card) =>
                html`<phg-card
                  .card=${card}
                  noAnimation
                  size="medium"
                ></phg-card>`,
            )}</span
          >`
        : ""}
      ${action.amount
        ? html`<span class="action-amount"
            >${formatCurrency(action.amount)}</span
          >`
        : ""}
    </div>
  `;
}

function renderStreetCards(cards) {
  if (!cards) return "";
  return html`<div class="street-cards">
    ${cards.map(
      (card) =>
        html`<phg-card .card=${card} noAnimation size="medium"></phg-card>`,
    )}
  </div>`;
}

function getRoundReplayState(history, round) {
  const streetName = round.street;
  const streetStatus = getReplayEntryStatus(
    history,
    getReplayStepIndexForStreet(history, streetName),
    streetName,
  );
  return { streetName, streetStatus };
}

function renderRoundActions(history, round, showResult) {
  const actions = round.actions.filter(
    (action) => action.action !== "Dealt Cards",
  );
  const resultStatus = getReplayEntryStatus(
    history,
    history.replay.steps.length - 1,
  );
  return html`<div class="action-list">
    ${actions.map((action) => renderAction(history, action))}
    ${showResult ? renderResult(history, resultStatus) : ""}
  </div>`;
}

/**
 * @param {import('./history.js').History} history
 * @param {object} round
 * @param {number} roundIndex
 * @param {number} roundCount
 */
function renderRound(history, round, roundIndex, roundCount) {
  const { streetName, streetStatus } = getRoundReplayState(history, round);
  const isLastRound = roundIndex === roundCount - 1;

  return html`
    <div class="street ${streetStatus}">
      <div class="street-header ${streetStatus}">${streetName}</div>
      ${renderStreetCards(round.cards)}
      ${renderRoundActions(history, round, isLastRound)}
    </div>
  `;
}

/**
 * @param {import("./history.js").History} history
 * @param {{ minHeight: number, maxHeight: number, height: number }} aria
 */
export function renderHistoryTimeline(history, aria) {
  const rounds = history.hand.rounds;
  return html`
    <div
      class="timeline-panel"
      style=${history.timelineHeight === undefined
        ? ""
        : `--timeline-height: ${history.timelineHeight}px`}
    >
      <div
        class="timeline-resize-handle"
        role="separator"
        aria-label="Resize action history"
        aria-orientation="horizontal"
        aria-valuemin=${aria.minHeight}
        aria-valuemax=${aria.maxHeight}
        aria-valuenow=${aria.height}
        tabindex="0"
        @pointerdown=${history.handleTimelineResizeStart}
        @keydown=${history.handleTimelineResizeKeydown}
        title="Drag to resize action history"
      >
        <span class="timeline-resize-grip"></span>
      </div>
      <div class="timeline">
        <div class="timeline-content">
          ${rounds.map((round, index) =>
            renderRound(history, round, index, rounds.length),
          )}
        </div>
      </div>
    </div>
  `;
}
