import { html, LitElement } from "lit";
import { ICONS } from "./icons.js";
import "./card.js";

/** @typedef {import("../backend/poker/hand-rankings.js").HandName} HandName */

/**
 * Poker hands from strongest to weakest. `madeCards` is how many leading
 * cards form the hand; the rest are kickers and render faded.
 * @type {{ handName: HandName, name: string, cards: string[], madeCards: number }[]}
 */
const HAND_RANKINGS = [
  {
    handName: "royal flush",
    name: "Royal Flush",
    cards: ["Ts", "Js", "Qs", "Ks", "As"],
    madeCards: 5,
  },
  {
    handName: "straight flush",
    name: "Straight Flush",
    cards: ["5c", "6c", "7c", "8c", "9c"],
    madeCards: 5,
  },
  {
    handName: "4 of a kind",
    name: "Four of a Kind",
    cards: ["Ad", "Ac", "Ah", "As", "8c"],
    madeCards: 4,
  },
  {
    handName: "full house",
    name: "Full House",
    cards: ["Kc", "Kh", "Ks", "Tc", "Ts"],
    madeCards: 5,
  },
  {
    handName: "flush",
    name: "Flush",
    cards: ["Qc", "8c", "6c", "4c", "3c"],
    madeCards: 5,
  },
  {
    handName: "straight",
    name: "Straight",
    cards: ["2d", "3c", "4s", "5d", "6c"],
    madeCards: 5,
  },
  {
    handName: "3 of a kind",
    name: "Three of a Kind",
    cards: ["Jd", "Jc", "Jh", "5c", "8d"],
    madeCards: 3,
  },
  {
    handName: "2 pair",
    name: "Two Pair",
    cards: ["6s", "6c", "Tc", "Td", "Kd"],
    madeCards: 4,
  },
  {
    handName: "pair",
    name: "Pair",
    cards: ["Ah", "Ac", "2d", "6h", "8s"],
    madeCards: 2,
  },
  {
    handName: "high card",
    name: "High Card",
    cards: ["Kh", "Jd", "Tc", "6h", "3d"],
    madeCards: 1,
  },
];

class HandRankingsPanel extends LitElement {
  createRenderRoot() {
    return this;
  }

  static get properties() {
    return {
      handName: { type: String },
    };
  }

  constructor() {
    super();
    /** @type {HandName | undefined} The current player's hand, highlighted. */
    this.handName = undefined;
  }

  render() {
    return html`
      <div class="hand-rankings">
        <div class="strength-axis">
          ${ICONS.up}
          <span class="axis-label">Best</span>
          <span class="axis-line"></span>
          <span class="axis-label">Worst</span>
          ${ICONS.down}
        </div>
        <ol>
          ${HAND_RANKINGS.map(
            ({ handName, name, cards, madeCards }) => html`
              <li
                class=${handName === this.handName ? "current" : ""}
                aria-current=${handName === this.handName ? "true" : "false"}
              >
                <span class="hand-cards">
                  ${cards.map(
                    (card, cardIndex) =>
                      html`<phg-card
                        class=${cardIndex < madeCards ? "" : "kicker"}
                        .card=${card}
                        noAnimation
                        size="medium"
                      ></phg-card>`,
                  )}
                </span>
                <span class="hand-name">${name}</span>
              </li>
            `,
          )}
        </ol>
      </div>
    `;
  }
}

customElements.define("phg-hand-rankings-panel", HandRankingsPanel);
