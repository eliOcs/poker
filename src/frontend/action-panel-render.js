import { html } from "lit";
import { formatCurrency } from "./currency.js";
import { renderRebuyDecision } from "./action-panel-rebuy.js";
import { ICONS } from "./icons.js";
import { formatPosition } from "./action-panel-format.js";

function buildActionMap(actions) {
  const actionMap = {};
  if (actions) {
    for (const action of actions) actionMap[action.action] = action;
  }
  return actionMap;
}

function renderWaitingForPlayers(panel) {
  return html`
    <div class="waiting-panel">
      <span class="waiting">Waiting for players...</span>
      ${panel.canSit
        ? html`<button
            type="button"
            class="button button--primary"
            @click=${() => panel.sendAction({ action: "sit" })}
          >
            ${panel.buyIn ? `Sit ${formatCurrency(panel.buyIn)}` : "Sit"}
          </button>`
        : ""}
    </div>
  `;
}

function renderBuyIn(panel, action) {
  const minBB = action.min ?? 20;
  const maxBB = action.max ?? 100;
  const bigBlind = action.bigBlind ?? panel.bigBlind;
  const minStack = minBB * bigBlind;
  const maxStack = maxBB * bigBlind;
  const defaultStack = Math.min(80, maxBB) * bigBlind;
  const stack =
    panel.betAmount >= minStack && panel.betAmount <= maxStack
      ? panel.betAmount
      : defaultStack;
  const bbCount = Math.round(stack / bigBlind);

  return html`
    <div class="betting-panel">
      <phg-currency-slider
        .value=${stack}
        .min=${minStack}
        .max=${maxStack}
        .step=${panel.chipDenomination * 10}
        @value-changed=${(e) => (panel.betAmount = e.detail.value)}
      ></phg-currency-slider>
      <div class="action-row">
        <button
          type="button"
          class="button button--secondary button--full-width"
          @click=${() =>
            panel.sendAction({
              action: "buyIn",
              seat: panel.seatIndex,
              amount: bbCount,
            })}
        >
          <span class="stacked">Buy In ${formatCurrency(stack)}</span>
        </button>
      </div>
    </div>
  `;
}

function renderSitInLeave(panel, actionMap) {
  return html`
    <div class="action-row">
      ${actionMap.leave
        ? html`<button
            type="button"
            class="button button--muted button--full-width"
            @click=${() =>
              panel.sendAction({ action: "leave", seat: panel.seatIndex })}
          >
            Leave Table
          </button>`
        : ""}
      ${actionMap.sitIn
        ? html`<button
            type="button"
            class="button button--success button--full-width"
            @click=${() =>
              panel.sendAction({ action: "sitIn", seat: panel.seatIndex })}
          >
            Sit In
          </button>`
        : ""}
    </div>
  `;
}

function renderBetPresets(panel, min, max) {
  const presets =
    panel.pot === 0
      ? [
          { label: "Min", raw: min },
          { label: "2.5 BB", raw: Math.round(2.5 * panel.bigBlind) },
          { label: "3 BB", raw: 3 * panel.bigBlind },
          { label: "Max", raw: max },
        ]
      : [
          { label: "Min", raw: min },
          { label: "½ Pot", raw: Math.round(panel.pot / 2) },
          { label: "Pot", raw: panel.pot },
          { label: "Max", raw: max },
        ];
  return html`
    <div class="bet-presets">
      ${presets.map(
        ({ label, raw }) => html`
          <button
            type="button"
            class="button button--muted button--full-width"
            ?disabled=${raw > max}
            @click=${() =>
              (panel.betAmount = Math.max(min, Math.min(max, raw)))}
          >
            ${label}
          </button>
        `,
      )}
    </div>
  `;
}

function renderBettingButtons(panel, actionMap, isBet, currentValue, isAllIn) {
  return html`
    ${actionMap.fold
      ? html`<button
          type="button"
          class="button button--danger button--full-width"
          @click=${() =>
            panel.sendAction({ action: "fold", seat: panel.seatIndex })}
        >
          Fold
        </button>`
      : undefined}
    ${actionMap.check
      ? html`<button
          type="button"
          class="button button--success button--full-width"
          @click=${() =>
            panel.sendAction({ action: "check", seat: panel.seatIndex })}
        >
          Check
        </button>`
      : undefined}
    ${actionMap.call
      ? html`<button
          type="button"
          class=${`button button--${actionMap.call.allIn ? "primary" : "success"} button--full-width`}
          @click=${() =>
            panel.sendAction({
              action: actionMap.call.allIn ? "allIn" : "call",
              seat: panel.seatIndex,
            })}
        >
          <span class="stacked"
            >${actionMap.call.allIn ? "All-In" : "Call"}
            ${formatCurrency(actionMap.call.amount)}</span
          >
        </button>`
      : undefined}
    <button
      type="button"
      class=${`button button--${isAllIn ? "primary" : "action"} button--full-width`}
      @click=${() =>
        panel.sendAction(
          isAllIn
            ? { action: "allIn", seat: panel.seatIndex }
            : {
                action: isBet ? "bet" : "raise",
                seat: panel.seatIndex,
                amount: currentValue,
              },
        )}
    >
      <span class="stacked"
        >${isAllIn ? "All-In" : isBet ? "Bet" : "Raise to"}
        ${formatCurrency(currentValue)}</span
      >
    </button>
  `;
}

