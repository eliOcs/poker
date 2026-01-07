import * as COLORS from "./colors.js";
import { html, css, unsafeCSS, LitElement } from "lit";
import "./button.js";

class ActionPanel extends LitElement {
  static get styles() {
    return css`
      :host {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 10px;
        border: 4px solid ${unsafeCSS(COLORS.fgDark)};
        background-color: ${unsafeCSS(COLORS.bgLight)};
        box-shadow: 4px 4px 0 ${unsafeCSS(COLORS.bgDark)};
        font-family: "Press Start 2P", monospace;
        box-sizing: border-box;
        min-width: 400px;
        max-width: 560px;
        min-height: 100px;
        margin: 0 auto;
      }

      button {
        padding: 8px 16px;
        font-family: "Press Start 2P", monospace;
        font-size: 0.6em;
        cursor: pointer;
        border: 3px solid ${unsafeCSS(COLORS.bgDark)};
        box-shadow:
          3px 3px 0 ${unsafeCSS(COLORS.bgDark)},
          inset -2px -2px 0 rgba(0, 0, 0, 0.2),
          inset 2px 2px 0 rgba(255, 255, 255, 0.2);
      }

      button:active {
        box-shadow:
          1px 1px 0 ${unsafeCSS(COLORS.bgDark)},
          inset 2px 2px 0 rgba(0, 0, 0, 0.2),
          inset -2px -2px 0 rgba(255, 255, 255, 0.2);
        transform: translate(2px, 2px);
      }

      button.fold {
        background-color: ${unsafeCSS(COLORS.red)};
        color: ${unsafeCSS(COLORS.fgWhite)};
      }

      button.fold:hover {
        background-color: color-mix(
          in oklch,
          ${unsafeCSS(COLORS.red)} 80%,
          white
        );
      }

      button.check {
        background-color: ${unsafeCSS(COLORS.greenLight)};
        color: ${unsafeCSS(COLORS.fgWhite)};
      }

      button.check:hover {
        background-color: color-mix(
          in oklch,
          ${unsafeCSS(COLORS.greenLight)} 80%,
          white
        );
      }

      button.call {
        background-color: ${unsafeCSS(COLORS.greenLight)};
        color: ${unsafeCSS(COLORS.fgWhite)};
      }

      button.call:hover {
        background-color: color-mix(
          in oklch,
          ${unsafeCSS(COLORS.greenLight)} 80%,
          white
        );
      }

      button.bet,
      button.raise {
        background-color: ${unsafeCSS(COLORS.blue)};
        color: ${unsafeCSS(COLORS.fgWhite)};
      }

      button.bet:hover,
      button.raise:hover {
        background-color: color-mix(
          in oklch,
          ${unsafeCSS(COLORS.blue)} 80%,
          white
        );
      }

      button.all-in {
        background-color: ${unsafeCSS(COLORS.gold)};
        color: ${unsafeCSS(COLORS.fgWhite)};
      }

      button.all-in:hover {
        background-color: color-mix(
          in oklch,
          ${unsafeCSS(COLORS.gold)} 80%,
          white
        );
      }

      button.buy-in {
        background-color: ${unsafeCSS(COLORS.purple)};
        color: ${unsafeCSS(COLORS.fgWhite)};
      }

      button.buy-in:hover {
        background-color: color-mix(
          in oklch,
          ${unsafeCSS(COLORS.purple)} 80%,
          white
        );
      }

      button.call-clock {
        background-color: ${unsafeCSS(COLORS.orange)};
        color: ${unsafeCSS(COLORS.fgWhite)};
      }

      button.call-clock:hover {
        background-color: color-mix(
          in oklch,
          ${unsafeCSS(COLORS.orange)} 80%,
          white
        );
      }

      /* Buy-in slider row */
      .amount-input {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      .amount-input button {
        min-width: 11ch;
        text-align: center;
      }

      .amount-input input[type="range"] {
        width: 100px;
        height: 8px;
        appearance: none;
        background: ${unsafeCSS(COLORS.bgDisabled)};
        border: 2px solid ${unsafeCSS(COLORS.bgDark)};
      }

      .amount-input input[type="range"]::-webkit-slider-thumb {
        appearance: none;
        width: 16px;
        height: 16px;
        background: ${unsafeCSS(COLORS.gold)};
        border: 2px solid ${unsafeCSS(COLORS.bgDark)};
        cursor: pointer;
      }

      .amount-display {
        min-width: 60px;
        text-align: center;
        font-size: 0.6em;
        color: ${unsafeCSS(COLORS.gold)};
      }

      /* Betting panel styles */
      .betting-panel {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .slider-row {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }

      .slider-row input[type="number"] {
        width: 80px;
        padding: 4px 4px;
        font-family: "Press Start 2P", monospace;
        font-size: 0.5em;
        text-align: center;
        border: 2px solid ${unsafeCSS(COLORS.bgDark)};
        background: ${unsafeCSS(COLORS.bgDisabled)};
        color: ${unsafeCSS(COLORS.fgWhite)};
        line-height: 2;
      }

      .slider-row input[type="number"]::-webkit-inner-spin-button,
      .slider-row input[type="number"]::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }

      .slider-row input[type="number"] {
        -moz-appearance: textfield;
      }

      .slider-row button.step-btn {
        padding: 6px 10px;
        font-size: 0.7em;
        min-width: auto;
        background-color: ${unsafeCSS(COLORS.bgDisabled)};
        color: ${unsafeCSS(COLORS.fgWhite)};
      }

      .slider-row button.step-btn:hover {
        background-color: color-mix(
          in oklch,
          ${unsafeCSS(COLORS.bgDisabled)} 80%,
          white
        );
      }

      .slider-row input[type="range"] {
        flex: 1;
        height: 8px;
        appearance: none;
        background: ${unsafeCSS(COLORS.bgDisabled)};
        border: 2px solid ${unsafeCSS(COLORS.bgDark)};
        min-width: 80px;
      }

      .slider-row input[type="range"]::-webkit-slider-thumb {
        appearance: none;
        width: 16px;
        height: 16px;
        background: ${unsafeCSS(COLORS.gold)};
        border: 2px solid ${unsafeCSS(COLORS.bgDark)};
        cursor: pointer;
      }

      .action-row {
        display: flex;
        gap: 8px;
        justify-content: center;
      }

      .action-row button {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 10px 12px;
        white-space: nowrap;
      }

      .action-row .amount {
        font-size: 0.9em;
      }

      .waiting {
        color: ${unsafeCSS(COLORS.fgDark)};
        font-size: 0.6em;
        text-align: center;
      }

      .simple-actions {
        display: flex;
        gap: 8px;
        justify-content: center;
      }

      .waiting-panel {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }

      .share-buttons {
        display: flex;
        gap: 8px;
        justify-content: center;
      }

      .waiting-actions {
        display: flex;
        gap: 8px;
        justify-content: center;
        align-items: center;
      }
    `;
  }

