import { html, css, LitElement } from "lit";
import { designTokens, baseStyles, formatCurrency } from "./styles.js";
import "./button.js";

class ActionPanel extends LitElement {
  static get styles() {
    return [
      designTokens,
      baseStyles,
      css`
        :host {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          justify-content: center;
          gap: var(--space-md);
          padding: var(--space-md);
          border: var(--space-sm) solid var(--color-fg-muted);
          background-color: var(--color-bg-light);
          box-shadow: var(--space-sm) var(--space-sm) 0 var(--color-bg-dark);
          box-sizing: border-box;
          width: min(560px, calc(100vw - 24px));
          min-height: 100px;
        }

        button {
          padding: var(--space-md) var(--space-lg);
          font-family: inherit;
          font-size: var(--font-md);
          cursor: pointer;
          border: 3px solid var(--color-bg-dark);
          box-shadow:
            3px 3px 0 var(--color-bg-dark),
            inset -2px -2px 0 rgba(0, 0, 0, 0.2),
            inset 2px 2px 0 rgba(255, 255, 255, 0.2);
        }

        button:active {
          box-shadow:
            1px 1px 0 var(--color-bg-dark),
            inset 2px 2px 0 rgba(0, 0, 0, 0.2),
            inset -2px -2px 0 rgba(255, 255, 255, 0.2);
          transform: translate(2px, 2px);
        }

        button.fold {
          background-color: var(--color-error);
          color: var(--color-fg-white);
        }

        button.fold:hover {
          background-color: color-mix(in oklch, var(--color-error) 80%, white);
        }

        button.check,
        button.call {
          background-color: var(--color-success);
          color: var(--color-fg-white);
        }

        button.check:hover,
        button.call:hover {
          background-color: color-mix(
            in oklch,
            var(--color-success) 80%,
            white
          );
        }

        button.bet,
        button.raise {
          background-color: var(--color-accent);
          color: var(--color-fg-white);
        }

        button.bet:hover,
        button.raise:hover {
          background-color: color-mix(in oklch, var(--color-accent) 80%, white);
        }

        button.all-in {
          background-color: var(--color-primary);
          color: var(--color-fg-white);
        }

        button.all-in:hover {
          background-color: color-mix(
            in oklch,
            var(--color-primary) 80%,
            white
          );
        }

        button.buy-in {
          background-color: var(--color-secondary);
          color: var(--color-fg-white);
        }

        button.buy-in:hover {
          background-color: color-mix(
            in oklch,
            var(--color-secondary) 80%,
            white
          );
        }

        button.call-clock {
          background-color: var(--color-warning);
          color: var(--color-fg-white);
        }

        button.call-clock:hover {
          background-color: color-mix(
            in oklch,
            var(--color-warning) 80%,
            white
          );
        }

        /* Betting panel styles */
        .betting-panel {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
          width: 100%;
        }

        .slider-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-md);
        }

        .slider-row input[type="number"] {
          width: 80px;
          padding: var(--space-sm);
          font-family: inherit;
          font-size: var(--font-sm);
          text-align: center;
          border: 2px solid var(--color-bg-dark);
          background: var(--color-bg-disabled);
          color: var(--color-fg-white);
          line-height: 2;
          appearance: textfield;
        }

        .slider-row input[type="number"]::-webkit-inner-spin-button,
        .slider-row input[type="number"]::-webkit-outer-spin-button {
          appearance: none;
          margin: 0;
        }

        .slider-row button.step-btn {
          padding: var(--space-md) var(--space-md);
          font-size: var(--font-md);
          min-width: auto;
          background-color: var(--color-bg-disabled);
          color: var(--color-fg-white);
        }

        .slider-row button.step-btn:hover {
          background-color: color-mix(
            in oklch,
            var(--color-bg-disabled) 80%,
            white
          );
        }

        .slider-row input[type="range"] {
          flex: 1;
          height: var(--space-md);
          appearance: none;
          background: var(--color-bg-disabled);
          border: 2px solid var(--color-bg-dark);
          min-width: 80px;
        }

        .slider-row input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: var(--space-lg);
          height: var(--space-lg);
          background: var(--color-primary);
          border: 2px solid var(--color-bg-dark);
          cursor: pointer;
        }

        .action-row,
        .simple-actions {
          display: grid;
          grid-auto-columns: 1fr;
          grid-auto-flow: column;
          gap: var(--space-md);
          width: 100%;
        }

        .share-buttons,
        .waiting-actions {
          display: flex;
          gap: var(--space-md);
          justify-content: center;
          width: 100%;
        }

        .action-row button,
        .simple-actions button {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--space-md);
          padding: var(--space-md) var(--space-lg);
          white-space: nowrap;
        }

        .action-row .amount {
          font-size: var(--font-md);
        }

        .waiting {
          color: var(--color-fg-muted);
          font-size: var(--font-md);
          text-align: center;
        }

        .waiting-panel {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-lg);
        }
      `,
    ];
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
    // Input is in dollars, convert to cents
    const dollars = parseFloat(e.target.value) || 0;
    const cents = Math.round(dollars * 100);
    this.betAmount = Math.max(min, Math.min(max, cents));
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
      const bigBlind = action.bigBlind || this.bigBlind;
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
              <span class="amount">${formatCurrency(stack)}</span>
            </button>
          </div>
        </div>
      `;
    }

    // Handle sit in / leave actions (player is sitting out)
    if (actionMap.sitIn || actionMap.leave) {
      return html`
        <div class="waiting-actions">
          ${actionMap.sitIn
            ? html`<phg-button
                variant="success"
                @click=${() =>
                  this.sendAction({ action: "sitIn", seat: this.seatIndex })}
              >
                Sit In
              </phg-button>`
            : ""}
          ${actionMap.leave
            ? html`<phg-button
                variant="secondary"
                @click=${() =>
                  this.sendAction({ action: "leave", seat: this.seatIndex })}
              >
                Leave Table
              </phg-button>`
            : ""}
        </div>
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
              min="${min / 100}"
              max="${max / 100}"
              step="0.01"
              .value="${(currentValue / 100).toFixed(2)}"
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
              step="1"
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
                    <span class="amount"
                      >${formatCurrency(actionMap.call.amount)}</span
                    >
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
              <span class="amount">${formatCurrency(currentValue)}</span>
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
          <span class="amount">${formatCurrency(actionMap.call.amount)}</span>
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