function renderBettingSlider(panel, actionMap, betAction) {
  const isBet = (actionMap.bet ?? undefined) !== undefined;
  const min = betAction.min;
  const max = betAction.max;
  if (panel.betAmount < min) panel.betAmount = min;
  const currentValue = Math.max(min, Math.min(max, panel.betAmount));
  const isAllIn = currentValue >= max;

  return html`
    <div class="betting-panel">
      ${renderBetPresets(panel, min, max)}
      <phg-currency-slider
        .value=${currentValue}
        .min=${min}
        .max=${max}
        .step=${panel.chipDenomination}
        @value-changed=${(e) => (panel.betAmount = e.detail.value)}
      ></phg-currency-slider>
      <div class="action-row">
        ${renderBettingButtons(panel, actionMap, isBet, currentValue, isAllIn)}
      </div>
    </div>
  `;
}

function renderSimpleActions(panel, actionMap) {
  const buttons = [];
  if (actionMap.fold) {
    buttons.push(
      html`<button
        type="button"
        class="button button--danger button--full-width"
        @click=${() =>
          panel.sendAction({ action: "fold", seat: panel.seatIndex })}
      >
        Fold
      </button>`,
    );
  }
  if (actionMap.check) {
    buttons.push(
      html`<button
        type="button"
        class="button button--success button--full-width"
        @click=${() =>
          panel.sendAction({ action: "check", seat: panel.seatIndex })}
      >
        Check
      </button>`,
    );
  }
  if (actionMap.call) {
    buttons.push(
      html`<button
        type="button"
        class=${`button button--${actionMap.call.allIn ? "primary" : "success"} button--full-width`}
        @click=${() =>
          panel.sendAction({
            action: actionMap.call.allIn ? "allIn" : "call",
            seat: panel.seatIndex,
          })}
      >
        <span class="stacked"
          >${actionMap.call.allIn ? "All-In" : "Call"}
          ${formatCurrency(actionMap.call.amount)}</span
        >
      </button>`,
    );
  }
  if (actionMap.allIn && !actionMap.call?.allIn) {
    buttons.push(
      html`<button
        type="button"
        class="button button--primary button--full-width"
        @click=${() =>
          panel.sendAction({ action: "allIn", seat: panel.seatIndex })}
      >
        <span class="stacked"
          >All-In ${formatCurrency(actionMap.allIn.amount)}</span
        >
      </button>`,
    );
  }
  return buttons.length > 0
    ? html`<div class="action-row game-action-row">${buttons}</div>`
    : undefined;
}

function renderCallClockButton(panel) {
  return html`<button
    type="button"
    class="button button--warning button--full-width"
    style="--button-icon-size: 24px; --button-content-gap: var(--space-md);"
    @click=${() =>
      panel.sendAction({ action: "callClock", seat: panel.seatIndex })}
  >
    <span class="button__icon">${ICONS.clock}</span>Call the clock
  </button>`;
}

function renderShowButtons(panel, actionMap) {
  const showActions = [
    { key: "showCard1", cards: actionMap.showCard1?.cards },
    { key: "showCard2", cards: actionMap.showCard2?.cards },
    { key: "showBothCards", cards: actionMap.showBothCards?.cards },
  ].filter((entry) => entry.cards?.length);

  if (showActions.length === 0) return;

  return html`
    <div class="action-row game-action-row">
      ${showActions.map(
        (entry) => html`
          <button
            type="button"
            class="button button--action button--full-width"
            @click=${() =>
              panel.sendAction({ action: entry.key, seat: panel.seatIndex })}
          >
            <span class="show-action">
              <span>Show</span>
              <span class="show-cards">
                ${entry.cards.map(
                  (card) => html`<phg-card .card=${card}></phg-card>`,
                )}
              </span>
            </span>
          </button>
        `,
      )}
    </div>
  `;
}

function renderEmoteButton(panel) {
  return html`<button
    type="button"
    class="button button--secondary button--full-width"
    @click=${() =>
      panel.dispatchEvent(
        new CustomEvent("open-emote-picker", {
          bubbles: true,
          composed: true,
        }),
      )}
  >
    Emote
  </button>`;
}

function renderChatButton(panel) {
  return html`<button
    type="button"
    class="button button--secondary button--full-width"
    @click=${() =>
      panel.dispatchEvent(
        new CustomEvent("open-chat", {
          bubbles: true,
          composed: true,
        }),
      )}
  >
    Chat
  </button>`;
}

function renderSocialRow(panel, actionMap) {
  const socialButtons = [];
  if (actionMap.emote) socialButtons.push(renderEmoteButton(panel));
  if (actionMap.chat) socialButtons.push(renderChatButton(panel));
  return socialButtons.length > 0
    ? html`<div class="action-row social-action-row">${socialButtons}</div>`
    : undefined;
}

