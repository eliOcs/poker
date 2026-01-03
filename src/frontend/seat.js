import * as COLORS from "./colors.js";
import { html, css, unsafeCSS, LitElement } from "lit";
import "./card.js";
import "./button.js";

class Seat extends LitElement {
  static get styles() {
    return css`
      :host {
        display: flex;
        flex-direction: column;
        gap: 4px;
        border: 4px solid ${unsafeCSS(COLORS.fgDark)};
        background: ${unsafeCSS(COLORS.bgLight)};
        padding: 8px;
        font-family: "Press Start 2P", monospace;
        font-size: 0.5em;
        box-shadow: 4px 4px 0 ${unsafeCSS(COLORS.bgDark)};
        box-sizing: border-box;
        min-height: 130px;
      }

      :host(.empty) {
        justify-content: center;
        align-items: center;
        gap: 12px;
        font-size: 0.7em;
      }

      :host(.acting) {
        border-color: ${unsafeCSS(COLORS.gold)};
        box-shadow:
          4px 4px 0 ${unsafeCSS(COLORS.bgDark)},
          0 0 0 4px ${unsafeCSS(COLORS.gold)};
      }

      :host(.folded) {
        opacity: 0.4;
      }

      :host(.sitting-out) {
        opacity: 0.5;
        border-style: dashed;
      }

      :host(.disconnected) {
        border-color: ${unsafeCSS(COLORS.red)};
        border-style: dotted;
        opacity: 0.7;
      }

      :host(.all-in) {
        border-color: ${unsafeCSS(COLORS.red)};
      }

      :host(.current-player) {
        border-color: ${unsafeCSS(COLORS.magenta)};
      }

      .player-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: ${unsafeCSS(COLORS.fgWhite)};
      }

      .stack {
        color: ${unsafeCSS(COLORS.greenLight)};
      }

      .dealer-button {
        display: inline-block;
        background-color: ${unsafeCSS(COLORS.gold)};
        color: ${unsafeCSS(COLORS.bgDark)};
        width: 18px;
        height: 18px;
        text-align: center;
        line-height: 18px;
        font-size: 0.8em;
        margin-left: 4px;
        border: 2px solid ${unsafeCSS(COLORS.bgDark)};
      }

      .hole-cards {
        display: flex;
        gap: 4px;
        margin-top: auto;
      }

      .status-label {
        font-size: 0.8em;
        color: ${unsafeCSS(COLORS.gold)};
      }

      .last-action {
        font-size: 0.8em;
        color: ${unsafeCSS(COLORS.cyan)};
        text-transform: uppercase;
      }

      .hand-result {
        font-size: 0.8em;
        text-transform: uppercase;
      }

      .hand-result.won {
        color: ${unsafeCSS(COLORS.greenLight)};
      }

      .hand-result.lost {
        color: ${unsafeCSS(COLORS.red)};
      }

      .hand-rank {
        font-size: 0.7em;
        color: ${unsafeCSS(COLORS.fgMedium)};
        margin-top: auto;
      }

      .empty-label {
        color: ${unsafeCSS(COLORS.fgDark)};
      }
    `;
  }

  static get properties() {
    return {
      seat: { type: Object },
      seatNumber: { type: Number },
      isButton: { type: Boolean },
      showSitAction: { type: Boolean },
    };
  }

  constructor() {
    super();
    this.showSitAction = true;
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
      <div class="player-info">
        <span class="player-name">
          ${this.seat.player?.name || `Seat ${this.seatNumber + 1}`}
          ${this.isButton ? html`<span class="dealer-button">D</span>` : ""}
        </span>
      </div>
      <div class="stack">$${this.seat.stack}</div>
      ${this.seat.handResult != null
        ? html`<div
            class="hand-result ${this.seat.handResult > 0
              ? "won"
              : this.seat.handResult < 0
                ? "lost"
                : ""}"
          >
            ${this.seat.handResult > 0
              ? `WON +$${this.seat.handResult}`
              : this.seat.handResult < 0
                ? `LOST -$${Math.abs(this.seat.handResult)}`
                : ""}
          </div>`
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
        ${this.seat.cards?.map(
          (card) => html`<phg-card .card=${card}></phg-card>`,
        ) || ""}
      </div>
    `;
  }
}

customElements.define("phg-seat", Seat);
