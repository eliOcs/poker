import { html, LitElement } from "lit";
import { designTokens, baseStyles, formatCurrency } from "./styles.js";
import { seatPositions } from "./game-layout.js";
import { gameStyles } from "./game.styles.js";
import * as Audio from "./audio.js";
import "./card.js";
import "./board.js";
import "./seat.js";
import "./action-panel.js";
import "./button.js";
import "./modal.js";
import "./ranking-panel.js";
import {
  snapshotBetPositions,
  animateBetCollection,
} from "./bet-collection.js";
import { renderDrawer } from "./drawer.js";
import {
  renderRankingModal,
  renderSettingsModal,
  renderEmoteModal,
  renderChatModal,
} from "./game-modals.js";

const TABLE_SIZE_LABELS = { 2: "Heads-Up", 6: "6-Max", 9: "Full Ring" };

class Game extends LitElement {
  static get styles() {
    return [designTokens, baseStyles, seatPositions, gameStyles];
  }

  static get properties() {
    return {
      gameId: { type: String, attribute: "game-id" },
      game: { type: Object },
      user: { type: Object },
      showSettings: { type: Boolean },
      showRanking: { type: Boolean },
      showEmotePicker: { type: Boolean },
      showChat: { type: Boolean },
      volume: { type: Number },
      _drawerOpen: { type: Boolean, state: true },
      _copied: { type: Boolean, state: true },
    };
  }

  constructor() {
    super();
    this.gameId = null;
    this.game = null;
    this.user = null;
    this.showSettings = false;
    this.showRanking = false;
    this.showEmotePicker = false;
    this.showChat = false;
    this.volume = 0.75; // Default, will be overwritten by user settings
    this._drawerOpen = false;
    this._copied = false;
    this._settingsInitialized = false;
    this._onMediaChange = (e) => {
      this._drawerOpen = e.matches;
    };
    Audio.setVolume(this.volume);
  }

  connectedCallback() {
    super.connectedCallback();
    this._mql = window.matchMedia("(min-width: 800px)");
    this._mql.addEventListener("change", this._onMediaChange);
    this._drawerOpen = this._mql.matches;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._mql?.removeEventListener("change", this._onMediaChange);
  }

  toggleDrawer() {
    this._drawerOpen = !this._drawerOpen;
  }

  async copyGameLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      this._copied = true;
      setTimeout(() => {
        this._copied = false;
      }, 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }

