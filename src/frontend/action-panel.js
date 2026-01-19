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

        .action-row phg-button,
        .simple-actions phg-button {
          display: block;
          width: 100%;
        }

        .action-row .amount,
        .simple-actions .amount {
          font-size: var(--font-md);
        }

        .stacked {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-md);
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

  _renderWaitingForPlayers() {
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
            ? html`<phg-button variant="action" @click=${this.shareGameLink}
                >Share</phg-button
              >`
            : ""}
        </div>
      </div>
    `;
  }

  _renderBuyIn(action) {
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
              this.betAmount = Math.max(
                min,
                Math.min(max, Math.round(stackValue / bigBlind)),
              );
            }}
          />
          <phg-button
            variant="muted"
            size="compact"
            @click=${() => this.adjustBet(-10, min, max)}
            >-</phg-button
          >
          <input
            type="range"
            min="${min}"
            max="${max}"
            .value="${bbCount}"
            @input=${(e) => (this.betAmount = parseInt(e.target.value))}
          />
          <phg-button
            variant="muted"
            size="compact"
            @click=${() => this.adjustBet(10, min, max)}
            >+</phg-button
          >
        </div>
        <div class="action-row">
          <phg-button
            variant="secondary"
            full-width
            @click=${() =>
              this.sendAction({
                action: "buyIn",
                seat: this.seatIndex,
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

  _renderSitInLeave(actionMap) {
    return html`
      <div class="waiting-actions">
        ${actionMap.sitIn
          ? html`<phg-button
              variant="success"
              @click=${() =>
                this.sendAction({ action: "sitIn", seat: this.seatIndex })}
              >Sit In</phg-button
            >`
          : ""}
        ${actionMap.leave
          ? html`<phg-button
              variant="secondary"
              @click=${() =>
                this.sendAction({ action: "leave", seat: this.seatIndex })}
              >Leave Table</phg-button
            >`
          : ""}
      </div>
    `;
  }

  _renderStartSitOut(actionMap) {
    return html`
      <div class="waiting-actions">
        ${actionMap.sitOut
          ? html`<phg-button
              variant="secondary"
              @click=${() =>
                this.sendAction({ action: "sitOut", seat: this.seatIndex })}
              >Sit Out</phg-button
            >`
          : ""}
        ${actionMap.start
          ? html`<phg-button
              variant="primary"
              @click=${() => this.sendAction({ action: "start" })}
              >Start Game</phg-button
            >`
          : ""}
      </div>
    `;
  }

  _renderBettingSlider(actionMap, betAction) {
    const isBet = actionMap.bet != null;
    const min = betAction.min;
    const max = betAction.max;
    const step = this.bigBlind;
    if (this.betAmount < min) this.betAmount = min;
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
          <phg-button
            variant="muted"
            size="compact"
            @click=${() => this.adjustBet(-step, min, max)}
            >-</phg-button
          >
          <input
            type="range"
            min="${min}"
            max="${max}"
            step="1"
            .value="${currentValue}"
            @input=${(e) => (this.betAmount = parseInt(e.target.value))}
          />
          <phg-button
            variant="muted"
            size="compact"
            @click=${() => this.adjustBet(step, min, max)}
            >+</phg-button
          >
        </div>
        <div class="action-row">
          ${this._renderBettingButtons(actionMap, isBet, currentValue, isAllIn)}
        </div>
      </div>
    `;
  }

  _renderBettingButtons(actionMap, isBet, currentValue, isAllIn) {
    return html`
      ${actionMap.fold
        ? html`<phg-button
            variant="danger"
            full-width
            @click=${() =>
              this.sendAction({ action: "fold", seat: this.seatIndex })}
            >Fold</phg-button
          >`
        : null}
      ${actionMap.check
        ? html`<phg-button
            variant="success"
            full-width
            @click=${() =>
              this.sendAction({ action: "check", seat: this.seatIndex })}
            >Check</phg-button
          >`
        : null}
      ${actionMap.call
        ? html`<phg-button
            variant="success"
            full-width
            @click=${() =>
              this.sendAction({ action: "call", seat: this.seatIndex })}
            ><span class="stacked"
              ><span>Call</span
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
        <span class="stacked"
          ><span>${isAllIn ? "All-In" : isBet ? "Bet" : "Raise to"}</span
          ><span class="amount">${formatCurrency(currentValue)}</span></span
        >
      </phg-button>
    `;
  }

  _renderSimpleActions(actionMap) {
    const buttons = [];
    if (actionMap.fold)
      buttons.push(
        html`<phg-button
          variant="danger"
          full-width
          @click=${() =>
            this.sendAction({ action: "fold", seat: this.seatIndex })}
          >Fold</phg-button
        >`,
      );
    if (actionMap.check)
      buttons.push(
        html`<phg-button
          variant="success"
          full-width
          @click=${() =>
            this.sendAction({ action: "check", seat: this.seatIndex })}
          >Check</phg-button
        >`,
      );
    if (actionMap.call)
      buttons.push(
        html`<phg-button
          variant="success"
          full-width
          @click=${() =>
            this.sendAction({ action: "call", seat: this.seatIndex })}
          ><span class="stacked"
            ><span>Call</span
            ><span class="amount"
              >${formatCurrency(actionMap.call.amount)}</span
            ></span
          ></phg-button
        >`,
      );
    return buttons.length > 0
      ? html`<div class="simple-actions">${buttons}</div>`
      : null;
  }

  _renderCallClock() {
    return html`
      <div class="simple-actions">
        <phg-button
          variant="warning"
          full-width
          @click=${() =>
            this.sendAction({ action: "callClock", seat: this.seatIndex })}
          >Call Clock</phg-button
        >
      </div>
    `;
  }

  _buildActionMap() {
    const actionMap = {};
    if (this.actions) {
      for (const action of this.actions) actionMap[action.action] = action;
    }
    return actionMap;
  }

  _renderForActionMap(actionMap) {
    if (actionMap.buyIn) return this._renderBuyIn(actionMap.buyIn);
    if (actionMap.sitIn || actionMap.leave)
      return this._renderSitInLeave(actionMap);
    if (actionMap.start || actionMap.sitOut)
      return this._renderStartSitOut(actionMap);
    const betAction = actionMap.bet || actionMap.raise;
    if (betAction) return this._renderBettingSlider(actionMap, betAction);
    return (
      this._renderSimpleActions(actionMap) ||
      (actionMap.callClock ? this._renderCallClock() : null)
    );
  }

  render() {
    if (!this.actions || this.actions.length === 0) {
      return this.seatedCount < 2
        ? this._renderWaitingForPlayers()
        : html`<span class="waiting">Waiting for your turn...</span>`;
    }
    return (
      this._renderForActionMap(this._buildActionMap()) ||
      html`<span class="waiting">Waiting for your turn...</span>`
    );
  }
}

customElements.define("phg-action-panel", ActionPanel);
