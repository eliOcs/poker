import { html, LitElement } from "lit";
import {
  designTokens,
  baseStyles,
  formatCurrency,
  actionPanelStyles,
} from "./styles.js";
import { getChipDenomination } from "/src/shared/stakes.js";
import "./button.js";
import "./currency-slider.js";

class ActionPanel extends LitElement {
  static get styles() {
    return [designTokens, baseStyles, actionPanelStyles];
  }

  static get properties() {
    return {
      actions: { type: Array },
      seatIndex: { type: Number },
      betAmount: { type: Number },
      smallBlind: { type: Number },
      bigBlind: { type: Number },
      seatedCount: { type: Number },
      copied: { type: Boolean },
      bustedPosition: { type: Number },
      isWinner: { type: Boolean },
      canSit: { type: Boolean },
      buyIn: { type: Number },
    };
  }

  constructor() {
    super();
    this.actions = [];
    this.seatIndex = -1;
    this.betAmount = 0;
    this.smallBlind = 1;
    this.bigBlind = 1;
    this.seatedCount = 0;
    this.copied = false;
    this.bustedPosition = null;
    this.isWinner = false;
    this.canSit = false;
    this.buyIn = 0;
    this._lastActionType = null;
    this._lastActionTime = 0;
  }

  get chipDenomination() {
    return getChipDenomination(this.smallBlind, this.bigBlind);
  }

  updated(changedProperties) {
    if (changedProperties.has("actions")) {
      // Reset throttle when actions change (new turn/round from server)
      this._lastActionTime = 0;

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
    const now = Date.now();
    if (now - this._lastActionTime < 100) return;
    this._lastActionTime = now;
    this.dispatchEvent(
      new CustomEvent("game-action", {
        detail: action,
        bubbles: true,
        composed: true,
      }),
    );
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
          ${this.canSit
            ? html`<phg-button
                variant="primary"
                @click=${() => this.sendAction({ action: "sit" })}
                >${this.buyIn
                  ? `Sit ${formatCurrency(this.buyIn)}`
                  : "Sit"}</phg-button
              >`
            : ""}
        </div>
      </div>
    `;
  }

  _renderBuyIn(action) {
    const minBB = action.min || 20;
    const maxBB = action.max || 100;
    const bigBlind = action.bigBlind || this.bigBlind;
    const minStack = minBB * bigBlind;
    const maxStack = maxBB * bigBlind;
    const defaultStack = Math.min(80, maxBB) * bigBlind;

    // betAmount stores stack in cents for buy-in
    const stack =
      this.betAmount >= minStack && this.betAmount <= maxStack
        ? this.betAmount
        : defaultStack;
    const bbCount = Math.round(stack / bigBlind);

    return html`
      <div class="betting-panel">
        <phg-currency-slider
          .value=${stack}
          .min=${minStack}
          .max=${maxStack}
          .step=${this.chipDenomination * 10}
          @value-changed=${(e) => (this.betAmount = e.detail.value)}
        ></phg-currency-slider>
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
        ${actionMap.leave
          ? html`<phg-button
              variant="muted"
              @click=${() =>
                this.sendAction({ action: "leave", seat: this.seatIndex })}
              >Leave Table</phg-button
            >`
          : ""}
        ${actionMap.sitIn
          ? html`<phg-button
              variant="success"
              @click=${() =>
                this.sendAction({ action: "sitIn", seat: this.seatIndex })}
              >Sit In</phg-button
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
              variant="muted"
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
    if (this.betAmount < min) this.betAmount = min;
    const currentValue = Math.max(min, Math.min(max, this.betAmount));
    const isAllIn = currentValue >= max;

    return html`
      <div class="betting-panel">
        <phg-currency-slider
          .value=${currentValue}
          .min=${min}
          .max=${max}
          .step=${this.chipDenomination}
          @value-changed=${(e) => (this.betAmount = e.detail.value)}
        ></phg-currency-slider>
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

  _formatPosition(position) {
    const suffixes = ["th", "st", "nd", "rd"];
    const v = position % 100;
    const suffix = suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
    return `${position}${suffix}`;
  }

  _renderTournamentResult() {
    if (this.isWinner) {
      return html`<span class="waiting tournament-result winner"
        >You've won!</span
      >`;
    }
    if (this.bustedPosition != null) {
      return html`<span class="waiting tournament-result"
        >You finished in ${this._formatPosition(this.bustedPosition)}
        place</span
      >`;
    }
    return null;
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
    // Show tournament result for busted players or winner
    const tournamentResult = this._renderTournamentResult();
    if (tournamentResult) {
      return tournamentResult;
    }

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
