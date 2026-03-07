import { html, LitElement } from "lit";
import {
  designTokens,
  baseStyles,
  formatCurrency,
  seatBetStyles,
} from "./styles.js";
import { ICONS } from "./icons.js";
import { seatStyles } from "./seat.styles.js";
import {
  formatPosition,
  formatHandResult,
  getResultClass,
} from "./seat-utils.js";
import "./card.js";
import "./button.js";
import "./chips.js";
/** @typedef {(seat: any) => boolean} SeatClassCondition */

class Seat extends LitElement {
  static get styles() {
    return [designTokens, baseStyles, seatStyles, seatBetStyles];
  }

  static get properties() {
    return {
      seat: { type: Object },
      seatNumber: { type: Number },
      isButton: { type: Boolean },
      showSitAction: { type: Boolean },
      clockTicks: { type: Number },
      buyIn: { type: Number },
      hideBet: { type: Boolean },
      noAnimation: { type: Boolean },
    };
  }

  constructor() {
    super();
    this.seat = null;
    this.seatNumber = 0;
    this.isButton = false;
    this.noAnimation = false;
    this.showSitAction = true;
    this.clockTicks = 0;
    this.buyIn = 0;
    this.hideBet = false;
    this._activeEmote = null;
    this._emoteTimer = null;
    this._activeChat = null;
    this._chatTimer = null;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this._emoteTimer);
    clearTimeout(this._chatTimer);
  }

  get _clockRemaining() {
    if (this.clockTicks > 0) {
      return Math.max(0, 30 - this.clockTicks);
    }
    return null;
  }

  /** @type {[string, SeatClassCondition][]} */
  static _seatClassStates = [
    ["empty", (s) => !s || s.empty],
    ["acting", (s) => s?.isActing],
    ["folded", (s) => s?.folded],
    ["all-in", (s) => s?.allIn],
    ["sitting-out", (s) => s?.sittingOut && s?.bustedPosition == null],
    ["busted", (s) => s?.bustedPosition != null],
    ["disconnected", (s) => s?.disconnected],
    ["current-player", (s) => s?.isCurrentPlayer],
    ["winner", (s) => s?.isWinner || (s?.netResult ?? s?.handResult) > 0],
  ];

  updated(changedProperties) {
    if (!changedProperties.has("seat")) return;
    const isEmpty = !this.seat || this.seat.empty;
    for (const [cls, condition] of Seat._seatClassStates) {
      this.classList.toggle(
        cls,
        cls === "empty" ? isEmpty : !isEmpty && condition(this.seat),
      );
    }
  }

  _showBubble(value, kind) {
    const timerKey = kind === "emote" ? "_emoteTimer" : "_chatTimer";
    const stateKey = kind === "emote" ? "_activeEmote" : "_activeChat";
    const text = String(value || "").trim();
    if (!text) return;
    clearTimeout(this[timerKey]);
    this[stateKey] = null;
    this.requestUpdate();
    requestAnimationFrame(() => {
      this[stateKey] = text;
      this.requestUpdate();
      this[timerKey] = setTimeout(() => {
        this[stateKey] = null;
        this.requestUpdate();
      }, 3000);
    });
  }

  showEmote(emoji) {
    this._showBubble(emoji, "emote");
  }
  showChat(message) {
    this._showBubble(message, "chat");
  }

  handleSit() {
    const sitAction = this.seat?.actions?.find((a) => a.action === "sit");
    if (sitAction) {
      this.dispatchEvent(
        new CustomEvent("seat-action", {
          detail: sitAction,
          bubbles: true,
          composed: true,
        }),
      );
    }
  }

  _getStatusLabel() {
    const s = this.seat;
    if (s.disconnected) return { label: "DISCONNECTED", isStatus: true };
    if (s.bustedPosition != null) {
      return { label: formatPosition(s.bustedPosition), isStatus: true };
    }
    if (s.sittingOut) return { label: "SITTING OUT", isStatus: true };
    if (s.folded) return { label: "FOLDED", isStatus: true };
    if (s.allIn) return { label: "ALL-IN", isStatus: true };
    if (s.lastAction) return { label: s.lastAction, isStatus: false };
    return null;
  }

  _renderEmptySeat() {
    const sitAction = this.seat?.actions?.find((a) => a.action === "sit");
    if (!sitAction || !this.showSitAction) return "";
    const label = this.buyIn ? `Sit ${formatCurrency(this.buyIn)}` : "Sit";
    return html`<phg-button @click=${this.handleSit}>${label}</phg-button>`;
  }

  _renderStatusOrAction() {
    if (this.seat.bustedPosition != null) {
      return html`<div class="status-label">
        ${formatPosition(this.seat.bustedPosition)}
      </div>`;
    }
    if (this.seat.handResult != null) return "";
    const status = this._getStatusLabel();
    if (!status) return "";
    return status.isStatus
      ? html`<div class="status-label">${status.label}</div>`
      : html`<div class="last-action">${status.label}</div>`;
  }

  _renderStackOrResult() {
    if (this.seat.bustedPosition != null) {
      return "";
    }
    if (this.seat.netResult !== undefined) {
      return html`
        <div class="hand-result ${getResultClass(this.seat.netResult)}">
          ${formatHandResult(this.seat.netResult)}
        </div>
        <div class="stack ending-stack">
          ${formatCurrency(this.seat.endingStack)}
        </div>
      `;
    }
    return this.seat.handResult != null
      ? html`<div class="hand-result ${getResultClass(this.seat.handResult)}">
          ${formatHandResult(this.seat.handResult)}
        </div>`
      : html`<div class="stack">${formatCurrency(this.seat.stack)}</div>`;
  }

  _renderClock() {
    return this._clockRemaining !== null
      ? html`<div
          class="clock-countdown ${this._clockRemaining <= 10 ? "urgent" : ""}"
        >
          <span class="clock-countdown-icon" aria-hidden="true"
            >${ICONS.clock}</span
          >
          <span>${this._clockRemaining}s</span>
        </div>`
      : "";
  }

  _renderDealerButton() {
    return this.isButton ? html`<span class="dealer-button">D</span>` : "";
  }
  _renderHandRank() {
    return this.seat.handRank && !this.seat.lastAction
      ? html`<div class="hand-rank">${this.seat.handRank}</div>`
      : "";
  }

  _renderBetIndicator() {
    return this.seat.bet > 0 && !this.hideBet
      ? html`<div class="bet-indicator">
          <phg-chips .amount=${this.seat.bet}></phg-chips>
          ${formatCurrency(this.seat.bet)}
        </div>`
      : "";
  }

  render() {
    if (!this.seat || this.seat.empty) return this._renderEmptySeat();

    return html`
      ${this._activeEmote
        ? html`<div class="emote-bubble">${this._activeEmote}</div>`
        : ""}
      ${this._activeChat
        ? html`<div class="chat-bubble">${this._activeChat}</div>`
        : ""}
      ${this._renderDealerButton()}
      <div class="player-info">
        <span class="player-name"
          >${this.seat.player?.name || `Seat ${this.seatNumber + 1}`}</span
        >
      </div>
      ${this._renderStackOrResult()} ${this._renderClock()}
      ${this._renderStatusOrAction()} ${this._renderHandRank()}
      <div
        class="hole-cards ${this.seat.cards?.some((card) => card !== "??")
          ? "revealed"
          : ""}"
      >
        ${this.seat.cards?.map(
          (card) =>
            html`<phg-card
              .card=${card}
              ?winning=${this.seat.winningCards?.includes(card)}
              ?noAnimation=${this.noAnimation}
            ></phg-card>`,
        )}
      </div>
      ${this._renderBetIndicator()}
    `;
  }
}

customElements.define("phg-seat", Seat);
