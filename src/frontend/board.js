import { html, LitElement } from "lit";
import { formatCurrency } from "./currency.js";
import "./card.js";
import "./chips.js";

class Board extends LitElement {
  createRenderRoot() {
    return this;
  }

  static get properties() {
    return {
      board: { type: Object },
      hand: { type: Object },
      countdown: { type: Number },
      winnerMessage: { type: Object },
      winningCards: { type: Array },
      noAnimation: { type: Boolean },
      tournament: { type: Object },
      seats: { type: Array },
    };
  }

  constructor() {
    super();
    this.board = undefined;
    this.hand = undefined;
    this.countdown = undefined;
    this.winnerMessage = undefined;
    this.winningCards = undefined;
    this.noAnimation = false;
    this.tournament = undefined;
    this.seats = undefined;
  }

  getTournamentWinnerName() {
    if ((this.tournament?.winner ?? undefined) === undefined || !this.seats)
      return;
    const winnerSeat = this.seats[this.tournament.winner];
    if (winnerSeat && !winnerSeat.empty) {
      return winnerSeat.player?.name ?? `Seat ${this.tournament.winner + 1}`;
    }
    return `Seat ${this.tournament.winner + 1}`;
  }

  renderTournamentWinner() {
    if (!this.tournament || (this.tournament.winner ?? undefined) === undefined)
      return "";
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

  renderCommunityCards(cards) {
    return html`
      <div class="community-cards">
        ${cards.map(
          (card) =>
            html`<phg-card
              .card=${card}
              ?winning=${this.isWinningCard(card)}
              ?noAnimation=${this.noAnimation}
            ></phg-card>`,
        )}
      </div>
    `;
  }

  renderWinnerMessage() {
    const { playerName, handRank, amount, isSplit } = this.winnerMessage;
    return html`
      <div class="winner-message">
        <div class="winner-name">
          ${isSplit ? "Split pot!" : `${playerName} wins!`}
        </div>
        ${handRank ? html`<div class="winner-hand">${handRank}</div>` : ""}
        <div class="winner-amount">+${formatCurrency(amount)}</div>
      </div>
    `;
  }

  hasTournamentWinner() {
    return (this.tournament?.winner ?? undefined) !== undefined;
  }

  hasCountdown() {
    return (this.countdown ?? undefined) !== undefined;
  }

  renderCountdownView() {
    return html`
      <div class="board-info">
        <div class="phase">Starting in...</div>
        <div class="countdown">${this.countdown}</div>
      </div>
    `;
  }

  renderBreakView() {
    return html`
      <div class="board-info">
        <div class="phase">On Break</div>
      </div>
    `;
  }

  renderDefaultView(cards) {
    const phase = this.hand?.phase ?? "Waiting";
    return html`
      <div class="board-info">
        <div class="phase">${phase}</div>
        ${this.renderCommunityCards(cards)}
        ${this.hand && this.hand.pot > 0
          ? html`<div class="pot">
              <phg-chips .amount=${this.hand.pot}></phg-chips>
              Pot: ${formatCurrency(this.hand.pot)}
            </div>`
          : ""}
      </div>
    `;
  }

  render() {
    const cards = this.board?.cards ?? [];

    if (this.hasTournamentWinner()) {
      return html`
        ${this.renderTournamentWinner()}
        <div class="board-info">${this.renderCommunityCards(cards)}</div>
      `;
    }

    if (this.winnerMessage) {
      return html`
        <div class="board-info">
          ${this.renderCommunityCards(cards)} ${this.renderWinnerMessage()}
        </div>
      `;
    }

    if (this.hasCountdown()) return this.renderCountdownView();
    if (this.tournament?.onBreak) return this.renderBreakView();
    return this.renderDefaultView(cards);
  }
}

customElements.define("phg-board", Board);
