import { html, css, LitElement } from "lit";
import { designTokens, baseStyles } from "./styles.js";
import { seatPositions } from "./game-layout.js";
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
      seatPositions,
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
          max-width: 1400px;
          margin: 0 auto;
        }

        #container {
          position: absolute;
          inset: 0 0 120px;
        }

        phg-board {
          position: absolute;
          transform: translate(-50%, -50%);
          left: 50%;
        }

        @media (width >= 800px) {
          phg-board {
            top: 50%;
            left: 50%;
            width: 78%;
            height: 70%;
          }
        }

        @media (width < 800px) {
          phg-board {
            top: 52%;
            width: 85%;
            height: 85%;
          }
        }

        #seats {
          position: absolute;
          inset: 0;
        }

        phg-action-panel {
          position: absolute;
          bottom: var(--space-md);
          left: 50%;
          transform: translate(-50%, 0);
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

  static _connectionStatusLabels = {
    disconnected: "Not connected",
    connecting: "Connecting ...",
    connected: "Connected",
  };

  _renderConnectionStatus() {
    return Game._connectionStatusLabels[this.connectionStatus] || "";
  }

  _renderRankingModal() {
    if (!this.showRanking) return "";
    return html`<phg-modal title="Table Ranking" @close=${this.closeRanking}
      ><phg-ranking-panel
        .rankings=${this.game?.rankings || []}
      ></phg-ranking-panel
    ></phg-modal>`;
  }

  _renderSettingsModal() {
    if (!this.showSettings) return "";
    return html`
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
            <phg-button variant="secondary" @click=${this.closeSettings}
              >Cancel</phg-button
            >
            <phg-button variant="success" @click=${this.saveSettings}
              >Save</phg-button
            >
          </div>
        </div>
      </phg-modal>
    `;
  }

  render() {
    if (!this.game) return html`<p>Loading ...</p>`;

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
            .blinds=${this.game.blinds}
            .tournament=${this.game.tournament}
            .seats=${this.game.seats}
          ></phg-board>
          <div id="seats">
            ${this.game.seats.map((seat, i) =>
              seat.empty && isSeated
                ? ""
                : html`<phg-seat
                    data-seat="${i}"
                    .seat=${seat}
                    .seatNumber=${i}
                    .isButton=${this.game.button === i}
                    .showSitAction=${!isSeated}
                    .clockTicks=${this.game.hand?.actingSeat === i
                      ? this.game.hand?.clockTicks
                      : 0}
                    @seat-action=${this.handleSeatAction}
                  ></phg-seat>`,
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
        <span id="connection-status">${this._renderConnectionStatus()}</span>
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
        ${this._renderRankingModal()} ${this._renderSettingsModal()}
      </div>
    `;
  }
}

customElements.define("phg-game", Game);