  static get properties() {
    return {
      actions: { type: Array },
      seatIndex: { type: Number },
      betAmount: { type: Number },
      bigBlind: { type: Number },
      seatedCount: { type: Number },
      copied: { type: Boolean },
    };
  }

  constructor() {
    super();
    this.actions = [];
    this.seatIndex = -1;
    this.betAmount = 0;
    this.bigBlind = 1;
    this.seatedCount = 0;
    this.copied = false;
    this._lastActionType = null;
  }

  updated(changedProperties) {
    if (changedProperties.has("actions")) {
      // Detect action type to reset betAmount when context changes
      const actionTypes = this.actions?.map((a) => a.action) || [];
      const currentType = actionTypes.includes("buyIn")
        ? "buyIn"
        : actionTypes.includes("bet") || actionTypes.includes("raise")
          ? "betting"
          : "other";

      if (this._lastActionType && this._lastActionType !== currentType) {
        this.betAmount = 0;
      }
      this._lastActionType = currentType;
    }
  }

  async copyGameLink() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      this.copied = true;
      setTimeout(() => {
        this.copied = false;
      }, 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }

  async shareGameLink() {
    const url = window.location.href;
    try {
      await navigator.share({
        title: "Join my poker game",
        url: url,
      });
    } catch (err) {
      console.error("Failed to share:", err);
    }
  }

