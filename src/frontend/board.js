import * as COLORS from "./colors.js";
import { html, css, unsafeCSS, LitElement } from "lit";
import "./card.js";

class Board extends LitElement {
  static get styles() {
    return css`
      :host {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        width: 100%;
        background-color: ${unsafeCSS(COLORS.green)};
        border: 6px solid ${unsafeCSS(COLORS.bgDark)};
        box-shadow:
          inset 4px 4px 0 rgba(255, 255, 255, 0.1),
          inset -4px -4px 0 rgba(0, 0, 0, 0.2),
          8px 8px 0 ${unsafeCSS(COLORS.bgDark)};
        font-family: "Press Start 2P", monospace;
        box-sizing: border-box;
      }

      .board-info {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }

      .community-cards {
        display: flex;
        gap: 6px;
      }

      .pot {
        font-size: 0.7em;
        color: ${unsafeCSS(COLORS.gold)};
      }

      .phase {
        font-size: 0.5em;
        color: ${unsafeCSS(COLORS.fgWhite)};
        text-transform: uppercase;
        letter-spacing: 2px;
      }

      .countdown {
        font-size: 2em;
        color: ${unsafeCSS(COLORS.gold)};
        text-shadow: 4px 4px 0 ${unsafeCSS(COLORS.bgDark)};
      }

      .winner-message {
        text-align: center;
      }

      .winner-name {
        font-size: 0.8em;
        color: ${unsafeCSS(COLORS.gold)};
        text-shadow: 2px 2px 0 ${unsafeCSS(COLORS.bgDark)};
        margin-bottom: 8px;
      }

      .winner-hand {
        font-size: 0.6em;
        color: ${unsafeCSS(COLORS.fgWhite)};
      }

      .winner-amount {
        font-size: 0.7em;
        color: ${unsafeCSS(COLORS.greenLight)};
        margin-top: 8px;
      }
    `;
  }

  static get properties() {
    return {
      board: { type: Object },
      hand: { type: Object },
      countdown: { type: Number },
      winnerMessage: { type: Object },
    };
  }

  render() {
    const cards = this.board?.cards || [];

    // Show winner message if present (with cards still visible)
    if (this.winnerMessage) {
      return html`
        <div class="board-info">
          <div class="community-cards">
            ${cards.map((card) => html`<phg-card .card=${card}></phg-card>`)}
          </div>
          <div class="winner-message">
            <div class="winner-name">
              ${this.winnerMessage.playerName} wins!
            </div>
            ${this.winnerMessage.handRank
              ? html`<div class="winner-hand">
                  ${this.winnerMessage.handRank}
                </div>`
              : ""}
            <div class="winner-amount">+$${this.winnerMessage.amount}</div>
          </div>
        </div>
      `;
    }

    // Show countdown if active
    if (this.countdown !== null && this.countdown !== undefined) {
      return html`
        <div class="board-info">
          <div class="phase">Starting in...</div>
          <div class="countdown">${this.countdown}</div>
        </div>
      `;
    }

    return html`
      <div class="board-info">
        ${this.hand?.phase
          ? html`<div class="phase">${this.hand.phase}</div>`
          : html`<div class="phase">Waiting</div>`}
        <div class="community-cards">
          ${cards.map((card) => html`<phg-card .card=${card}></phg-card>`)}
        </div>
        ${this.hand?.pot !== undefined
          ? html`<div class="pot">Pot: $${this.hand.pot}</div>`
          : ""}
      </div>
    `;
  }
}

customElements.define("phg-board", Board);
