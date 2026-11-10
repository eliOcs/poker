import { html, LitElement } from "lit";
import { formatAmount } from "./currency.js";
import { animatesLeaving } from "./leaving-cards.js";
import "./card.js";
import "./chips.js";

/**
 * Whether an update took the finished hand off the board: its cards or its
 * result were there, and now neither is. A hand folded preflop leaves only
 * its result.
 * @param {{ cards: string[], winnerMessage: any }} before
 * @param {{ board?: { cards?: string[] }, winnerMessage?: any }} after
 */
function isHandCleared(before, after) {
  const hadHand = before.cards.length > 0 || Boolean(before.winnerMessage);
  const hasHand =
    Boolean(after.board?.cards?.length) || Boolean(after.winnerMessage);
  return hadHand && !hasHand && animatesLeaving();
}

class Board extends LitElement {
  createRenderRoot() {
    return this;
  }

  static get properties() {
    return {
      board: { type: Object },
      hand: { type: Object },
      countdown: { type: Number },
      handNumber: { type: Number },
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
    this.handNumber = 0;
    this.winnerMessage = undefined;
    this.winningCards = undefined;
    this.noAnimation = false;
    this.displayBigBlind = 0;
    this.tournament = undefined;
    this.seats = undefined;
    /** @type {{ cards: string[], winnerMessage: any }|undefined} The cleared hand, leaving */
    this._leaving = undefined;
  }

  willUpdate(changed) {
    if (!changed.has("board") || this.noAnimation) return;
    // Only the update that clears the hand starts it leaving; any later one
    // ends it, even if the animation never got to run.
    /** @type {{ cards: string[], winnerMessage: any }} */
    const before = {
      cards: changed.get("board")?.cards ?? [],
      winnerMessage: changed.has("winnerMessage")
        ? changed.get("winnerMessage")
        : this.winnerMessage,
    };
    this._leaving = isHandCleared(before, this) ? before : undefined;
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

  renderWinnerMessage(winnerMessage) {
    const { playerName, handRank, amount, isSplit } = winnerMessage;
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
      ? html`<button
          type="button"
          class="current-hand-rank"
          title="Show hand rankings"
          @click=${() => {
            this.dispatchEvent(
              new CustomEvent("show-hand-rankings", { bubbles: true }),
            );
          }}
        >
          ${currentPlayer.handRank}
        </button>`
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

  renderBoardHeader(winnerMessage) {
    if (this.hasTournamentWinner() || winnerMessage) return "";
    // Between hands the table is simply clear until the next deal.
    if (this.hand?.phase === "waiting" && this.handNumber > 0) return "";
    return html`<div class="phase">${this.hand?.phase ?? "Waiting"}</div>`;
  }

  renderBoardFooter(winnerMessage) {
    if (this.hasTournamentWinner()) return "";
    if (winnerMessage) return this.renderWinnerMessage(winnerMessage);
    return html`${this.renderCurrentHandRank()} ${this.renderPot()}`;
  }

  /**
   * Every view with community cards shares this template so Lit keeps the
   * card elements; recreating them would replay the deal animation.
   * @param {string[]} cards
   * @param {any} winnerMessage
   * @param {boolean} leaving - the hand is being cleared and fades out
   */
  renderBoardInfo(cards, winnerMessage, leaving) {
    return html`
      ${this.renderTournamentWinner()}
      <div
        class="board-info ${leaving ? "leaving" : ""}"
        @animationend=${(/** @type {AnimationEvent} */ event) => {
          if (event.animationName !== "leave-table") return;
          this._leaving = undefined;
          this.requestUpdate();
        }}
      >
        ${this.renderBoardHeader(winnerMessage)}
        ${this.renderCommunityCards(cards)}
        ${this.renderBoardFooter(winnerMessage)}
      </div>
    `;
  }

  render() {
    if (this._leaving) {
      // The cleared hand's cards turn face down before the board fades.
      const { cards, winnerMessage } = this._leaving;
      return this.renderBoardInfo(
        cards.map(() => "??"),
        winnerMessage,
        true,
      );
    }
    const showsCards = this.hasTournamentWinner() || this.winnerMessage;
    if (!showsCards && this.hasCountdown()) return this.renderCountdownView();
    if (!showsCards && this.tournament?.onBreak) return this.renderBreakView();
    return this.renderBoardInfo(
      this.board?.cards ?? [],
      this.winnerMessage,
      false,
    );
  }
}

customElements.define("phg-board", Board);
