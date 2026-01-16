import { html, css, LitElement } from "lit";
import { designTokens, baseStyles } from "./styles.js";
import "./card.js";
import "./board.js";
import "./seat.js";
import "./action-panel.js";
import "./button.js";
import "./modal.js";
import "./ranking-panel.js";

class Game extends LitElement {
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

        #wrapper {
          position: relative;
          height: 100%;
          max-width: 1600px;
          margin: 0 auto;
        }

        #container {
          position: absolute;
          top: 0%;
          left: 2.5%;
          height: 80%;
          width: 95%;
        }

        phg-board {
          position: absolute;
          top: 15%;
          left: 10%;
          height: 70%;
          width: 80%;
        }

        #seats {
          height: 100%;
          width: 100%;
        }

        #bets {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          width: 100%;
          pointer-events: none;
        }

        phg-seat {
          position: absolute;
          height: 20%;
          width: 30%;
          min-width: 100px;
          max-width: 200px;
          min-height: 150px;
          max-height: 200px;
          z-index: 1;
        }

        phg-seat:nth-child(1) {
          top: 15%;
          left: 0;
        }

        phg-seat:nth-child(2) {
          top: 2.5%;
          left: 50%;
          transform: translateX(-50%);
        }

        phg-seat:nth-child(3) {
          top: 15%;
          right: 0;
        }

        phg-seat:nth-child(4) {
          bottom: 15%;
          right: 0;
        }

        phg-seat:nth-child(5) {
          bottom: 5%;
          left: 50%;
          transform: translateX(-50%);
        }

        phg-seat:nth-child(6) {
          bottom: 15%;
          left: 0;
        }

        .bet-indicator {
          position: absolute;
          z-index: 2;
          color: var(--color-primary);
          font-size: var(--font-md);
        }

        /* Seat 1: top-left - position bet toward table center */
        .bet-indicator[data-seat="0"] {
          top: 42%;
          left: 35%;
        }

        /* Seat 2: top-center - position bet below player, toward table center */
        .bet-indicator[data-seat="1"] {
          top: 28%;
          left: 50%;
          transform: translateX(-50%);
        }

        /* Seat 3: top-right - position bet toward table center */
        .bet-indicator[data-seat="2"] {
          top: 42%;
          right: 35%;
        }

        /* Seat 4: bottom-right - position bet toward table center */
        .bet-indicator[data-seat="3"] {
          bottom: 46%;
          right: 35%;
        }

        /* Seat 5: bottom-center - position bet above player, toward table center */
        .bet-indicator[data-seat="4"] {
          bottom: 40%;
          left: 50%;
          transform: translateX(-50%);
        }

        /* Seat 6: bottom-left - position bet toward table center */
        .bet-indicator[data-seat="5"] {
          bottom: 46%;
          left: 35%;
        }

        phg-action-panel {
          position: absolute;
          bottom: 10%;
          left: 50%;
          transform: translate(-50%, 50%);
        }

        #connection-status {
          position: absolute;
          left: 0.5%;
          top: 0.5%;
          color: var(--color-bg-disabled);
          font-size: var(--font-sm);
        }

        .error-message {
          position: absolute;
          top: 10px;
          left: 50%;
          transform: translateX(-50%);
          background-color: var(--color-error);
          color: var(--color-fg-white);
          padding: var(--space-md) var(--space-lg);
          border: 3px solid var(--color-bg-dark);
          font-size: var(--font-sm);
          z-index: 100;
          box-shadow: var(--space-sm) var(--space-sm) 0 var(--color-bg-dark);
        }

        #settings-btn {
          position: absolute;
          right: 0.5%;
          top: 0.5%;
          background: none;
          border: none;
          font-size: var(--font-lg);
          cursor: pointer;
          padding: 5px;
          color: var(--color-fg-medium);
        }

        #settings-btn:hover {
          color: var(--color-fg-white);
        }

        .settings-content input {
          width: 100%;
          padding: var(--space-md);
          font-family: inherit;
          font-size: var(--font-md);
          border: 3px solid var(--color-bg-dark);
          background: var(--color-bg-medium);
          color: var(--color-fg-white);
          margin-bottom: var(--space-lg);
          box-sizing: border-box;
        }

        .settings-content .buttons {
          display: flex;
          gap: var(--space-md);
          justify-content: flex-end;
        }

        .not-found {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
        }

        .not-found h1 {
          font-size: var(--font-md);
          line-height: 2;
          color: var(--color-fg-muted);
          margin: 0 0 2em;
          text-align: center;
        }

        @media (width >= 600px) {
          .not-found h1 {
            font-size: var(--font-md);
          }
        }

        #ranking-btn {
          position: absolute;
          right: 40px;
          top: 0.5%;
          background: none;
          border: none;
          font-size: var(--font-lg);
          cursor: pointer;
          padding: 5px;
          color: var(--color-primary);
        }

        #ranking-btn:hover {
          color: var(--color-fg-white);
        }

        #history-btn {
          position: absolute;
          right: 75px;
          top: 0.5%;
          background: none;
          border: none;
          font-size: var(--font-lg);
          cursor: pointer;
          padding: 5px;
          color: var(--color-fg-medium);
        }

        #history-btn:hover {
          color: var(--color-fg-white);
        }
      `,
    ];
  }

  static get properties() {
    return {
      gameId: { type: String, attribute: "game-id" },
      game: { type: Object },
      socket: { type: Object },
      error: { type: String },
      showSettings: { type: Boolean },
      showRanking: { type: Boolean },
      notFound: { type: Boolean },
    };
  }

  constructor() {
    super();
    this.gameId = null;
    this.error = null;
    this.showSettings = false;
    this.showRanking = false;
    this.notFound = false;
  }

  firstUpdated() {
    this.connect();
  }

  updated(changedProperties) {
    if (
      changedProperties.has("gameId") &&
      changedProperties.get("gameId") !== undefined
    ) {
      // gameId changed, reconnect to new game
      if (this.socket) {
        this.socket.close();
      }
      this.game = null;
      this.notFound = false;
      this.connect();
    }
  }

  connect() {
    if (!this.gameId) {
      console.error("No game ID provided");
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    this.socket = new WebSocket(
      `${protocol}//${window.location.host}/games/${this.gameId}`,
    );

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.error) {
        this.error = data.error.message;
        setTimeout(() => (this.error = null), 3000);
      } else {
        this.game = data;
        this.error = null;
      }
    };

    this.socket.onerror = () => {
      this.notFound = true;
    };

    this.socket.onclose = (event) => {
      // Code 1006 = abnormal closure (connection rejected)
      if (!this.game && event.code === 1006) {
        this.notFound = true;
      }
    };
  }

  send(message) {
    this.socket.send(JSON.stringify(message));
  }

  handleSeatAction(e) {
    this.send(e.detail);
  }

  handleGameAction(e) {
    this.send(e.detail);
  }

  openSettings() {
    this.showSettings = true;
  }

  closeSettings() {
    this.showSettings = false;
  }

  openRanking() {
    this.showRanking = true;
  }

  closeRanking() {
    this.showRanking = false;
  }

  openHistory() {
    this.dispatchEvent(
      new CustomEvent("navigate", {
        detail: { path: `/history/${this.gameId}` },
        bubbles: true,
        composed: true,
      }),
    );
  }

  saveSettings() {
    const input = this.shadowRoot.querySelector("#name-input");
    const name = input?.value?.trim() || "";
    this.send({ action: "setName", name });
    this.showSettings = false;
  }

  getCurrentPlayerName() {
    const seat = this.game?.seats?.find((s) => s.isCurrentPlayer && !s.empty);
    return seat?.player?.name || "";
  }

  getMySeatInfo() {
    const seatIndex = this.game.seats.findIndex(
      (s) => s.isCurrentPlayer && !s.empty,
    );
    if (seatIndex === -1) {
      return { seatIndex: -1, actions: [] };
    }
    return { seatIndex, actions: this.game.seats[seatIndex].actions || [] };
  }

  isPlayerSeated() {
    return this.game.seats.some((s) => s.isCurrentPlayer && !s.empty);
  }

  getWinningCards() {
    // Collect winning cards from all winners (for highlighting on the board)
    for (const seat of this.game.seats) {
      if (!seat.empty && seat.winningCards) {
        return seat.winningCards;
      }
    }
    return null;
  }

  async handleCreateGame() {
    try {
      const response = await fetch("/games", { method: "POST" });
      const { id } = await response.json();
      this.dispatchEvent(
        new CustomEvent("navigate", {
          detail: { path: `/games/${id}` },
          bubbles: true,
          composed: true,
        }),
      );
    } catch (err) {
      console.error("Failed to create game:", err);
    }
  }

  render() {
    if (this.notFound) {
      return html`
        <div class="not-found">
          <h1>Game not found</h1>
          <phg-button
            variant="primary"
            size="large"
            @click=${this.handleCreateGame}
          >
            Create Game
          </phg-button>
        </div>
      `;
    }

    if (!this.game) {
      return html`<p>Loading ...</p>`;
    }

    const { seatIndex, actions } = this.getMySeatInfo();
    const isSeated = this.isPlayerSeated();

    return html`
      <div id="wrapper">
        ${this.error
          ? html`<div class="error-message">${this.error}</div>`
          : ""}
        <div id="container">
          <phg-board
            .board=${this.game.board}
            .hand=${this.game.hand}
            .countdown=${this.game.countdown}
            .winnerMessage=${this.game.winnerMessage}
            .winningCards=${this.getWinningCards()}
          ></phg-board>
          <div id="seats">
            ${this.game.seats.map(
              (seat, i) => html`
                <phg-seat
                  .seat=${seat}
                  .seatNumber=${i}
                  .isButton=${this.game.button === i}
                  .showSitAction=${!isSeated}
                  .clockTicks=${this.game.hand?.actingSeat === i
                    ? this.game.hand?.clockTicks
                    : 0}
                  @seat-action=${this.handleSeatAction}
                ></phg-seat>
              `,
            )}
          </div>
          <div id="bets">
            ${this.game.seats.map((seat, i) =>
              !seat.empty && seat.bet > 0
                ? html`<div class="bet-indicator" data-seat="${i}">
                    $${seat.bet}
                  </div>`
                : "",
            )}
          </div>
        </div>
        <phg-action-panel
          .actions=${actions}
          .seatIndex=${seatIndex}
          .bigBlind=${this.game.blinds?.big || 1}
          .seatedCount=${this.game.seats.filter((s) => !s.empty).length}
          @game-action=${this.handleGameAction}
        ></phg-action-panel>
        <span id="connection-status">
          ${!this.socket ? "Not connected" : ""}
          ${this.socket?.readyState === 0 ? "Connecting ..." : ""}
          ${this.socket?.readyState === 1 ? "Connected" : ""}
          ${this.socket?.readyState === 2 ? "Closing ..." : ""}
          ${this.socket?.readyState === 3 ? "Closed" : ""}
        </span>
        <button
          id="history-btn"
          @click=${this.openHistory}
          title="Hand History"
        >
          🔁
        </button>
        <button id="ranking-btn" @click=${this.openRanking} title="Rankings">
          🏆
        </button>
        <button id="settings-btn" @click=${this.openSettings} title="Settings">
          ⚙
        </button>
        ${this.showRanking
          ? html`
              <phg-modal title="Table Ranking" @close=${this.closeRanking}>
                <phg-ranking-panel
                  .rankings=${this.game?.rankings || []}
                ></phg-ranking-panel>
              </phg-modal>
            `
          : ""}
        ${this.showSettings
          ? html`
              <phg-modal title="Settings" @close=${this.closeSettings}>
                <div class="settings-content">
                  <input
                    id="name-input"
                    type="text"
                    placeholder="Enter your name"
                    maxlength="20"
                    .value=${this.getCurrentPlayerName()}
                    @keydown=${(e) => e.key === "Enter" && this.saveSettings()}
                  />
                  <div class="buttons">
                    <phg-button
                      variant="secondary"
                      @click=${this.closeSettings}
                    >
                      Cancel
                    </phg-button>
                    <phg-button variant="success" @click=${this.saveSettings}>
                      Save
                    </phg-button>
                  </div>
                </div>
              </phg-modal>
            `
          : ""}
      </div>
    `;
  }
}

customElements.define("phg-game", Game);
