import { html, css, LitElement } from "lit";
import { designTokens, baseStyles } from "./styles.js";
import "./card.js";

class Board extends LitElement {
  static get styles() {
    return [
      designTokens,
      baseStyles,
      css`
        :host {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          width: 100%;
          background-color: var(--color-table);
          border: 6px solid var(--color-bg-dark);
          border-radius: 50%;
          box-shadow:
            inset 4px 4px 0 rgba(255, 255, 255, 0.1),
            inset -4px -4px 0 rgba(0, 0, 0, 0.2),
            8px 8px 0 var(--color-bg-dark);
          box-sizing: border-box;
        }

        .board-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-lg);
        }

        .community-cards {
          display: flex;
          gap: var(--space-md);
        }

        .pot {
          font-size: var(--font-md);
          color: var(--color-primary);
        }

        .phase {
          font-size: var(--font-sm);
          color: var(--color-fg-white);
          text-transform: uppercase;
          letter-spacing: 2px;
        }

        .countdown {
          font-size: calc(var(--font-lg) * 2);
          color: var(--color-primary);
          text-shadow: var(--space-sm) var(--space-sm) 0 var(--color-bg-dark);
        }

        .winner-message {
          text-align: center;
        }

        .winner-name {
          font-size: var(--font-md);
          color: var(--color-primary);
          text-shadow: 2px 2px 0 var(--color-bg-dark);
          margin-bottom: var(--space-md);
        }

        .winner-hand {
          font-size: var(--font-md);
          color: var(--color-fg-white);
        }

        .winner-amount {
          font-size: var(--font-md);
          color: var(--color-success);
          margin-top: var(--space-md);
        }
      `,
    ];
  }

  static get properties() {
    return {
      board: { type: Object },
      hand: { type: Object },
      countdown: { type: Number },
      winnerMessage: { type: Object },
      winningCards: { type: Array },
    };
  }

  isWinningCard(card) {
    return this.winningCards?.includes(card);
  }

  render() {
    const cards = this.board?.cards || [];

    // Show winner message if present (with cards still visible)
    if (this.winnerMessage) {
      return html`
        <div class="board-info">
          <div class="community-cards">
            ${cards.map(
              (card) =>
                html`<phg-card
                  .card=${card}
                  ?winning=${this.isWinningCard(card)}
                ></phg-card>`,
            )}
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
          ${cards.map(
            (card) =>
              html`<phg-card
                .card=${card}
                ?winning=${this.isWinningCard(card)}
              ></phg-card>`,
          )}
        </div>
        ${this.hand?.pot !== undefined
          ? html`<div class="pot">Pot: $${this.hand.pot}</div>`
          : ""}
      </div>
    `;
  }
}

customElements.define("phg-board", Board);