  async shareGameLink() {
    try {
      await navigator.share({
        title: "Join my poker game",
        url: window.location.href,
      });
    } catch (err) {
      console.error("Failed to share:", err);
    }
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

  openEmotePicker() {
    this.showEmotePicker = true;
  }

  closeEmotePicker() {
    this.showEmotePicker = false;
  }

  sendEmote(emoji) {
    this.send({ action: "emote", emoji });
    this.showEmotePicker = false;
  }

  openChat() {
    this.showChat = true;
  }

  closeChat() {
    this.showChat = false;
  }

  sendChat(message) {
    const trimmed = message.trim();
    if (!trimmed) return;
    this.send({ action: "chat", message: trimmed });
    this.showChat = false;
  }

  _getSitOutState() {
    if (!this.game) return null;
    const { seatIndex } = this.getMySeatInfo();
    if (seatIndex === -1) return null;
    const seat = this.game.seats[seatIndex];
    if (seat.sittingOut) return "sittingOut";
    if (seat.pendingSitOut) return "pendingSitOut";
    return "active";
  }

  leaveTable() {
    const { seatIndex } = this.getMySeatInfo();
    if (seatIndex === -1) return;
    this.send({ action: "leave", seat: seatIndex });
  }

  toggleSitOut() {
    const { seatIndex } = this.getMySeatInfo();
    if (seatIndex === -1) return;
    const seat = this.game.seats[seatIndex];

    if (seat.pendingSitOut) {
      this.send({ action: "cancelSitOut", seat: seatIndex });
    } else {
      this.send({ action: "sitOut", seat: seatIndex });
      const phase = this.game.hand?.phase;
      if (phase && phase !== "waiting" && !seat.folded) {
        this.dispatchEvent(
          new CustomEvent("toast", {
            detail: { message: "You will sit out after this hand" },
            bubbles: true,
            composed: true,
          }),
        );
      }
    }
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
        bustedPosition: undefined,
        isWinner: false,
      };
    }
    const seat = this.game.seats[seatIndex];
    const isWinner = this.game.tournament?.winner === seatIndex;
    return {
      seatIndex,
      actions: seat.actions || [],
      bustedPosition: seat.bustedPosition,
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

  willUpdate(changedProperties) {
    if (!changedProperties.has("game") || !this.game) return;
    if (this.game.hand?.collectingBets) {
      const bets = this.game.seats
        .map((s, i) => ({ index: i, bet: s.empty ? 0 : s.bet || 0 }))
        .filter((b) => b.bet > 0);
      if (bets.length > 0) {
        this._pendingCollection = snapshotBetPositions(this.shadowRoot, bets);
      }
    }
  }

  _flushPendingCollection() {
    const sources = this._pendingCollection;
    if (!sources) return;
    this._pendingCollection = null;
    const container = this.shadowRoot.querySelector("#container");
    if (container) animateBetCollection(container, sources);
  }

  updated(changedProperties) {
    if (changedProperties.has("user") && this.user) {
      this._initializeVolumeFromSettings();
    }
    if (!changedProperties.has("game") || !this.game) return;
    const { seatIndex } = this.getMySeatInfo();
    const prev = changedProperties.get("game")?.hand ?? {};
    const curr = this.game.hand ?? {};
    if (seatIndex !== -1 && curr.actingSeat === seatIndex) {
      this._checkTurnSounds(prev, curr);
    }
    this._flushPendingCollection();
  }

  getWinningCards() {
    return this.game.seats.find((s) => !s.empty && s.winningCards)
      ?.winningCards;
  }

  _formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  _renderInfoBar() {
    if (!this.game) return "";
    const isTournament = !!this.game.tournament;
    const sizeLabel = TABLE_SIZE_LABELS[this.game.seats.length] || "";
    const typeLabel = isTournament ? "Sit & Go" : "Cash";

    const cells = [
      html`<span class="info-cell info-type">${typeLabel}</span>`,
      html`<span class="info-cell info-size">${sizeLabel}</span>`,
    ];

    if (this.game.blinds) {
      cells.push(
        html`<span class="info-cell info-blinds"
          >${formatCurrency(this.game.blinds.small)}/${formatCurrency(
            this.game.blinds.big,
          )}</span
        >`,
      );
    }

    if (this.game.handNumber > 0) {
      cells.push(
        html`<span class="info-cell info-hand">#${this.game.handNumber}</span>`,
      );
    }

    if (isTournament && this.game.tournament.timeToNextLevel != null) {
      const t = this.game.tournament;
      const timerText = t.onBreak
        ? `Break ${this._formatTime(t.timeToNextLevel)}`
        : `Level ${t.level}: ${this._formatTime(t.timeToNextLevel)}`;
      cells.push(html`<span class="info-cell info-timer">${timerText}</span>`);
    }

    return html`<div id="info-bar">${cells}</div>`;
  }

  _isInHand(seatIndex) {
    if (seatIndex === -1) return false;
    const seat = this.game.seats[seatIndex];
    if (!seat || seat.empty) return false;
    if (seat.folded || seat.allIn || seat.sittingOut) return false;
    return ["preflop", "flop", "turn", "river"].includes(this.game.hand?.phase);
  }

  _getPreActionProps(seatIndex) {
    const seat = seatIndex !== -1 ? this.game.seats[seatIndex] : {};
    const hand = this.game.hand || {};
    return {
      preAction: seat.preAction,
      currentBet: hand.currentBet || 0,
      myBet: seat.bet || 0,
      myStack: seat.stack || 0,
      isActing: hand.actingSeat === seatIndex,
      inHand: this._isInHand(seatIndex),
    };
  }

  _renderActionPanel(actions, seatIndex, canSit, bustedPosition, isWinner) {
    const pre = this._getPreActionProps(seatIndex);
    return html`<phg-action-panel
      .actions=${actions}
      .seatIndex=${seatIndex}
      .smallBlind=${this.game.blinds?.small || 1}
      .bigBlind=${this.game.blinds?.big || 1}
      .pot=${this.game.hand?.pot ?? 0}
      .seatedCount=${this.game.seats.filter((s) => !s.empty).length}
      .canSit=${canSit}
      .buyIn=${this.game.tournament?.buyIn ?? 0}
      .bustedPosition=${bustedPosition}
      .isWinner=${isWinner}
      .preAction=${pre.preAction}
      .currentBet=${pre.currentBet}
      .myBet=${pre.myBet}
      .myStack=${pre.myStack}
      .isActing=${pre.isActing}
      .inHand=${pre.inHand}
      @game-action=${this.handleGameAction}
      @open-emote-picker=${this.openEmotePicker}
      @open-chat=${this.openChat}
    ></phg-action-panel>`;
  }

  render() {
    if (!this.game) return html`<p>Loading ...</p>`;

    const { seatIndex, actions, bustedPosition, isWinner } =
      this.getMySeatInfo();
    const isSeated = this.isPlayerSeated();
    const canSit = !isSeated && this.game.seats.some((s) => s.empty);

    return html`
      ${renderDrawer(this)}
      <div id="wrapper">
        <div id="container">
          <phg-board
            .board=${this.game.board}
            .hand=${this.game.hand}
            .countdown=${this.game.countdown}
            .winnerMessage=${this.game.winnerMessage}
            .winningCards=${this.getWinningCards()}
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
                    .buyIn=${this.game.tournament?.buyIn ?? 0}
                    .hideBet=${!!this.game.hand?.collectingBets}
                    .clockTicks=${this.game.hand?.actingSeat === i
                      ? this.game.hand?.clockTicks
                      : 0}
                    @seat-action=${this.handleSeatAction}
                  ></phg-seat>`,
            )}
          </div>
        </div>
        ${this._renderActionPanel(
          actions,
          seatIndex,
          canSit,
          bustedPosition,
          isWinner,
        )}
        ${this._renderInfoBar()} ${renderRankingModal(this)}
        ${renderSettingsModal(this)} ${renderEmoteModal(this)}
        ${renderChatModal(this)}
      </div>
    `;
  }
}

customElements.define("phg-game", Game);
