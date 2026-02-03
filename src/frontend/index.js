import { html, css, LitElement } from "lit";
import { designTokens, baseStyles } from "./styles.js";
import { seatPositions } from "./game-layout.js";
import * as Audio from "./audio.js";
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
            width: 80%;
            height: 80%;
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

        .settings-content label {
          display: block;
          margin-bottom: var(--space-sm);
          color: var(--color-fg-medium);
          font-size: var(--font-sm);
        }

        .volume-slider {
          display: flex;
          gap: var(--space-sm);
          margin-bottom: var(--space-lg);
        }

        .volume-slider button {
          flex: 1;
          padding: var(--space-md);
          font-family: inherit;
          font-size: var(--font-md);
          border: 3px solid var(--color-bg-dark);
          background: var(--color-bg-medium);
          color: var(--color-fg-medium);
          cursor: pointer;
        }

        .volume-slider button:hover {
          background: var(--color-bg-dark);
        }

        .volume-slider button.active {
          background: var(--color-primary);
          color: var(--color-fg-white);
          border-color: var(--color-primary);
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
      user: { type: Object },
      connectionStatus: { type: String },
      showSettings: { type: Boolean },
      showRanking: { type: Boolean },
      volume: { type: Number },
    };
  }

  static volumeSteps = [0, 0.25, 0.75, 1];

  constructor() {
    super();
    this.gameId = null;
    this.game = null;
    this.user = null;
    this.connectionStatus = "disconnected";
    this.showSettings = false;
    this.showRanking = false;
    this.volume = 0.75; // Default, will be overwritten by user settings
    this._settingsInitialized = false;
    Audio.setVolume(this.volume);
  }

  _initializeVolumeFromSettings() {
    if (this._settingsInitialized || !this.user?.settings) return;
    this._settingsInitialized = true;
    const userVolume = this.user.settings.volume;
    if (userVolume !== undefined && userVolume !== this.volume) {
      this.volume = userVolume;
      Audio.setVolume(this.volume);
    }
  }

  setVolume(v) {
    this.volume = v;
    Audio.setVolume(v);
    this.dispatchEvent(
      new CustomEvent("update-user", {
        detail: { settings: { volume: v } },
        bubbles: true,
        composed: true,
      }),
    );
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
    if (e.detail.action === "sit") {
      Audio.resume();
    }
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
    this.dispatchEvent(
      new CustomEvent("update-user", {
        detail: { name },
        bubbles: true,
        composed: true,
      }),
    );
    this.showSettings = false;
  }

  getCurrentPlayerName() {
    return this.user?.name || "";
  }

  getMySeatInfo() {
    const seatIndex = this.game.seats.findIndex(
      (s) => s.isCurrentPlayer && !s.empty,
    );
    if (seatIndex === -1) {
      return {
        seatIndex: -1,
        actions: [],
        bustedPosition: null,
        isWinner: false,
      };
    }
    const seat = this.game.seats[seatIndex];
    const isWinner = this.game.tournament?.winner === seatIndex;
    return {
      seatIndex,
      actions: seat.actions || [],
      bustedPosition: seat.bustedPosition || null,
      isWinner,
    };
  }

  isPlayerSeated() {
    return this.game.seats.some((s) => s.isCurrentPlayer && !s.empty);
  }

  _checkTurnSounds(prev, curr) {
    if (curr.actingSeat !== prev.actingSeat) Audio.playTurnSound();
    if (!prev.clockTicks && curr.clockTicks) Audio.playClockSound();
  }

  updated(changedProperties) {
    if (changedProperties.has("user") && this.user) {
      this._initializeVolumeFromSettings();
    }
    if (changedProperties.has("game") && this.game) {
      const { seatIndex } = this.getMySeatInfo();
      const prev = changedProperties.get("game")?.hand ?? {};
      const curr = this.game.hand ?? {};
      if (seatIndex !== -1 && curr.actingSeat === seatIndex) {
        this._checkTurnSounds(prev, curr);
      }
    }
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

  _renderVolumeSlider() {
    const labels = ["Off", "25%", "75%", "100%"];
    return html`
      <label>Sound Volume</label>
      <div class="volume-slider">
        ${Game.volumeSteps.map(
          (v, i) => html`
            <button
              class=${this.volume === v ? "active" : ""}
              @click=${() => this.setVolume(v)}
            >
              ${labels[i]}
            </button>
          `,
        )}
      </div>
    `;
  }

  _renderSettingsModal() {
    if (!this.showSettings) return "";
    return html`
      <phg-modal title="Settings" @close=${this.closeSettings}>
        <div class="settings-content">
          <label>Name</label>
          <input
            id="name-input"
            type="text"
            placeholder="Enter your name"
            maxlength="20"
            .value=${this.getCurrentPlayerName()}
            @keydown=${(e) => e.key === "Enter" && this.saveSettings()}
          />
          ${this._renderVolumeSlider()}
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

    const { seatIndex, actions, bustedPosition, isWinner } =
      this.getMySeatInfo();
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
          <div id="seats" data-table-size="${this.game.seats.length}">
            ${this.game.seats.map((seat, i) =>
              seat.empty && isSeated
                ? ""
                : html`<phg-seat
                    data-seat="${i}"
                    data-table-size="${this.game.seats.length}"
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
          .smallBlind=${this.game.blinds?.small || 1}
          .bigBlind=${this.game.blinds?.big || 1}
          .seatedCount=${this.game.seats.filter((s) => !s.empty).length}
          .bustedPosition=${bustedPosition}
          .isWinner=${isWinner}
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
