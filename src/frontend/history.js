import { html, LitElement } from "lit";
import { designTokens, baseStyles, formatCurrency } from "./styles.js";
import { historyStyles } from "./history-styles.js";
import { seatPositions } from "./game-layout.js";
import "./card.js";
import "./button.js";
import "./seat.js";
import "./board.js";

class History extends LitElement {
  static get styles() {
    return [designTokens, baseStyles, historyStyles, seatPositions];
  }

  static get properties() {
    return {
      gameId: { type: String },
      handNumber: { type: Number },
      hand: { type: Object },
      view: { type: Object },
      handList: { type: Array },
      loading: { type: Boolean },
      error: { type: String },
      playerId: { type: String },
    };
  }

  constructor() {
    super();
    this.gameId = null;
    this.handNumber = null;
    this.hand = null;
    this.view = null;
    this.handList = null;
    this.loading = true;
    this.error = null;
    this.playerId = null;
    this.touchStartX = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this.boundHandleKeydown = this.handleKeydown.bind(this);
    this.boundHandleTouchStart = this.handleTouchStart.bind(this);
    this.boundHandleTouchEnd = this.handleTouchEnd.bind(this);
    window.addEventListener("keydown", this.boundHandleKeydown);
    this.addEventListener("touchstart", this.boundHandleTouchStart);
    this.addEventListener("touchend", this.boundHandleTouchEnd);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("keydown", this.boundHandleKeydown);
    this.removeEventListener("touchstart", this.boundHandleTouchStart);
    this.removeEventListener("touchend", this.boundHandleTouchEnd);
  }

  handleKeydown(e) {
    if (e.key === "ArrowLeft") {
      this.navigatePrev();
    } else if (e.key === "ArrowRight") {
      this.navigateNext();
    } else if (e.key === "Escape") {
      this.goBack();
    }
  }

  handleTouchStart(e) {
    this.touchStartX = e.touches[0].clientX;
  }

  handleTouchEnd(e) {
    if (this.touchStartX === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const diff = this.touchStartX - touchEndX;
    const threshold = 50; // Minimum swipe distance

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        // Swiped left -> next hand
        this.navigateNext();
      } else {
        // Swiped right -> previous hand
        this.navigatePrev();
      }
    }

