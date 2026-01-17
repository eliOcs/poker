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

        phg-seat[data-seat="0"] {
          top: 15%;
          left: 0;
        }

        phg-seat[data-seat="1"] {
          top: 2.5%;
          left: 50%;
          transform: translateX(-50%);
        }

        phg-seat[data-seat="2"] {
          top: 15%;
          right: 0;
        }

        phg-seat[data-seat="3"] {
          bottom: 15%;
          right: 0;
        }

        phg-seat[data-seat="4"] {
          bottom: 5%;
          left: 50%;
          transform: translateX(-50%);
        }

        phg-seat[data-seat="5"] {
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
      connectionStatus: { type: String },
      showSettings: { type: Boolean },
      showRanking: { type: Boolean },
    };
  }

  constructor() {
    super();
    this.gameId = null;
    this.game = null;
    this.connectionStatus = "disconnected";
    this.showSettings = false;
    this.showRanking = false;
  }

  send(message) {
    this.dispatchEvent(
      new CustomEvent("game-action", {
        detail: message,
        bubbles: true,
        composed: true,
      }),
    );
  }

  handleSeatAction(e) {
    e.stopPropagation();
    this.send(e.detail);
  }

  handleGameAction(e) {
    e.stopPropagation();
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

  render() {
    if (!this.game) {
      return html`<p>Loading ...</p>`;
    }

    const { seatIndex, actions } = this.getMySeatInfo();
    const isSeated = this.isPlayerSeated();

    return html`
      <div id="wrapper">
        <div id="container">
          <phg-board
            .board=${this.game.board}
            .hand=${this.game.hand}
            .countdown=${this.game.countdown}
            .winnerMessage=${this.game.winnerMessage}
            .winningCards=${this.getWinningCards()}
          ></phg-board>
          <div id="seats">
            ${this.game.seats.map((seat, i) => {
              // Hide empty seats when player is already seated
              if (seat.empty && isSeated) return "";
              return html`
                <phg-seat
                  data-seat="${i}"
                  .seat=${seat}
                  .seatNumber=${i}
                  .isButton=${this.game.button === i}
                  .showSitAction=${!isSeated}
                  .clockTicks=${this.game.hand?.actingSeat === i
                    ? this.game.hand?.clockTicks
                    : 0}
                  @seat-action=${this.handleSeatAction}
                ></phg-seat>
              `;
            })}
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
          ${this.connectionStatus === "disconnected" ? "Not connected" : ""}
          ${this.connectionStatus === "connecting" ? "Connecting ..." : ""}
          ${this.connectionStatus === "connected" ? "Connected" : ""}
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