  canShare() {
    return typeof navigator.share === "function";
  }

  sendAction(action) {
    this.dispatchEvent(
      new CustomEvent("game-action", {
        detail: action,
        bubbles: true,
        composed: true,
      }),
    );
  }

  adjustBet(delta, min, max) {
    const newValue = Math.max(min, Math.min(max, this.betAmount + delta));
    this.betAmount = newValue;
  }

  handleManualInput(e, min, max) {
    const value = parseInt(e.target.value) || min;
    this.betAmount = Math.max(min, Math.min(max, value));
  }

  render() {
    if (!this.actions || this.actions.length === 0) {
      if (this.seatedCount < 2) {
        return html`
          <div class="waiting-panel">
            <span class="waiting">Waiting for players...</span>
            <div class="share-buttons">
              <phg-button
                variant="${this.copied ? "success" : "action"}"
                @click=${this.copyGameLink}
              >
                ${this.copied ? "Copied!" : "Copy Link"}
              </phg-button>
              ${this.canShare()
                ? html`
                    <phg-button variant="action" @click=${this.shareGameLink}>
                      Share
                    </phg-button>
                  `
                : ""}
            </div>
          </div>
        `;
      }
      return html`<span class="waiting">Waiting for your turn...</span>`;
    }

    // Collect actions by type
    const actionMap = {};
    for (const action of this.actions) {
      actionMap[action.action] = action;
    }

    // Handle buy-in separately
    if (actionMap.buyIn) {
      const action = actionMap.buyIn;
      const min = action.min || 20;
      const max = action.max || 100;
      const bigBlind = action.bigBlind || 50;
      const defaultBuyIn = Math.min(80, max);
      const bbCount =
        this.betAmount >= min && this.betAmount <= max
          ? this.betAmount
          : defaultBuyIn;
      const stack = bbCount * bigBlind;
      const minStack = min * bigBlind;
      const maxStack = max * bigBlind;
      return html`
        <div class="betting-panel">
          <div class="slider-row">
            <input
              type="number"
              min="${minStack}"
              max="${maxStack}"
              step="${bigBlind}"
              .value="${stack}"
              @input=${(e) => {
                const stackValue = parseInt(e.target.value) || minStack;
                const bb = Math.round(stackValue / bigBlind);
                this.betAmount = Math.max(min, Math.min(max, bb));
              }}
            />
            <button
              class="step-btn"
              @click=${() => this.adjustBet(-10, min, max)}
            >
              -
            </button>
            <input
              type="range"
              min="${min}"
              max="${max}"
              .value="${bbCount}"
              @input=${(e) => (this.betAmount = parseInt(e.target.value))}
            />
            <button
              class="step-btn"
              @click=${() => this.adjustBet(10, min, max)}
            >
              +
            </button>
          </div>
          <div class="action-row">
            <button
              class="buy-in"
              @click=${() =>
                this.sendAction({
                  action: "buyIn",
                  seat: this.seatIndex,
                  amount: bbCount,
                })}
            >
              <span>Buy In</span>
              <span class="amount">$${stack}</span>
            </button>
          </div>
        </div>
      `;
    }

    // Handle sit in action (player is sitting out)
    if (actionMap.sitIn) {
      const cost = actionMap.sitIn.cost;
      return html`
        <phg-button
          variant="success"
          @click=${() =>
            this.sendAction({ action: "sitIn", seat: this.seatIndex })}
        >
          ${cost > 0 ? `Sit In ($${cost} BB)` : "Sit In"}
        </phg-button>
      `;
    }

    // Handle start action (with optional sit out)
    if (actionMap.start || actionMap.sitOut) {
      return html`
        <div class="waiting-actions">
          ${actionMap.sitOut
            ? html`
                <phg-button
                  variant="secondary"
                  @click=${() =>
                    this.sendAction({ action: "sitOut", seat: this.seatIndex })}
                >
                  Sit Out
                </phg-button>
              `
            : ""}
          ${actionMap.start
            ? html`
                <phg-button
                  variant="primary"
                  @click=${() => this.sendAction({ action: "start" })}
                >
                  Start Game
                </phg-button>
              `
            : ""}
        </div>
      `;
    }

    // Handle betting actions (bet or raise with fold/check/call)
    const betAction = actionMap.bet || actionMap.raise;
    if (betAction) {
      const isBet = actionMap.bet != null;
      const min = betAction.min;
      const max = betAction.max;
      const step = this.bigBlind;

      // Initialize betAmount if not set
      if (this.betAmount < min) {
        this.betAmount = min;
      }

      const currentValue = Math.max(min, Math.min(max, this.betAmount));
      const isAllIn = currentValue >= max;

      return html`
        <div class="betting-panel">
          <div class="slider-row">
            <input
              type="number"
              min="${min}"
              max="${max}"
              .value="${currentValue}"
              @input=${(e) => this.handleManualInput(e, min, max)}
            />
            <button
              class="step-btn"
              @click=${() => this.adjustBet(-step, min, max)}
            >
              -
            </button>
            <input
              type="range"
              min="${min}"
              max="${max}"
              .value="${currentValue}"
              @input=${(e) => (this.betAmount = parseInt(e.target.value))}
            />
            <button
              class="step-btn"
              @click=${() => this.adjustBet(step, min, max)}
            >
              +
            </button>
          </div>
          <div class="action-row">
            ${actionMap.fold
              ? html`
                  <button
                    class="fold"
                    @click=${() =>
                      this.sendAction({ action: "fold", seat: this.seatIndex })}
                  >
                    Fold
                  </button>
                `
              : null}
            ${actionMap.check
              ? html`
                  <button
                    class="check"
                    @click=${() =>
                      this.sendAction({
                        action: "check",
                        seat: this.seatIndex,
                      })}
                  >
                    Check
                  </button>
                `
              : null}
            ${actionMap.call
              ? html`
                  <button
                    class="call"
                    @click=${() =>
                      this.sendAction({ action: "call", seat: this.seatIndex })}
                  >
                    <span>Call</span>
                    <span class="amount">$${actionMap.call.amount}</span>
                  </button>
                `
              : null}
            <button
              class="${isAllIn ? "all-in" : isBet ? "bet" : "raise"}"
              @click=${() =>
                this.sendAction(
                  isAllIn
                    ? { action: "allIn", seat: this.seatIndex }
                    : {
                        action: isBet ? "bet" : "raise",
                        seat: this.seatIndex,
                        amount: currentValue,
                      },
                )}
            >
              <span>${isAllIn ? "All-In" : isBet ? "Bet" : "Raise to"}</span>
              <span class="amount">$${currentValue}</span>
            </button>
          </div>
        </div>
      `;
    }

    // Simple actions only (check/call/fold without bet/raise)
    const simpleButtons = [];

    if (actionMap.fold) {
      simpleButtons.push(html`
        <button
          class="fold"
          @click=${() =>
            this.sendAction({ action: "fold", seat: this.seatIndex })}
        >
          Fold
        </button>
      `);
    }

    if (actionMap.check) {
      simpleButtons.push(html`
        <button
          class="check"
          @click=${() =>
            this.sendAction({ action: "check", seat: this.seatIndex })}
        >
          Check
        </button>
      `);
    }

    if (actionMap.call) {
      simpleButtons.push(html`
        <button
          class="call"
          @click=${() =>
            this.sendAction({ action: "call", seat: this.seatIndex })}
        >
          <span>Call</span>
          <span class="amount">$${actionMap.call.amount}</span>
        </button>
      `);
    }

    if (simpleButtons.length > 0) {
      return html`<div class="simple-actions">${simpleButtons}</div>`;
    }

    // Call clock action (when waiting for another player)
    if (actionMap.callClock) {
      return html`
        <div class="simple-actions">
          <button
            class="call-clock"
            @click=${() =>
              this.sendAction({ action: "callClock", seat: this.seatIndex })}
          >
            Call Clock
          </button>
        </div>
      `;
    }

    return html`<span class="waiting">Waiting for your turn...</span>`;
  }
}

customElements.define("phg-action-panel", ActionPanel);
