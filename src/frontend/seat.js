/* eslint-disable max-lines */
import { html, css, LitElement } from "lit";
import {
  designTokens,
  baseStyles,
  formatCurrency,
  seatBetStyles,
} from "./styles.js";
import { ICONS } from "./icons.js";
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
    return [
      designTokens,
      baseStyles,
      css`
        :host {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
          padding: var(--space-md);
          font-size: var(--font-md);
          line-height: 1.2;
          box-sizing: border-box;
          min-height: calc(4 * 1.2em);
          width: 14ch;
        }

        :host::before {
          content: "";
          position: absolute;
          inset: 0;
          background: var(--color-bg-light);
          border: 3px solid var(--color-fg-muted);
          box-shadow: 3px 3px 0 var(--color-bg-dark);
          z-index: 0;
        }

        @media (width >= 800px) {
          :host {
            padding: var(--space-lg);
            gap: var(--space-md);
            width: 16ch;
          }
        }

        :host(.empty) {
          justify-content: center;
          align-items: center;
          gap: var(--space-lg);
          font-size: var(--font-lg);
        }

        :host(.empty)::before {
          display: none;
        }

        :host(.acting)::before {
          border-color: var(--color-primary);
          box-shadow:
            3px 3px 0 var(--color-bg-dark),
            0 0 0 3px var(--color-primary);
        }

        :host(.sitting-out)::before {
          border-style: dashed;
        }

        :host(.busted)::before {
          border-style: dashed;
          opacity: 0.6;
        }

        :host(.busted) .player-name,
        :host(.busted) .status-label {
          opacity: 0.8;
        }

        :host(.disconnected)::before {
          border-color: var(--color-error);
          border-style: dotted;
        }

        :host(.all-in)::before {
          border-color: var(--color-error);
        }

        :host(.current-player)::before {
          border-color: var(--color-highlight);
        }

        :host(.winner)::before {
          border-color: var(--color-primary);
          box-shadow:
            3px 3px 0 var(--color-bg-dark),
            0 0 0 3px var(--color-primary);
        }

        .player-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--color-fg-white);
        }

        :host(.current-player) .player-name {
          color: var(--color-primary);
        }

        .stack {
          color: var(--color-success);
        }

        .dealer-button {
          position: absolute;
          top: calc(-1 * var(--space-sm));
          right: calc(-1 * var(--space-sm));
          background-color: var(--color-fg-white);
          color: var(--color-bg-dark);
          width: 20px;
          height: 20px;
          text-align: center;
          line-height: 20px;
          font-size: var(--font-md);
          border: 2px solid var(--color-bg-dark);
          border-radius: 50%;
          z-index: 1;
        }

        @media (width >= 800px) {
          .dealer-button {
            width: 24px;
            height: 24px;
            line-height: 24px;
          }
        }

        .hole-cards {
          position: absolute;
          top: -20px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: var(--space-sm);
          justify-content: center;
          transition: top 0.3s ease;
          z-index: -1;
        }

        .player-info,
        .stack,
        .hand-result,
        .status-label,
        .last-action,
        .hand-rank,
        .clock-countdown,
        phg-button {
          position: relative;
          z-index: 1;
        }

        .hole-cards.revealed {
          top: -50px;
        }

        @media (width >= 800px) {
          .hole-cards {
            gap: var(--space-md);
            top: -30px;
          }

          .hole-cards.revealed {
            top: -65px;
          }
        }

        :host(.folded) .hole-cards {
          opacity: 0.5;
        }

        .status-label {
          font-size: var(--font-sm);
          color: var(--color-primary);
        }

        .last-action {
          font-size: var(--font-md);
          color: var(--color-fg-medium);
          text-transform: uppercase;
        }

        .hand-result {
          font-size: var(--font-md);
          text-transform: uppercase;
        }

        .hand-result.won {
          color: var(--color-success);
        }

        .hand-result.lost {
          color: var(--color-error);
        }

        .ending-stack {
          font-size: var(--font-sm);
          color: var(--color-fg-muted);
        }

        .hand-rank {
          font-size: var(--font-md);
          color: var(--color-fg-medium);
          margin-top: auto;
        }

        .clock-countdown {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          font-size: var(--font-md);
          color: var(--color-warning);
        }

        .clock-countdown-icon {
          display: inline-flex;
          line-height: 0;
        }

        .clock-countdown-icon svg {
          width: 1.2em;
          height: 1.2em;
          display: block;
        }

        .clock-countdown.urgent {
          color: var(--color-error);
        }

        .emote-bubble {
          position: absolute;
          top: -1.5em;
          left: 50%;
          transform: translateX(-50%);
          font-size: 3rem;
          z-index: 2;
          pointer-events: none;
          animation: emote-float 3s ease-out forwards;
        }

        @keyframes emote-float {
          0% {
            opacity: 0;
            transform: translateX(-50%) scale(0.5);
          }
          10% {
            opacity: 1;
            transform: translateX(-50%) scale(1);
          }
          70% {
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateX(-50%) translateY(-1.5em) scale(1);
          }
        }

        .chat-bubble {
          position: absolute;
          bottom: calc(100% + 0.6em);
          left: 50%;
          transform: translateX(-50%);
          font-size: var(--font-sm);
          z-index: 2;
          pointer-events: none;
          animation: chat-float 3s ease-out forwards;
          background: #f0f0f0;
          color: #0f0f1a;
          padding: 6px 8px;
          width: 14ch;
          overflow-wrap: break-word;
          border-radius: 0.4em;
          border: 3px solid var(--color-bg-dark);
          box-shadow:
            3px 3px 0 var(--color-bg-dark),
            inset -2px -2px 0 rgba(0, 0, 0, 0.1),
            inset 2px 2px 0 rgba(255, 255, 255, 0.4);
        }

        .chat-bubble::after {
          content: "";
          position: absolute;
          bottom: 0;
          left: 50%;
          width: 0;
          height: 0;
          border: 0.563em solid transparent;
          border-top-color: #f0f0f0;
          border-bottom: 0;
          margin-left: -0.563em;
          margin-bottom: -0.563em;
          filter: drop-shadow(2px 2px 0 var(--color-bg-dark));
        }

        @keyframes chat-float {
          0% {
            opacity: 0;
            transform: translateX(-50%) scale(0.5);
          }
          10% {
            opacity: 1;
            transform: translateX(-50%) scale(1);
          }
          70% {
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateX(-50%) translateY(-1em) scale(1);
          }
        }
      `,
      seatBetStyles,
    ];
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