function preActionToggle(panel, isActive, setAction) {
  return () =>
    panel.sendAction(isActive ? { action: "clearPreAction" } : setAction);
}

function preActionCheckbox(isChecked) {
  return html`<input
    class="pre-action-checkbox"
    type="checkbox"
    .checked=${isChecked}
    disabled
    aria-hidden="true"
  />`;
}

function renderPreActionNoBet(panel, callClock) {
  const isActive = panel.preAction?.type === "checkFold";
  return html`
    <div class="action-row game-action-row">
      <button
        type="button"
        class="button button--danger button--full-width button--pre-action"
        @click=${preActionToggle(panel, isActive, {
          action: "preAction",
          type: "checkFold",
        })}
      >
        <span class="pre-action-label"
          >${preActionCheckbox(isActive)} Check / Fold</span
        >
      </button>
      ${callClock}
    </div>
  `;
}

function renderPreActionWithBet(panel, callClock) {
  const toCall = panel.currentBet - panel.myBet;
  const callAmount = Math.min(toCall, panel.myStack);
  const isFoldActive = panel.preAction?.type === "checkFold";
  const isCallActive =
    panel.preAction?.type === "callAmount" &&
    panel.preAction?.amount === callAmount;

  return html`
    <div class="action-row game-action-row">
      <button
        type="button"
        class="button button--danger button--full-width button--pre-action"
        @click=${preActionToggle(panel, isFoldActive, {
          action: "preAction",
          type: "checkFold",
        })}
      >
        <span class="pre-action-label"
          >${preActionCheckbox(isFoldActive)} Fold</span
        >
      </button>
      <button
        type="button"
        class="button button--success button--full-width button--pre-action"
        @click=${preActionToggle(panel, isCallActive, {
          action: "preAction",
          type: "callAmount",
          amount: callAmount,
        })}
      >
        <span class="pre-action-label"
          >${preActionCheckbox(isCallActive)}
          <span class="stacked">Call ${formatCurrency(callAmount)}</span></span
        >
      </button>
      ${callClock}
    </div>
  `;
}

function renderPreActionButtons(panel, callClock) {
  if (panel.isActing || !panel.inHand) return;
  const toCall = panel.currentBet - panel.myBet;
  return toCall === 0
    ? renderPreActionNoBet(panel, callClock)
    : renderPreActionWithBet(panel, callClock);
}

function renderWaitingActions(panel, actionMap) {
  const simple = renderSimpleActions(panel, actionMap);
  const showButtons = renderShowButtons(panel, actionMap);
  const socialRow = renderSocialRow(panel, actionMap);
  if (simple) return html`${simple}${showButtons}${socialRow}`;

  const callClock = actionMap.callClock ? renderCallClockButton(panel) : "";
  const preActions = renderPreActionButtons(panel, callClock);
  const callClockOnlyRow =
    !preActions && actionMap.callClock
      ? html`<div class="action-row game-action-row">
          ${renderCallClockButton(panel)}
        </div>`
      : undefined;
  return html`${preActions}${callClockOnlyRow}${showButtons}${socialRow}`;
}

function renderStart(panel, actionMap) {
  const showButtons = renderShowButtons(panel, actionMap);
  const socialRow = renderSocialRow(panel, actionMap);
  return html`
    <div class="action-row game-action-row">
      <button
        type="button"
        class="button button--primary button--full-width"
        @click=${() => panel.sendAction({ action: "start" })}
      >
        Start Game
      </button>
    </div>
    ${showButtons}${socialRow}
  `;
}

function renderForActionMap(panel, actionMap) {
  if (actionMap.buyIn) return renderBuyIn(panel, actionMap.buyIn);
  if (actionMap.rebuy) return renderRebuyDecision(panel);
  if (actionMap.sitIn || actionMap.leave)
    return renderSitInLeave(panel, actionMap);
  if (actionMap.start) return renderStart(panel, actionMap);
  const betAction = actionMap.bet ?? actionMap.raise;
  if (betAction) return renderBettingSlider(panel, actionMap, betAction);
  return renderWaitingActions(panel, actionMap);
}

function renderTournamentResult(panel) {
  if (panel.isWinner) {
    return html`<span class="waiting tournament-result winner"
      >You've won!</span
    >`;
  }
  if ((panel.bustedPosition ?? undefined) !== undefined) {
    return html`<span class="waiting tournament-result"
      >You finished in ${formatPosition(panel.bustedPosition)} place</span
    >`;
  }
  return;
}

export function renderActionPanel(panel) {
  const tournamentResult = renderTournamentResult(panel);
  if (tournamentResult) return tournamentResult;

  if (panel.connectionStatus !== "connected") {
    return html`<span class="waiting"
      >${panel.connectionStatus === "connecting"
        ? "Reconnecting..."
        : "Disconnected"}</span
    >`;
  }

  if (!panel.actions || panel.actions.length === 0) {
    if (panel.seatedCount < 2) return renderWaitingForPlayers(panel);
    if (panel.seatIndex === -1) return html``;
    return html`<span class="waiting">Waiting for your turn...</span>`;
  }

  return renderForActionMap(panel, buildActionMap(panel.actions));
}
