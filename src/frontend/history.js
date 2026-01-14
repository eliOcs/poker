import { html, css, LitElement } from "lit";
import { designTokens, baseStyles } from "./styles.js";
import "./card.js";
import "./button.js";

// Convert OHH card notation (e.g., "Ah", "Kd") to card object
function parseOhhCard(card) {
  if (!card || card === "??") {
    return { hidden: true };
  }

  const rankMap = {
    A: "ace",
    K: "king",
    Q: "queen",
    J: "jack",
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

  const suitMap = {
    h: "hearts",
    d: "diamonds",
    c: "clubs",
    s: "spades",
  };

  const rankChar = card.slice(0, -1);
  const suitChar = card.slice(-1);

  return {
    rank: rankMap[rankChar] || rankChar,
    suit: suitMap[suitChar] || suitChar,
  };
}

class History extends LitElement {
  static get styles() {
    return [
      designTokens,
      baseStyles,
      css`
        :host {
          height: 100%;
          display: block;
          background-color: var(--color-bg-medium);
          box-sizing: border-box;
          color: var(--color-fg-medium);
        }

        :host * {
          box-sizing: inherit;
        }

        .container {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        /* Mobile nav bar */
        .nav-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-md) var(--space-lg);
          background-color: var(--color-bg-dark);
          border-bottom: 3px solid var(--color-bg-light);
        }

        .nav-btn {
          background: none;
          border: none;
          color: var(--color-fg-medium);
          font-size: var(--font-lg);
          cursor: pointer;
          padding: var(--space-md);
        }

        .nav-btn:hover:not(:disabled) {
          color: var(--color-fg-white);
        }

        .nav-btn:disabled {
          color: var(--color-bg-disabled);
          cursor: not-allowed;
        }

        .nav-info {
          display: flex;
          align-items: center;
          gap: var(--space-lg);
          font-size: var(--font-md);
        }

        .nav-cards {
          display: flex;
          gap: var(--space-sm);
        }

        .nav-result {
          color: var(--color-fg-muted);
        }

        .nav-result.winner {
          color: var(--color-success);
        }

        .nav-pot {
          color: var(--color-primary);
        }

        /* Main content area */
        .main {
          flex: 1;
          display: flex;
          overflow: hidden;
        }

        /* Desktop: table + sidebar layout */
        @media (min-width: 800px) {
          .main {
            flex-direction: row;
          }
        }

        /* Table area */
        .table-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: auto;
        }

        /* Final table state */
        .table-state {
          flex: 1;
          position: relative;
          min-height: 300px;
          max-height: 400px;
        }

        .board {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-md);
          padding: var(--space-lg);
          background-color: var(--color-table);
          border: 3px solid var(--color-bg-dark);
        }

        .board-cards {
          display: flex;
          gap: var(--space-sm);
        }

        .pot-info {
          font-size: var(--font-md);
          color: var(--color-primary);
        }

        /* Player positions around the table */
        .player {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-sm);
          padding: var(--space-md);
          background-color: var(--color-bg-light);
          border: 3px solid var(--color-bg-dark);
          min-width: 80px;
        }

        .player.winner {
          border-color: var(--color-success);
          background-color: rgba(51, 170, 85, 0.2);
        }

        .player-name {
          font-size: var(--font-sm);
          color: var(--color-fg-light);
          max-width: 80px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .player-cards {
          display: flex;
          gap: 2px;
        }

        .player-stack {
          font-size: var(--font-sm);
          color: var(--color-fg-muted);
        }

        .player-result {
          font-size: var(--font-sm);
        }

        .player-result.won {
          color: var(--color-success);
        }

        .player-result.lost {
          color: var(--color-error);
        }

        /* Position players around the table */
        .player[data-seat="0"] {
          top: 10%;
          left: 5%;
        }
        .player[data-seat="1"] {
          top: 5%;
          left: 50%;
          transform: translateX(-50%);
        }
        .player[data-seat="2"] {
          top: 10%;
          right: 5%;
        }
        .player[data-seat="3"] {
          bottom: 10%;
          right: 5%;
        }
        .player[data-seat="4"] {
          bottom: 5%;
          left: 50%;
          transform: translateX(-50%);
        }
        .player[data-seat="5"] {
          bottom: 10%;
          left: 5%;
        }

        /* Action timeline */
        .timeline {
          padding: var(--space-lg);
          background-color: var(--color-bg-dark);
          border-top: 3px solid var(--color-bg-light);
          overflow-x: auto;
        }

        /* Desktop: horizontal layout */
        @media (min-width: 800px) {
          .timeline-content {
            display: flex;
            gap: var(--space-lg);
          }

          .street {
            flex: 1;
            min-width: 120px;
          }
        }

        /* Mobile: vertical layout */
        @media (max-width: 799px) {
          .timeline-content {
            display: flex;
            flex-direction: column;
            gap: var(--space-md);
          }
        }

        .street-header {
          font-size: var(--font-md);
          color: var(--color-primary);
          margin-bottom: var(--space-md);
          padding-bottom: var(--space-sm);
          border-bottom: 2px solid var(--color-bg-light);
        }

        .street-cards {
          display: flex;
          gap: var(--space-sm);
          margin-bottom: var(--space-md);
        }

        .action-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }

        .action-item {
          font-size: var(--font-sm);
          color: var(--color-fg-medium);
        }

        .action-player {
          color: var(--color-fg-light);
        }

        .action-amount {
          color: var(--color-primary);
        }

        /* Hand list sidebar (desktop only) */
        .sidebar {
          display: none;
          width: 250px;
          background-color: var(--color-bg-dark);
          border-left: 3px solid var(--color-bg-light);
          overflow-y: auto;
        }

        @media (min-width: 800px) {
          .sidebar {
            display: block;
          }
        }

        .sidebar-header {
          padding: var(--space-lg);
          font-size: var(--font-md);
          color: var(--color-fg-light);
          border-bottom: 3px solid var(--color-bg-light);
        }

        .hand-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .hand-item {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          padding: var(--space-md) var(--space-lg);
          cursor: pointer;
          border-bottom: 1px solid var(--color-bg-light);
        }

        .hand-item:hover {
          background-color: var(--color-bg-light);
        }

        .hand-item.active {
          background-color: var(--color-bg-light);
          border-left: 3px solid var(--color-primary);
        }

        .hand-item.winner {
          background-color: rgba(51, 170, 85, 0.1);
        }

        .hand-item.winner.active {
          background-color: rgba(51, 170, 85, 0.2);
        }

        .hand-cards {
          display: flex;
          gap: 2px;
        }

        .hand-winner {
          flex: 1;
          font-size: var(--font-sm);
          color: var(--color-fg-muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .hand-winner.you {
          color: var(--color-success);
        }

        .hand-pot {
          font-size: var(--font-sm);
          color: var(--color-primary);
        }

        /* Loading and error states */
        .loading,
        .error,
        .empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--color-fg-muted);
          font-size: var(--font-md);
          gap: var(--space-lg);
        }

        .error {
          color: var(--color-error);
        }

        .back-link {
          color: var(--color-accent);
          text-decoration: none;
          font-size: var(--font-sm);
        }

        .back-link:hover {
          color: var(--color-fg-white);
        }
      `,
    ];
  }

  static get properties() {
    return {
      gameId: { type: String },
      handNumber: { type: Number },
      hand: { type: Object },
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
    this.handList = [];
    this.loading = true;
    this.error = null;
    this.playerId = localStorage.getItem("playerId") || null;
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

  updated(changedProperties) {
    if (changedProperties.has("gameId") || changedProperties.has("handNumber")) {
      this.fetchData();
    }
  }

  handleKeydown(e) {
    if (e.key === "ArrowLeft") {
      this.navigatePrev();
    } else if (e.key === "ArrowRight") {
      this.navigateNext();
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

  async fetchData() {
    if (!this.gameId) return;

    this.loading = true;
    this.error = null;

    try {
      // Fetch hand list
      const listRes = await fetch(`/api/history/${this.gameId}`);
      if (!listRes.ok) {
        throw new Error("Failed to load hand history");
      }
      this.handList = await listRes.json();

      if (this.handList.length === 0) {
        this.loading = false;
        return;
      }

      // Determine which hand to show
      const targetHand =
        this.handNumber ?? this.handList[this.handList.length - 1].hand_number;

      // Fetch specific hand
      const handRes = await fetch(
        `/api/history/${this.gameId}/${targetHand}`
      );
      if (!handRes.ok) {
        throw new Error("Hand not found");
      }
      const data = await handRes.json();
      this.hand = data.ohh;
      this.handNumber = targetHand;
    } catch (err) {
      this.error = err.message;
    } finally {
      this.loading = false;
    }
  }

  navigateTo(handNumber) {
    this.dispatchEvent(
      new CustomEvent("navigate", {
        detail: { path: `/history/${this.gameId}/${handNumber}` },
        bubbles: true,
        composed: true,
      })
    );
  }

  navigatePrev() {
    const currentIndex = this.handList.findIndex(
      (h) => h.hand_number === this.handNumber
    );
    if (currentIndex > 0) {
      this.navigateTo(this.handList[currentIndex - 1].hand_number);
    }
  }

  navigateNext() {
    const currentIndex = this.handList.findIndex(
      (h) => h.hand_number === this.handNumber
    );
    if (currentIndex < this.handList.length - 1) {
      this.navigateTo(this.handList[currentIndex + 1].hand_number);
    }
  }

  goBack() {
    this.dispatchEvent(
      new CustomEvent("navigate", {
        detail: { path: `/games/${this.gameId}` },
        bubbles: true,
        composed: true,
      })
    );
  }

  getPlayerName(playerId) {
    const player = this.hand?.players?.find((p) => p.id === playerId);
    return player?.name || `Seat ${player?.seat || "?"}`;
  }

  getPlayerCards(playerId) {
    // Find dealt cards action for this player
    for (const round of this.hand?.rounds || []) {
      for (const action of round.actions || []) {
        if (action.player_id === playerId && action.action === "Dealt Cards") {
          return action.cards || [];
        }
      }
    }
    return [];
  }

  getWinners() {
    const winners = new Set();
    for (const pot of this.hand?.pots || []) {
      for (const win of pot.player_wins || []) {
        winners.add(win.player_id);
      }
    }
    return winners;
  }

  getPlayerWinAmount(playerId) {
    let total = 0;
    for (const pot of this.hand?.pots || []) {
      for (const win of pot.player_wins || []) {
        if (win.player_id === playerId) {
          total += win.win_amount;
        }
      }
    }
    return total;
  }

  getTotalPot() {
    let total = 0;
    for (const pot of this.hand?.pots || []) {
      total += pot.amount || 0;
    }
    return total;
  }

  getCurrentHandSummary() {
    return this.handList.find((h) => h.hand_number === this.handNumber);
  }

  renderNavBar() {
    const summary = this.getCurrentHandSummary();
    const currentIndex = this.handList.findIndex(
      (h) => h.hand_number === this.handNumber
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
          <div class="nav-cards">
            ${(summary?.hole_cards || []).map(
              (card) => html`<phg-card .card=${parseOhhCard(card)}></phg-card>`
            )}
          </div>
          <span class="nav-result ${summary?.is_winner ? "winner" : ""}">
            ${summary?.is_winner
              ? "You won"
              : summary?.winner_name || "Unknown"}
          </span>
          <span class="nav-pot">$${summary?.pot || 0}</span>
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
    const winners = this.getWinners();
    const boardCards = [];

    // Collect board cards from rounds
    for (const round of this.hand?.rounds || []) {
      if (round.cards) {
        boardCards.push(...round.cards);
      }
    }

    return html`
      <div class="table-state">
        <div class="board">
          <div class="board-cards">
            ${boardCards.map(
              (card) => html`<phg-card .card=${parseOhhCard(card)}></phg-card>`
            )}
            ${boardCards.length === 0
              ? html`<span style="color: var(--color-fg-muted)">No board</span>`
              : ""}
          </div>
          <div class="pot-info">Pot: $${this.getTotalPot()}</div>
        </div>
        ${(this.hand?.players || []).map((player) => {
          const isWinner = winners.has(player.id);
          const cards = this.getPlayerCards(player.id);
          const winAmount = this.getPlayerWinAmount(player.id);

          return html`
            <div
              class="player ${isWinner ? "winner" : ""}"
              data-seat="${player.seat}"
            >
              <div class="player-name">
                ${player.name || `Seat ${player.seat}`}
              </div>
              <div class="player-cards">
                ${cards.map(
                  (card) =>
                    html`<phg-card .card=${parseOhhCard(card)}></phg-card>`
                )}
              </div>
              <div class="player-stack">$${player.starting_stack}</div>
              ${winAmount > 0
                ? html`<div class="player-result won">+$${winAmount}</div>`
                : ""}
            </div>
          `;
        })}
      </div>
    `;
  }

  renderTimeline() {
    const streetNames = ["Preflop", "Flop", "Turn", "River"];

    return html`
      <div class="timeline">
        <div class="timeline-content">
          ${(this.hand?.rounds || []).map((round) => {
            const streetName = round.street || streetNames[round.id] || "Unknown";

            return html`
              <div class="street">
                <div class="street-header">${streetName}</div>
                ${round.cards
                  ? html`
                      <div class="street-cards">
                        ${round.cards.map(
                          (card) =>
                            html`<phg-card
                              .card=${parseOhhCard(card)}
                            ></phg-card>`
                        )}
                      </div>
                    `
                  : ""}
                <div class="action-list">
                  ${(round.actions || [])
                    .filter((a) => a.action !== "Dealt Cards")
                    .map((action) => {
                      const playerName = this.getPlayerName(action.player_id);
                      return html`
                        <div class="action-item">
                          <span class="action-player">${playerName}</span>
                          ${action.action}
                          ${action.amount
                            ? html`<span class="action-amount"
                                >$${action.amount}</span
                              >`
                            : ""}
                        </div>
                      `;
                    })}
                </div>
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }

  renderSidebar() {
    return html`
      <div class="sidebar">
        <div class="sidebar-header">
          Hands (${this.handList.length})
        </div>
        <ul class="hand-list">
          ${this.handList.map((item) => {
            const isActive = item.hand_number === this.handNumber;
            const isWinner = item.is_winner;

            return html`
              <li
                class="hand-item ${isActive ? "active" : ""} ${isWinner
                  ? "winner"
                  : ""}"
                @click=${() => this.navigateTo(item.hand_number)}
              >
                <div class="hand-cards">
                  ${(item.hole_cards || []).map(
                    (card) =>
                      html`<phg-card .card=${parseOhhCard(card)}></phg-card>`
                  )}
                </div>
                <span class="hand-winner ${isWinner ? "you" : ""}">
                  ${isWinner ? "You ★" : item.winner_name || "?"}
                </span>
                <span class="hand-pot">$${item.pot}</span>
              </li>
            `;
          })}
        </ul>
      </div>
    `;
  }

  render() {
    if (this.loading) {
      return html`<div class="loading">Loading hand history...</div>`;
    }

    if (this.error) {
      return html`
        <div class="error">
          ${this.error}
          <a class="back-link" href="/games/${this.gameId}" @click=${(e) => {
            e.preventDefault();
            this.goBack();
          }}>
            Back to game
          </a>
        </div>
      `;
    }

    if (this.handList.length === 0) {
      return html`
        <div class="empty">
          No hands recorded yet
          <a class="back-link" href="/games/${this.gameId}" @click=${(e) => {
            e.preventDefault();
            this.goBack();
          }}>
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
            ${this.renderTableState()}
            ${this.renderTimeline()}
          </div>
          ${this.renderSidebar()}
        </div>
      </div>
    `;
  }
}

customElements.define("phg-history", History);
