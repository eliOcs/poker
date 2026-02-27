import { html } from "lit";
import { formatCurrency } from "./styles.js";

function formatPosition(position) {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = position % 100;
  const suffix = suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
  return `${position}${suffix}`;
}

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
        ? html`<phg-button
            variant="primary"
            @click=${() => panel.sendAction({ action: "sit" })}
            >${panel.buyIn
              ? `Sit ${formatCurrency(panel.buyIn)}`
              : "Sit"}</phg-button
          >`
        : ""}
    </div>
  `;
}

function renderBuyIn(panel, action) {
  const minBB = action.min || 20;
  const maxBB = action.max || 100;
  const bigBlind = action.bigBlind || panel.bigBlind;
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
        <phg-button
          variant="secondary"
          full-width
          @click=${() =>
            panel.sendAction({
              action: "buyIn",
              seat: panel.seatIndex,
              amount: bbCount,
            })}
        >
          <span class="stacked"
            ><span>Buy In</span
            ><span class="amount">${formatCurrency(stack)}</span></span
          >
        </phg-button>
      </div>
    </div>
  `;
}

function renderSitInLeave(panel, actionMap) {
  return html`
    <div class="action-row">
      ${actionMap.leave
        ? html`<phg-button
            variant="muted"
            full-width
            @click=${() =>
              panel.sendAction({ action: "leave", seat: panel.seatIndex })}
            >Leave Table</phg-button
          >`
        : ""}
      ${actionMap.sitIn
        ? html`<phg-button
            variant="success"
            full-width
            @click=${() =>
              panel.sendAction({ action: "sitIn", seat: panel.seatIndex })}
            >Sit In</phg-button
          >`
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
          <phg-button
            variant="muted"
            full-width
            ?disabled=${raw > max}
            @click=${() =>
              (panel.betAmount = Math.max(min, Math.min(max, raw)))}
          >
            ${label}
          </phg-button>
        `,
      )}
    </div>
  `;
}

function renderBettingButtons(panel, actionMap, isBet, currentValue, isAllIn) {
  return html`
    ${actionMap.fold
      ? html`<phg-button
          variant="danger"
          full-width
          @click=${() =>
            panel.sendAction({ action: "fold", seat: panel.seatIndex })}
          >Fold</phg-button
        >`
      : null}
    ${actionMap.check
      ? html`<phg-button
          variant="success"
          full-width
          @click=${() =>
            panel.sendAction({ action: "check", seat: panel.seatIndex })}
          >Check</phg-button
        >`
      : null}
    ${actionMap.call
      ? html`<phg-button
          variant="${actionMap.call.allIn ? "primary" : "success"}"
          full-width
          @click=${() =>
            panel.sendAction({
              action: actionMap.call.allIn ? "allIn" : "call",
              seat: panel.seatIndex,
            })}
          ><span class="stacked"
            ><span>${actionMap.call.allIn ? "All-In" : "Call"}</span
            ><span class="amount"
              >${formatCurrency(actionMap.call.amount)}</span
            ></span
          ></phg-button
        >`
      : null}
    <phg-button
      variant="${isAllIn ? "primary" : "action"}"
      full-width
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
        ><span>${isAllIn ? "All-In" : isBet ? "Bet" : "Raise to"}</span
        ><span class="amount">${formatCurrency(currentValue)}</span></span
      >
    </phg-button>
  `;
}

function renderBettingSlider(panel, actionMap, betAction) {
  const isBet = actionMap.bet != null;
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
      html`<phg-button
        variant="danger"
        full-width
        @click=${() =>
          panel.sendAction({ action: "fold", seat: panel.seatIndex })}
        >Fold</phg-button
      >`,
    );
  }
  if (actionMap.check) {
    buttons.push(
      html`<phg-button
        variant="success"
        full-width
        @click=${() =>
          panel.sendAction({ action: "check", seat: panel.seatIndex })}
        >Check</phg-button
      >`,
    );
  }
  if (actionMap.call) {
    buttons.push(
      html`<phg-button
        variant="${actionMap.call.allIn ? "primary" : "success"}"
        full-width
        @click=${() =>
          panel.sendAction({
            action: actionMap.call.allIn ? "allIn" : "call",
            seat: panel.seatIndex,
          })}
        ><span class="stacked"
          ><span>${actionMap.call.allIn ? "All-In" : "Call"}</span
          ><span class="amount"
            >${formatCurrency(actionMap.call.amount)}</span
          ></span
        ></phg-button
      >`,
    );
  }
  return buttons.length > 0
    ? html`<div class="action-row">${buttons}</div>`
    : null;
}

function renderCallClockButton(panel) {
  return html`<phg-button
    variant="warning"
    full-width
    @click=${() =>
      panel.sendAction({ action: "callClock", seat: panel.seatIndex })}
    >Call Clock</phg-button
  >`;
}

function renderShowButtons(panel, actionMap) {
  const showActions = [
    { key: "showCard1", cards: actionMap.showCard1?.cards },
    { key: "showCard2", cards: actionMap.showCard2?.cards },
    { key: "showBothCards", cards: actionMap.showBothCards?.cards },
  ].filter((entry) => entry.cards?.length);

  if (showActions.length === 0) return null;

  return html`
    <div class="action-row">
      ${showActions.map(
        (entry) => html`
          <phg-button
            variant="action"
            full-width
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
          </phg-button>
        `,
      )}
    </div>
  `;
}

function renderEmoteButton(panel) {
  return html`<phg-button
    variant="secondary"
    full-width
    @click=${() =>
      panel.dispatchEvent(
        new CustomEvent("open-emote-picker", {
          bubbles: true,
          composed: true,
        }),
      )}
    >Emote</phg-button
  >`;
}

function renderChatButton(panel) {
  return html`<phg-button
    variant="secondary"
    full-width
    @click=${() =>
      panel.dispatchEvent(
        new CustomEvent("open-chat", {
          bubbles: true,
          composed: true,
        }),
      )}
    >Chat</phg-button
  >`;
}

function preActionToggle(panel, isActive, setAction) {
  return () =>
    panel.sendAction(isActive ? { action: "clearPreAction" } : setAction);
}

const uncheckedSvg = html`<svg
  class="pre-action-check"
  viewBox="0 0 24 24"
  fill="none"
