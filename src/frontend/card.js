import { html, css, LitElement } from "lit";
import { designTokens, baseStyles } from "./styles.js";

const SUIT_SYMBOLS = {
  h: "♥",
  d: "♦",
  c: "♣",
  s: "♠",
};

const RANK_DISPLAY = {
  A: "A",
  K: "K",
  Q: "Q",
  J: "J",
  T: "10",
  9: "9",
  8: "8",
  7: "7",
  6: "6",
  5: "5",
  4: "4",
  3: "3",
  2: "2",
};

class Card extends LitElement {
  static get styles() {
    return [
      designTokens,
      baseStyles,
      css`
        :host {
          display: inline-block;
        }

        .card {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 50px;
          background-color: var(--color-fg-white);
          border: 3px solid var(--color-bg-dark);
          line-height: 1;
          font-size: 14px;
        }

        .card .rank {
          font-size: 14px;
        }

        .card .suit {
          font-family: serif;
          font-size: 20px;
          margin-top: -2px;
        }

        .card.red {
          color: var(--color-error);
        }

        .card.black {
          color: var(--color-bg-dark);
        }

        .card.hidden {
          background-color: var(--color-accent);
          background-image:
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 4px,
              var(--color-secondary) 4px,
              var(--color-secondary) 8px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 4px,
              var(--color-secondary) 4px,
              var(--color-secondary) 8px
            );
        }

        .card.placeholder {
          background-color: var(--color-bg-light);
          border-color: var(--color-bg-disabled);
          border-style: dashed;
        }

        .card.winning {
          border-color: var(--color-primary);
          box-shadow: 0 0 6px var(--color-primary);
        }

        /* Larger cards on desktop */
        @media (width >= 800px) {
          .card {
            width: 57px;
            height: 77px;
            font-size: 18px;
          }

          .card .rank {
            font-size: 20px;
          }

          .card .suit {
            font-size: 28px;
          }
        }
      `,
    ];
  }

  static get properties() {
    return {
      card: { type: Object },
      winning: { type: Boolean },
    };
  }

  render() {
    if (!this.card) {
      return html`<span class="card placeholder"></span>`;
    }
    if (this.card === "??") {
      return html`<span class="card hidden"></span>`;
    }
    const rank = this.card.slice(0, -1);
    const suit = this.card.slice(-1);
    const isRed = suit === "h" || suit === "d";
    const classes = `card ${isRed ? "red" : "black"} ${this.winning ? "winning" : ""}`;
    return html`
      <span class="${classes}">
        <span class="rank">${RANK_DISPLAY[rank]}</span>
        <span class="suit">${SUIT_SYMBOLS[suit]}</span>
      </span>
    `;
  }
}

customElements.define("phg-card", Card);
