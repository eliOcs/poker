import * as COLORS from "./colors.js";
import { html, css, unsafeCSS, LitElement } from "lit";

const SUIT_SYMBOLS = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

const RANK_DISPLAY = {
  ace: "A",
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "10",
  jack: "J",
  queen: "Q",
  king: "K",
};

class Card extends LitElement {
  static get styles() {
    return css`
      :host {
        display: inline-block;
        font-family: "Press Start 2P", monospace;
      }

      .card {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 48px;
        background-color: ${unsafeCSS(COLORS.fgWhite)};
        border: 3px solid ${unsafeCSS(COLORS.bgDark)};
        line-height: 1;
      }

      .card .rank {
        font-size: 0.9em;
      }

      .card .suit {
        font-family: serif;
        font-size: 1.3em;
        margin-top: -2px;
      }

      .card.red {
        color: ${unsafeCSS(COLORS.red)};
      }

      .card.black {
        color: ${unsafeCSS(COLORS.bgDark)};
      }

      .card.hidden {
        background-color: ${unsafeCSS(COLORS.blue)};
        background-image:
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 4px,
            ${unsafeCSS(COLORS.purple)} 4px,
            ${unsafeCSS(COLORS.purple)} 8px
          ),
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 4px,
            ${unsafeCSS(COLORS.purple)} 4px,
            ${unsafeCSS(COLORS.purple)} 8px
          );
      }

      .card.placeholder {
        background-color: ${unsafeCSS(COLORS.bgLight)};
        border-color: ${unsafeCSS(COLORS.bgDisabled)};
        border-style: dashed;
      }
    `;
  }

  static get properties() {
    return {
      card: { type: Object },
    };
  }

  render() {
    if (!this.card) {
      return html`<span class="card placeholder"></span>`;
    }
    if (this.card.hidden) {
      return html`<span class="card hidden"></span>`;
    }
    const isRed = this.card.suit === "hearts" || this.card.suit === "diamonds";
    return html`
      <span class="card ${isRed ? "red" : "black"}">
        <span class="rank">${RANK_DISPLAY[this.card.rank]}</span>
        <span class="suit">${SUIT_SYMBOLS[this.card.suit]}</span>
      </span>
    `;
  }
}

customElements.define("phg-card", Card);
