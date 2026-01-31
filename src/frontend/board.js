import { html, css, LitElement } from "lit";
import { designTokens, baseStyles, formatCurrency } from "./styles.js";
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
          background-color: var(--board-bg, var(--color-table));
          border: 6px solid var(--color-bg-dark);
          border-radius: 9999px;
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

        .stakes {
          font-size: var(--font-sm);
          color: var(--color-fg-muted);
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

        .tournament-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-xs);
          padding: var(--space-sm) var(--space-md);
          background: rgba(0, 0, 0, 0.3);
          border-radius: var(--space-sm);
          margin-bottom: var(--space-md);
        }

        .tournament-level {
          font-size: var(--font-sm);
          color: var(--color-fg-white);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .tournament-timer {
          font-size: var(--font-md);
          color: var(--color-primary);
          font-variant-numeric: tabular-nums;
        }

        .tournament-break {
          background: var(--color-warning);
          color: var(--color-bg-dark);
          padding: var(--space-xs) var(--space-sm);
          font-size: var(--font-sm);
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .tournament-winner-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.8);
          border-radius: 9999px;
          z-index: 10;
        }

        .tournament-winner-title {
          font-size: calc(var(--font-lg) * 1.5);
          color: var(--color-primary);
          text-shadow: var(--space-sm) var(--space-sm) 0 var(--color-bg-dark);
          margin-bottom: var(--space-md);
        }

        .tournament-winner-name {
          font-size: var(--font-lg);
          color: var(--color-fg-white);
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
      blinds: { type: Object },
      tournament: { type: Object },
      seats: { type: Array },
    };
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  getTournamentWinnerName() {
    if (this.tournament?.winner === null || !this.seats) return null;
    const winnerSeat = this.seats[this.tournament.winner];
    if (winnerSeat && !winnerSeat.empty) {
      return winnerSeat.player?.name || `Seat ${this.tournament.winner + 1}`;
    }
    return `Seat ${this.tournament.winner + 1}`;
  }

  renderTournamentInfo() {
    if (!this.tournament) return "";

    if (this.tournament.onBreak) {
      return html`
        <div class="tournament-info">
          <div class="tournament-break">Break</div>
          <div class="tournament-timer">
            ${this.formatTime(this.tournament.timeToNextLevel)}
          </div>
        </div>
      `;
    }

    return html`
      <div class="tournament-info">
        <div class="tournament-level">Level ${this.tournament.level}</div>
        <div class="tournament-timer">
          ${this.formatTime(this.tournament.timeToNextLevel)}
        </div>
      </div>
    `;
  }

  renderTournamentWinner() {
    if (!this.tournament || this.tournament.winner === null) return "";
    const winnerName = this.getTournamentWinnerName();
    return html`
      <div class="tournament-winner-overlay">
        <div class="tournament-winner-title">Tournament Winner!</div>
        <div class="tournament-winner-name">${winnerName}</div>
      </div>
    `;
  }

  isWinningCard(card) {
    return this.winningCards?.includes(card);
  }

  renderStakes() {
    if (!this.blinds) return "";
    return html`<div class="stakes">
      ${formatCurrency(this.blinds.small)}/${formatCurrency(this.blinds.big)}
    </div>`;
  }

  renderCommunityCards(cards) {
    return html`
      <div class="community-cards">
        ${cards.map(
          (card) =>
            html`<phg-card
              .card=${card}
              ?winning=${this.isWinningCard(card)}
            ></phg-card>`,
        )}
      </div>
    `;
  }

  renderWinnerMessage() {
    return html`
      <div class="winner-message">
        <div class="winner-name">${this.winnerMessage.playerName} wins!</div>
        ${this.winnerMessage.handRank
          ? html`<div class="winner-hand">${this.winnerMessage.handRank}</div>`
          : ""}
        <div class="winner-amount">
          +${formatCurrency(this.winnerMessage.amount)}
        </div>
      </div>
    `;
  }

  hasTournamentWinner() {
    return (
      this.tournament?.winner !== null && this.tournament?.winner !== undefined
    );
  }

  hasCountdown() {
    return this.countdown !== null && this.countdown !== undefined;
  }

  renderCountdownView() {
    return html`
      <div class="board-info">
        ${this.renderTournamentInfo()}
        <div class="phase">Starting in...</div>
        <div class="countdown">${this.countdown}</div>
        ${this.renderStakes()}
      </div>
    `;
  }

  renderBreakView() {
    return html`
      <div class="board-info">
        ${this.renderTournamentInfo()}
        <div class="phase">On Break</div>
        ${this.renderStakes()}
      </div>
    `;
  }

  renderDefaultView(cards) {
    const phase = this.hand?.phase || "Waiting";
    return html`
      <div class="board-info">
        ${this.renderTournamentInfo()}
        <div class="phase">${phase}</div>
        ${this.renderCommunityCards(cards)}
        ${this.hand
          ? html`<div class="pot">Pot: ${formatCurrency(this.hand.pot)}</div>`
          : ""}
        ${this.renderStakes()}
      </div>
    `;
  }

  render() {
    const cards = this.board?.cards ?? [];

    if (this.hasTournamentWinner()) {
      return html`
        ${this.renderTournamentWinner()}
        <div class="board-info">
          ${this.renderTournamentInfo()} ${this.renderCommunityCards(cards)}
          ${this.renderStakes()}
        </div>
      `;
    }

    if (this.winnerMessage) {
      return html`
        <div class="board-info">
          ${this.renderTournamentInfo()} ${this.renderCommunityCards(cards)}
          ${this.renderWinnerMessage()} ${this.renderStakes()}
        </div>
      `;
    }

    if (this.hasCountdown()) return this.renderCountdownView();
    if (this.tournament?.onBreak) return this.renderBreakView();
    return this.renderDefaultView(cards);
  }
}

customElements.define("phg-board", Board);
