import { html, css, LitElement } from "lit";
import { designTokens, baseStyles } from "./styles.js";
import "./card.js";
import "./button.js";

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
          border: var(--space-sm) solid var(--color-fg-muted);
          background: var(--color-bg-light);
          padding: var(--space-md);
          font-size: var(--font-sm);
          box-shadow: var(--space-sm) var(--space-sm) 0 var(--color-bg-dark);
          box-sizing: border-box;
          min-height: 130px;
        }

        :host(.empty) {
          justify-content: center;
          align-items: center;
          gap: var(--space-lg);
          font-size: var(--font-md);
        }

        :host(.acting) {
          border-color: var(--color-primary);
          box-shadow:
            var(--space-sm) var(--space-sm) 0 var(--color-bg-dark),
            0 0 0 var(--space-sm) var(--color-primary);
        }

        :host(.folded) {
          opacity: 0.4;
        }

        :host(.sitting-out) {
          opacity: 0.5;
          border-style: dashed;
        }

        :host(.disconnected) {
          border-color: var(--color-error);
          border-style: dotted;
          opacity: 0.7;
        }

        :host(.all-in) {
          border-color: var(--color-error);
        }

        :host(.current-player) {
          border-color: var(--color-highlight);
        }

        .player-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--color-fg-white);
        }

        .stack {
          color: var(--color-success);
        }

        .dealer-button {
          position: absolute;
          top: calc(-1 * var(--space-md));
          right: calc(-1 * var(--space-md));
          background-color: var(--color-primary);
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

        .hole-cards {
          display: flex;
          gap: var(--space-sm);
          margin-top: auto;
        }

        .status-label {
          font-size: var(--font-md);
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

        .hand-rank {
          font-size: var(--font-md);
          color: var(--color-fg-medium);
          margin-top: auto;
        }

        .empty-label {
          color: var(--color-fg-muted);
        }

        .clock-countdown {
          display: flex;
          align-items: center;
          gap: 2px;
          font-size: var(--font-lg);
          color: var(--color-warning);
        }

        .clock-countdown.urgent {
          color: var(--color-error);
        }
      `,
    ];
  }

  static get properties() {
    return {
      seat: { type: Object },
      seatNumber: { type: Number },
      isButton: { type: Boolean },
      showSitAction: { type: Boolean },
      clockCalledAt: { type: Number },
      _clockRemaining: { type: Number, state: true },
    };
  }

  constructor() {
    super();
    this.showSitAction = true;
    this.clockCalledAt = null;
    this._clockRemaining = null;
    this._clockInterval = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this._startClockTimer();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopClockTimer();
  }

  _startClockTimer() {
    this._stopClockTimer();
    this._clockInterval = setInterval(() => {
      this._updateClockRemaining();
    }, 100);
  }

  _stopClockTimer() {
    if (this._clockInterval) {
      clearInterval(this._clockInterval);
      this._clockInterval = null;
    }
  }

  _updateClockRemaining() {
    if (this.clockCalledAt) {
      const elapsed = Date.now() - this.clockCalledAt;
      const remaining = Math.max(0, Math.ceil((30000 - elapsed) / 1000));
      this._clockRemaining = remaining;
    } else {
      this._clockRemaining = null;
    }
  }

  updated(changedProperties) {
    // Update host classes based on seat state
    if (changedProperties.has("seat")) {
      const isEmpty = !this.seat || this.seat.empty;
      this.classList.toggle("empty", isEmpty);
      // Only apply game state classes to occupied seats
      this.classList.toggle("acting", !isEmpty && this.seat?.isActing);
      this.classList.toggle("folded", !isEmpty && this.seat?.folded);
      this.classList.toggle("all-in", !isEmpty && this.seat?.allIn);
      this.classList.toggle("sitting-out", !isEmpty && this.seat?.sittingOut);
      this.classList.toggle(
        "disconnected",
        !isEmpty && this.seat?.disconnected,
      );
      this.classList.toggle(
        "current-player",
        !isEmpty && this.seat?.isCurrentPlayer,
      );
    }
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

  render() {
    if (!this.seat || this.seat.empty) {
      const sitAction = this.seat?.actions?.find((a) => a.action === "sit");
      return html`
        <span class="empty-label">Empty</span>
        ${sitAction && this.showSitAction
          ? html`<phg-button @click=${this.handleSit}>Sit</phg-button>`
          : ""}
      `;
    }

    return html`
      ${this.isButton ? html`<span class="dealer-button">D</span>` : ""}
      <div class="player-info">
        <span class="player-name">
          ${this.seat.player?.name || `Seat ${this.seatNumber + 1}`}
        </span>
      </div>
      ${this.seat.handResult != null
        ? html`<div
            class="hand-result ${this.seat.handResult > 0
              ? "won"
              : this.seat.handResult < 0
                ? "lost"
                : ""}"
          >
            ${this.seat.handResult > 0
              ? `+$${this.seat.handResult}`
              : this.seat.handResult < 0
                ? `-$${Math.abs(this.seat.handResult)}`
                : "$0"}
          </div>`
        : html`<div class="stack">$${this.seat.stack}</div>`}
      ${this._clockRemaining !== null
        ? html`<div
            class="clock-countdown ${this._clockRemaining <= 10
              ? "urgent"
              : ""}"
          >
            <span>⏱</span><span>${this._clockRemaining}s</span>
          </div>`
        : ""}
      ${this.seat.handResult != null
        ? ""
        : this.seat.disconnected
          ? html`<div class="status-label">DISCONNECTED</div>`
          : this.seat.sittingOut
            ? html`<div class="status-label">SITTING OUT</div>`
            : this.seat.folded
              ? html`<div class="status-label">FOLDED</div>`
              : this.seat.allIn
                ? html`<div class="status-label">ALL-IN</div>`
                : this.seat.lastAction
                  ? html`<div class="last-action">${this.seat.lastAction}</div>`
                  : ""}
      ${this.seat.handRank
        ? html`<div class="hand-rank">${this.seat.handRank}</div>`
        : ""}
      <div class="hole-cards">
        ${this.seat.cards?.map((card) => {
          const isWinning = this.seat.winningCards?.some(
            (wc) => wc.rank === card.rank && wc.suit === card.suit,
          );
          return html`<phg-card
            .card=${card}
            ?winning=${isWinning}
          ></phg-card>`;
        }) || ""}
      </div>
    `;
  }
}

customElements.define("phg-seat", Seat);
