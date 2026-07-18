import { html, LitElement } from "lit";

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
  createRenderRoot() {
    return this;
  }

  static get properties() {
    return {
      card: { type: Object },
      winning: { type: Boolean },
      noAnimation: { type: Boolean },
      _flipping: { state: true },
      _dealing: { state: true },
    };
  }

  constructor() {
    super();
    this.card = undefined;
    this.winning = false;
    this.noAnimation = false;
    this._prevCard = undefined;
    this._flipping = false;
    this._dealing = false;
  }

  willUpdate(changed) {
    if (changed.has("card") && !this.noAnimation) {
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
      const front = /** @type {HTMLElement|undefined} */ (
        this.querySelector(".card.front")
      );
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
      const face = /** @type {HTMLElement|undefined} */ (
        this.querySelector(isFlipped ? ".card.front" : ".card.back")
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

  _renderStatic() {
    if (this.card === "??") {
      return html`<span class="card back static"></span>`;
    }
    const rank = this.card.slice(0, -1);
    const suit = this.card.slice(-1);
    const isRed = suit === "h" || suit === "d";
    const classes = `card static ${isRed ? "red" : "black"}${this.winning ? " winning" : ""}`;
    return html`
      <span class="${classes}">
        <span class="rank">${RANK_DISPLAY[rank]}</span>
        <span class="suit">${SUIT_SYMBOLS[suit]}</span>
      </span>
    `;
  }

  render() {
    if (!this.card) {
      return html`<span class="card placeholder"></span>`;
    }

    if (this.noAnimation) {
      return this._renderStatic();
    }

    const isHidden = this.card === "??";
    const isFlipped = !isHidden;
    const wrapperClasses = `card-wrapper${isFlipped ? " flipped" : ""}${this._flipping ? " flipping" : ""}${this._dealing ? " dealing" : ""}`;

    let frontContent = undefined;
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