>
  <rect x="4" y="2" width="16" height="2" fill="currentColor" />
  <rect x="4" y="20" width="16" height="2" fill="currentColor" />
  <rect x="2" y="4" width="2" height="16" fill="currentColor" />
  <rect x="20" y="4" width="2" height="16" fill="currentColor" />
</svg>`;

const checkedSvg = html`<svg
  class="pre-action-check"
  viewBox="0 0 24 24"
  fill="none"
>
  <rect x="4" y="2" width="16" height="2" fill="currentColor" />
  <rect x="4" y="20" width="16" height="2" fill="currentColor" />
  <rect x="2" y="4" width="2" height="16" fill="currentColor" />
  <rect x="20" y="4" width="2" height="16" fill="currentColor" />
  <rect x="7" y="12" width="2" height="2" fill="currentColor" />
  <rect x="9" y="14" width="2" height="2" fill="currentColor" />
  <rect x="11" y="12" width="2" height="2" fill="currentColor" />
  <rect x="13" y="10" width="2" height="2" fill="currentColor" />
  <rect x="15" y="8" width="2" height="2" fill="currentColor" />
</svg>`;

function renderPreActionNoBet(panel, callClock) {
  const isActive = panel.preAction?.type === "checkFold";
  return html`
    <div class="action-row">
      <phg-button
        variant="success"
        full-width
        pre-action
        @click=${preActionToggle(panel, isActive, {
          action: "preAction",
          type: "checkFold",
        })}
        ><span class="pre-action-label"
          >${isActive ? checkedSvg : uncheckedSvg} Check / Fold</span
        ></phg-button
      >
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
    <div class="action-row">
      <phg-button
        variant="danger"
        full-width
        pre-action
        @click=${preActionToggle(panel, isFoldActive, {
          action: "preAction",
          type: "checkFold",
        })}
        ><span class="pre-action-label"
          >${isFoldActive ? checkedSvg : uncheckedSvg} Fold</span
        ></phg-button
      >
      <phg-button
        variant="success"
        full-width
        pre-action
        @click=${preActionToggle(panel, isCallActive, {
          action: "preAction",
          type: "callAmount",
          amount: callAmount,
        })}
        ><span class="pre-action-label"
          >${isCallActive ? checkedSvg : uncheckedSvg}
          <span class="stacked"
            ><span>Call</span
            ><span class="amount">${formatCurrency(callAmount)}</span></span
          ></span
        ></phg-button
      >
      ${callClock}
    </div>
  `;
}

function renderPreActionButtons(panel, callClock) {
  if (panel.isActing || !panel.inHand) return null;
  const toCall = panel.currentBet - panel.myBet;
  return toCall === 0
    ? renderPreActionNoBet(panel, callClock)
    : renderPreActionWithBet(panel, callClock);
}

function renderWaitingActions(panel, actionMap) {
  const simple = renderSimpleActions(panel, actionMap);
  const showButtons = renderShowButtons(panel, actionMap);
  const socialRow = actionMap.emote
    ? html`<div class="action-row">
        ${renderEmoteButton(panel)}${renderChatButton(panel)}
      </div>`
    : "";
  if (simple) return html`${simple}${showButtons}${socialRow}`;

  const callClock = actionMap.callClock ? renderCallClockButton(panel) : "";
  const preActions = renderPreActionButtons(panel, callClock);
  if (preActions) return html`${preActions}${showButtons}${socialRow}`;
  return html`${showButtons}${socialRow}`;
}

function renderStart(panel, actionMap) {
  const showButtons = renderShowButtons(panel, actionMap);
  return html`
    <div class="action-row">
      ${actionMap.emote ? renderEmoteButton(panel) : ""}
      ${actionMap.chat ? renderChatButton(panel) : ""}
      ${actionMap.start
        ? html`<phg-button
            variant="primary"
            full-width
            @click=${() => panel.sendAction({ action: "start" })}
            >Start Game</phg-button
          >`
        : ""}
    </div>
    ${showButtons}
  `;
}

function renderForActionMap(panel, actionMap) {
  if (actionMap.buyIn) return renderBuyIn(panel, actionMap.buyIn);
  if (actionMap.sitIn || actionMap.leave)
    return renderSitInLeave(panel, actionMap);
  if (actionMap.start) return renderStart(panel, actionMap);
  const betAction = actionMap.bet || actionMap.raise;
  if (betAction) return renderBettingSlider(panel, actionMap, betAction);
  return renderWaitingActions(panel, actionMap);
}

function renderTournamentResult(panel) {
  if (panel.isWinner) {
    return html`<span class="waiting tournament-result winner"
      >You've won!</span
    >`;
  }
  if (panel.bustedPosition != null) {
    return html`<span class="waiting tournament-result"
      >You finished in ${formatPosition(panel.bustedPosition)} place</span
    >`;
  }
  return null;
}

export function renderActionPanel(panel) {
  const tournamentResult = renderTournamentResult(panel);
  if (tournamentResult) return tournamentResult;

  if (!panel.actions || panel.actions.length === 0) {
    return panel.seatedCount < 2
      ? renderWaitingForPlayers(panel)
      : html`<span class="waiting">Waiting for your turn...</span>`;
  }

  return (
    renderForActionMap(panel, buildActionMap(panel.actions)) ||
    html`<span class="waiting">Waiting for your turn...</span>`
  );
}
