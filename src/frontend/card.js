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

        .card-wrapper {
          display: inline-block;
          position: relative;
          width: 42px;
          height: 56px;
          perspective: 600px;
        }

        .card {
          position: absolute;
          inset: 0;
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background-color: var(--color-fg-white);
          border: 3px solid var(--color-bg-dark);
          line-height: 1;
          font-size: 14px;
          backface-visibility: hidden;
          box-sizing: border-box;
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

        .card.back {
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

        .card.front {
          transform: rotateY(180deg);
        }

        .flipped .card.back {
          transform: rotateY(-180deg);
        }

        .flipped .card.front {
          transform: rotateY(0);
        }

        .flipping .card {
          transition: transform 0.4s ease-in-out;
        }

        @keyframes deal-in {
          from {
            transform: rotateY(90deg);
          }
        }

        .dealing .card.back {
          animation: deal-in 0.3s ease-out;
        }

        .dealing.flipped .card.front {
          animation: deal-in 0.3s ease-out;
        }

        .card.placeholder {
          position: static;
          width: 42px;
          height: 56px;
          background-color: var(--color-bg-light);
          border-color: var(--color-bg-disabled);
          border-style: dashed;
          box-sizing: border-box;
        }

        .card.winning {
          border-color: var(--color-primary);
          box-shadow: 0 0 6px var(--color-primary);
        }

        /* Larger cards on desktop */
        @media (width >= 800px) {
          .card-wrapper {
            width: 63px;
            height: 83px;
          }

          .card {
            font-size: 18px;
          }

          .card.placeholder {
            width: 63px;
            height: 83px;
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
      _flipping: { state: true },
      _dealing: { state: true },
    };
  }

  constructor() {
    super();
    this._prevCard = undefined;
    this._flipping = false;
    this._dealing = false;
  }

  willUpdate(changed) {
    if (changed.has("card")) {
      const prev = this._prevCard;
      this._prevCard = this.card;
      if (prev === "??" && this.card && this.card !== "??") {
        this._flipping = true;
      } else if (!prev && this.card) {
        this._dealing = true;
      }
    }
  }

  updated() {
    if (this._flipping) {
      const front = this.shadowRoot.querySelector(".card.front");
      if (front) {
        const handler = () => {
          front.removeEventListener("transitionend", handler);
          this._flipping = false;
        };
        front.addEventListener("transitionend", handler);
      }
    }
    if (this._dealing) {
      const isFlipped = this.card && this.card !== "??";
      const face = this.shadowRoot.querySelector(
        isFlipped ? ".card.front" : ".card.back",
      );
      if (face) {
        const handler = () => {
          face.removeEventListener("animationend", handler);
          this._dealing = false;
        };
        face.addEventListener("animationend", handler);
      }
    }
  }

  render() {
    if (!this.card) {
      return html`<span class="card placeholder"></span>`;
    }

    const isHidden = this.card === "??";
    const isFlipped = !isHidden;
    const wrapperClasses = `card-wrapper${isFlipped ? " flipped" : ""}${this._flipping ? " flipping" : ""}${this._dealing ? " dealing" : ""}`;

    let frontContent = "";
    let frontClasses = "card front";
    if (!isHidden) {
      const rank = this.card.slice(0, -1);
      const suit = this.card.slice(-1);
      const isRed = suit === "h" || suit === "d";
      frontClasses += isRed ? " red" : " black";
      if (this.winning) frontClasses += " winning";
      frontContent = html`
        <span class="rank">${RANK_DISPLAY[rank]}</span>
        <span class="suit">${SUIT_SYMBOLS[suit]}</span>
      `;
    }

    return html`
      <span class="${wrapperClasses}">
        <span class="card back"></span>
        <span class="${frontClasses}">${frontContent}</span>
      </span>
    `;
  }
}

customElements.define("phg-card", Card);
