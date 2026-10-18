import { html, LitElement } from "lit";
import { formatAmount } from "./currency.js";
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
      displayBigBlind: { type: Number },
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
    this.displayBigBlind = 0;
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
              size="large"
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
        <div class="winner-amount">
          +${formatAmount(amount, this.displayBigBlind)}
        </div>
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

  get displayedPot() {
    // Live tables display incoming chips during collection. History views
    // supply only a total and keep displaying that amount.
    return this.hand?.collectingBets
      ? this.hand.totalPot
      : (this.hand?.collectedPot ?? this.hand?.totalPot ?? 0);
  }

  renderCurrentHandRank() {
    const currentPlayer = this.seats?.find(
      (seat) => !seat.empty && seat.isCurrentPlayer && !seat.folded,
    );
    return currentPlayer?.handRank
      ? html`<div class="current-hand-rank">${currentPlayer.handRank}</div>`
      : "";
  }

  renderPot() {
    const displayedPot = this.displayedPot;
    return displayedPot > 0
      ? html`<div class="pot">
          <phg-chips .amount=${displayedPot}></phg-chips>
          ${formatAmount(displayedPot, this.displayBigBlind)}
        </div>`
      : "";
  }

  renderBoardHeader() {
    if (this.hasTournamentWinner() || this.winnerMessage) return "";
    return html`<div class="phase">${this.hand?.phase ?? "Waiting"}</div>`;
  }

  renderBoardFooter() {
    if (this.hasTournamentWinner()) return "";
    if (this.winnerMessage) return this.renderWinnerMessage();
    return html`${this.renderCurrentHandRank()} ${this.renderPot()}`;
  }

  render() {
    const showsCards = this.hasTournamentWinner() || this.winnerMessage;
    if (!showsCards && this.hasCountdown()) return this.renderCountdownView();
    if (!showsCards && this.tournament?.onBreak) return this.renderBreakView();

    // Every view with community cards shares this template so Lit keeps the
    // card elements; recreating them would replay the deal animation.
    return html`
      ${this.renderTournamentWinner()}
      <div class="board-info">
        ${this.renderBoardHeader()}
        ${this.renderCommunityCards(this.board?.cards ?? [])}
        ${this.renderBoardFooter()}
      </div>
    `;
  }
}

customElements.define("phg-board", Board);