    this.touchStartX = null;
  }

  navigateTo(handNumber) {
    this.dispatchEvent(
      new CustomEvent("hand-select", {
        detail: { handNumber },
        bubbles: true,
        composed: true,
      }),
    );
  }

  navigatePrev() {
    if (!this.handList) return;
    const currentIndex = this.handList.findIndex(
      (h) => h.hand_number === this.handNumber,
    );
    if (currentIndex > 0) {
      this.navigateTo(this.handList[currentIndex - 1].hand_number);
    }
  }

  navigateNext() {
    if (!this.handList) return;
    const currentIndex = this.handList.findIndex(
      (h) => h.hand_number === this.handNumber,
    );
    if (currentIndex < this.handList.length - 1) {
      this.navigateTo(this.handList[currentIndex + 1].hand_number);
    }
  }

  goBack() {
    // Emit close event for embedded mode (inside phg-game)
    this.dispatchEvent(
      new CustomEvent("close", {
        bubbles: true,
        composed: true,
      }),
    );
    // Also emit navigate for standalone mode (direct URL access)
    this.dispatchEvent(
      new CustomEvent("navigate", {
        detail: { path: `/games/${this.gameId}` },
        bubbles: true,
        composed: true,
      }),
    );
  }

  getPlayerName(playerId) {
    const player = this.hand?.players.find((p) => p.id === playerId);
    return player?.name || `Seat ${player?.seat || "?"}`;
  }

  getCurrentHandSummary() {
    return this.handList?.find((h) => h.hand_number === this.handNumber);
  }

  renderHandSummaryCards(summary) {
    // Show player's hole cards if dealt, otherwise winner's hole cards
    const cards = summary.was_dealt
      ? summary.hole_cards
      : summary.winner_hole_cards || [];
    return cards.map((card) => html`<phg-card .card=${card}></phg-card>`);
  }

  renderHandSummaryResult(summary) {
    if (summary.was_dealt) {
      // Player was dealt - show net result
      const netClass =
        summary.net_result > 0
          ? "positive"
          : summary.net_result < 0
            ? "negative"
            : "neutral";
      const prefix = summary.net_result > 0 ? "+" : "";
      return html`<span class="nav-net ${netClass}"
        >${prefix}${formatCurrency(summary.net_result)}</span
      >`;
    } else {
      // Spectating - show pot size in gold
      return html`<span class="nav-net neutral"
        >${formatCurrency(summary.pot)}</span
      >`;
    }
  }

  renderNavBar() {
    const summary = this.getCurrentHandSummary();
    if (!summary) return "";

    const currentIndex = this.handList.findIndex(
      (h) => h.hand_number === this.handNumber,
    );
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < this.handList.length - 1;

    return html`
      <div class="nav-bar">
        <button class="nav-btn" @click=${this.goBack} title="Back to game">
          ✕
        </button>
        <button
          class="nav-btn"
          @click=${this.navigatePrev}
          ?disabled=${!hasPrev}
          title="Previous hand"
        >
          ←
        </button>
        <div class="nav-info">
          <span class="nav-number">#${summary.hand_number}</span>
          <div class="nav-cards">${this.renderHandSummaryCards(summary)}</div>
          ${this.renderHandSummaryResult(summary)}
        </div>
        <button
          class="nav-btn"
          @click=${this.navigateNext}
          ?disabled=${!hasNext}
          title="Next hand"
        >
          →
        </button>
      </div>
    `;
  }

  renderTableState() {
    if (!this.view) return html``;

    const hand = { pot: this.view.pot, phase: this.view.board.phase };

    const tableSize = this.view.seats.length;

    return html`
      <div class="table-state">
        <phg-board
          .board=${this.view.board}
          .hand=${hand}
          .winnerMessage=${this.view.winnerMessage}
          .winningCards=${this.view.winningCards}
        ></phg-board>
        <div id="seats" data-table-size="${tableSize}">
          ${this.view.seats.map((seat, index) => {
            if (seat.empty) return html``;
            const isButton = index === this.view.button;

            return html`
              <phg-seat
                data-seat="${index}"
                data-table-size="${tableSize}"
                .seat=${seat}
                .seatNumber=${index}
                .isButton=${isButton}
                .showSitAction=${false}
              ></phg-seat>
            `;
          })}
        </div>
      </div>
    `;
  }

  renderTimeline() {
    const streetNames = ["Preflop", "Flop", "Turn", "River"];

    return html`
      <div class="timeline">
        <div class="timeline-content">
          ${(this.hand?.rounds || []).map((round) => {
            const streetName =
              round.street || streetNames[round.id] || "Unknown";
            const isShowdown = streetName === "Showdown";

            return html`
              <div class="street">
                <div class="street-header">${streetName}</div>
                ${round.cards
                  ? html`
                      <div class="street-cards">
                        ${round.cards.map(
                          (card) => html`<phg-card .card=${card}></phg-card>`,
                        )}
                      </div>
                    `
                  : ""}
                <div class="action-list">
                  ${(round.actions || [])
                    .filter((a) => a.action !== "Dealt Cards")
                    .map((action) => {
                      const isYou = action.player_id === this.playerId;
                      const playerName = isYou
                        ? "You"
                        : this.getPlayerName(action.player_id);
                      return html`
                        <div class="action-item">
                          <span class="action-player ${isYou ? "you" : ""}"
                            >${playerName}</span
                          >
                          ${action.action}
                          ${action.cards?.length
                            ? html`<span class="action-cards"
                                >${action.cards.map(
                                  (card) =>
                                    html`<phg-card .card=${card}></phg-card>`,
                                )}</span
                              >`
                            : ""}
                          ${action.amount
                            ? html`<span class="action-amount"
                                >${formatCurrency(action.amount)}</span
                              >`
                            : ""}
                        </div>
                      `;
                    })}
                  ${isShowdown ? this.renderShowdownResult() : ""}
                </div>
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }

  renderShowdownResult() {
    const mainPot = this.hand?.pots[0];
    if (!mainPot) return "";

    const winningHand = mainPot.winning_hand;
    const winningCards = mainPot.winning_cards;
    const winnerIds = mainPot.player_wins.map((w) => w.player_id);
    const winAmount = mainPot.player_wins[0]?.win_amount || mainPot.amount;

    return html`
      ${winnerIds.map((winnerId) => {
        const isYou = winnerId === this.playerId;
        const playerName = isYou ? "You" : this.getPlayerName(winnerId);
        return html`
          <div class="showdown-winner ${isYou ? "you" : ""}">
            <span class="winner-name">${playerName}</span> won
            <span class="winner-amount">${formatCurrency(winAmount)}</span>
          </div>
        `;
      })}
      ${winningHand
        ? html`<div class="showdown-hand">${winningHand}</div>`
        : ""}
      ${winningCards?.length
        ? html`<div class="showdown-cards">
            ${winningCards.map(
              (card) => html`<phg-card .card=${card}></phg-card>`,
            )}
          </div>`
        : ""}
    `;
  }

  renderHandListResult(item) {
    if (item.was_dealt) {
      // Player was dealt - show net result
      const netClass =
        item.net_result > 0
          ? "positive"
          : item.net_result < 0
            ? "negative"
            : "neutral";
      const prefix = item.net_result > 0 ? "+" : "";
      return html`<span class="hand-net ${netClass}"
        >${prefix}${formatCurrency(item.net_result)}</span
      >`;
    } else {
      // Spectating - show pot size in gold
      return html`<span class="hand-net neutral"
        >${formatCurrency(item.pot)}</span
      >`;
    }
  }

  renderSidebar() {
    return html`
      <div class="sidebar">
        <div class="sidebar-header">
          <button
            class="sidebar-back"
            @click=${this.goBack}
            title="Back to game"
          >
            ✕
          </button>
          <span>Hands (${this.handList.length})</span>
        </div>
        <ul class="hand-list">
          ${[...this.handList].reverse().map((item) => {
            const isActive = item.hand_number === this.handNumber;
            const isWinner = item.is_winner;
            // Show player's hole cards if dealt, otherwise winner's hole cards
            const cards = item.was_dealt
              ? item.hole_cards
              : item.winner_hole_cards || [];

            return html`
              <li
                class="hand-item ${isActive ? "active" : ""} ${isWinner
                  ? "winner"
                  : ""}"
                @click=${() => this.navigateTo(item.hand_number)}
              >
                <span class="hand-number">#${item.hand_number}</span>
                <div class="hand-cards">
                  ${cards.map(
                    (card) => html`<phg-card .card=${card}></phg-card>`,
                  )}
                </div>
                ${this.renderHandListResult(item)}
              </li>
            `;
          })}
        </ul>
      </div>
    `;
  }

  render() {
    // loading: null = initial/fetching, true = explicitly loading, false = done
    if (this.loading === null || this.loading === true) {
      return html`<div class="loading">Loading hand history...</div>`;
    }

    if (this.error) {
      return html`
        <div class="error">
          ${this.error}
          <a
            class="back-link"
            href="/games/${this.gameId}"
            @click=${(e) => {
              e.preventDefault();
              this.goBack();
            }}
          >
            Back to game
          </a>
        </div>
      `;
    }

    if (!this.handList || this.handList.length === 0) {
      return html`
        <div class="empty">
          No hands recorded yet
          <a
            class="back-link"
            href="/games/${this.gameId}"
            @click=${(e) => {
              e.preventDefault();
              this.goBack();
            }}
          >
            Back to game
          </a>
        </div>
      `;
    }

    return html`
      <div class="container">
        ${this.renderNavBar()}
        <div class="main">
          <div class="table-area">
            ${this.renderTableState()} ${this.renderTimeline()}
          </div>
          ${this.renderSidebar()}
        </div>
      </div>
    `;
  }
}

customElements.define("phg-history", History);
