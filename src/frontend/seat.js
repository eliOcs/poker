import { html, LitElement, nothing } from "lit";
import { formatAmount } from "./currency.js";
import { ICONS } from "./icons.js";
import {
  formatPosition,
  formatHandResult,
  getResultClass,
  getHoleCardState,
} from "./seat-utils.js";
import { getLeavingCards } from "./leaving-cards.js";
import "./card.js";
import "./chips.js";
import "./avatar.js";
/** @typedef {(seat: any) => boolean} SeatClassCondition */

// Hole cards arrive one at a time around the table.
const DEAL_STEP_MS = 60;

class Seat extends LitElement {
  createRenderRoot() {
    return this;
  }

  static get properties() {
    return {
      seat: { type: Object },
      avatar: { type: Object },
      seatNumber: { type: Number },
      deal: { type: Object },
      isButton: { type: Boolean },
      clockRemaining: { type: Number },
      hideBet: { type: Boolean },
      settingsEnabled: { type: Boolean },
      noAnimation: { type: Boolean },
      displayBigBlind: { type: Number },
    };
  }

  constructor() {
    super();
    this.seat = undefined;
    /** @type {import('../shared/avatar.js').AvatarConfiguration|undefined} */
    this.avatar = undefined;
    this.seatNumber = 0;
    /** @type {{ turn: number, players: number }|undefined} */
    this.deal = undefined;
    this.isButton = false;
    this.noAnimation = false;
    this.displayBigBlind = 0;
    this.clockRemaining = undefined;
    this.hideBet = false;
    this.settingsEnabled = true;
    /** @type {string[]|undefined} Cards leaving as the hand is cleared */
    this._leavingCards = undefined;
    /** Counts the hands whose cards have left; each gets new card elements */
    this._cardSet = 0;
    this._activeEmote = undefined;
    this._emoteTimer = undefined;
    this._emoteFrame = undefined;
    this._activeChat = undefined;
    this._chatTimer = undefined;
    this._chatFrame = undefined;
    this._handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") this._clearBubbles();
    };
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("visibilitychange", this._handleVisibilityChange);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener(
      "visibilitychange",
      this._handleVisibilityChange,
    );
    this._clearBubbles();
  }

  /** @type {[string, SeatClassCondition][]} */
  static _seatClassStates = [
    ["empty", (s) => !s || s.empty],
    ["acting", (s) => s?.isActing],
    ["folded", (s) => s?.folded],
    ["all-in", (s) => s?.allIn],
    [
      "sitting-out",
      (s) => s?.sittingOut && (s?.bustedPosition ?? undefined) === undefined,
    ],
    ["busted", (s) => (s?.bustedPosition ?? undefined) !== undefined],
    ["disconnected", (s) => s?.disconnected],
    ["current-player", (s) => s?.isCurrentPlayer],
    [
      "winner",
      (s) => Boolean(s?.isWinner) || (s?.netResult ?? s?.handResult) > 0,
    ],
  ];

  willUpdate(changedProperties) {
    if (!changedProperties.has("seat") || this.noAnimation) return;
    // Only the update that clears the cards starts them leaving; any later
    // one ends it, even if the animation never got to run.
    const wasLeaving = Boolean(this._leavingCards);
    this._leavingCards = getLeavingCards(
      changedProperties.get("seat")?.cards,
      this.seat?.cards,
    );
    if (wasLeaving && !this._leavingCards) this._cardSet++;
  }

  updated(changedProperties) {
    if (!["seat", "settingsEnabled"].some((key) => changedProperties.has(key)))
      return;
    const isEmpty = !this.seat || this.seat.empty;
    for (const [cls, condition] of Seat._seatClassStates) {
      this.classList.toggle(
        cls,
        cls === "empty" ? isEmpty : !isEmpty && condition(this.seat),
      );
    }
  }

  _clearBubbles() {
    clearTimeout(this._emoteTimer);
    clearTimeout(this._chatTimer);
    cancelAnimationFrame(this._emoteFrame);
    cancelAnimationFrame(this._chatFrame);
    this._activeEmote = undefined;
    this._activeChat = undefined;
    this.requestUpdate();
  }

  _showBubble(value, kind) {
    if (document.visibilityState === "hidden" || !this.isConnected) return;
    const timerKey = kind === "emote" ? "_emoteTimer" : "_chatTimer";
    const frameKey = kind === "emote" ? "_emoteFrame" : "_chatFrame";
    const stateKey = kind === "emote" ? "_activeEmote" : "_activeChat";
    const text = String(value ?? "").trim();
    if (!text) return;
    clearTimeout(this[timerKey]);
    cancelAnimationFrame(this[frameKey]);
    this[stateKey] = undefined;
    this.requestUpdate();
    this[frameKey] = requestAnimationFrame(() => {
      this[frameKey] = undefined;
      if (document.visibilityState === "hidden" || !this.isConnected) return;
      this[stateKey] = text;
      this.requestUpdate();
      this[timerKey] = setTimeout(() => {
        this[stateKey] = undefined;
        this.requestUpdate();
      }, 3000);
    });
  }

  showEmote(emoji) {
    this._showBubble(emoji, "emote");
  }
  showChat(message) {
    this._showBubble(message, "chat");
  }

  _getStatusLabel() {
    const s = this.seat;
    if (s.disconnected) return { label: "DISCONNECTED", isStatus: true };
    if ((s.bustedPosition ?? undefined) !== undefined) {
      return { label: formatPosition(s.bustedPosition), isStatus: true };
    }
    if (s.sittingOut) return { label: "SITTING OUT", isStatus: true };
    if (s.folded) return { label: "FOLDED", isStatus: true };
    if (s.allIn) return { label: "ALL-IN", isStatus: true };
    if (s.lastAction) return { label: s.lastAction, isStatus: false };
    return;
  }

  _renderStatusOrAction() {
    if ((this.seat.bustedPosition ?? undefined) !== undefined) {
      return html`<div class="status-label">
        ${formatPosition(this.seat.bustedPosition)}
      </div>`;
    }
    if ((this.seat.handResult ?? this.seat.netResult) !== undefined) return "";
    const status = this._getStatusLabel();
    if (!status) return "";
    return status.isStatus
      ? html`<div class="status-label">${status.label}</div>`
      : html`<div class="last-action">${status.label}</div>`;
  }

  _renderStackOrResult() {
    if ((this.seat.bustedPosition ?? undefined) !== undefined) {
      return "";
    }
    if ((this.seat.netResult ?? undefined) !== undefined) {
      return html`
        <div class="hand-result ${getResultClass(this.seat.netResult)}">
          ${formatHandResult(this.seat.netResult, this.displayBigBlind)}
        </div>
        <div class="stack ending-stack">
          ${formatAmount(this.seat.endingStack, this.displayBigBlind)}
        </div>
      `;
    }
    return (this.seat.handResult ?? undefined) !== undefined
      ? html`<div class="hand-result ${getResultClass(this.seat.handResult)}">
          ${formatHandResult(this.seat.handResult, this.displayBigBlind)}
        </div>`
      : html`<div class="stack">
          ${formatAmount(this.seat.stack, this.displayBigBlind)}
        </div>`;
  }

  _renderClock() {
    return this.clockRemaining !== undefined
      ? html`<div
          class="clock-countdown ${this.clockRemaining <= 10 ? "urgent" : ""}"
        >
          <span class="clock-countdown-icon" aria-hidden="true"
            >${ICONS.clock}</span
          >
          <span>${this.clockRemaining}s</span>
        </div>`
      : "";
  }

  _renderDealerButton() {
    return this.isButton
      ? html`<span class="dealer-button"
          ><span class="pixel-label">D</span></span
        >`
      : "";
  }
  _renderHandRank() {
    return this.seat.handRank &&
      !this.seat.isCurrentPlayer &&
      !this.seat.lastAction &&
      (this.seat.netResult ?? undefined) === undefined
      ? html`<div class="hand-rank">${this.seat.handRank}</div>`
      : "";
  }

  _renderBetIndicator() {
    return this.seat.bet > 0 && !this.hideBet
      ? html`<div class="bet-indicator">
          <phg-chips .amount=${this.seat.bet}></phg-chips>
          ${formatAmount(this.seat.bet, this.displayBigBlind)}
        </div>`
      : "";
  }

  _renderPlayerInfo() {
    const player = this.seat.player;
    return html`<div class="player-info">
      <phg-avatar
        .avatar=${this.avatar}
        .playerId=${player?.id}
        .revision=${player?.avatarRevision}
        .label=${`${player?.name ?? "Player"}'s avatar`}
      ></phg-avatar>
      <span class="player-name"
        >${player?.name ?? `Seat ${this.seatNumber + 1}`}</span
      >
      ${player?.bot ? html`<span class="bot-badge">Bot</span>` : ""}
    </div>`;
  }

  /**
   * After folding, each hole card toggles between shown and mucked. Nothing
   * reaches the table until the hand ends, so the choice stays open.
   * @param {number} index
   */
  _toggleShowCard(index) {
    if (!this.seat?.cardChoice?.open) return;
    this.dispatchEvent(
      new CustomEvent("toggle-show-card", {
        bubbles: true,
        composed: true,
        detail: { index },
      }),
    );
  }

  /**
   * @param {KeyboardEvent} event
   * @param {number} index
   */
  _handleCardChoiceKeydown(event, index) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    this._toggleShowCard(index);
  }

  /**
   * How long a hole card waits for its turn in the deal: each player gets a
   * card in turn, then each gets a second.
   * @param {number} index
   */
  _dealDelay(index) {
    if (!this.deal || this.deal.turn === -1) return nothing;
    const turn = index * this.deal.players + this.deal.turn;
    return `--deal-delay: ${turn * DEAL_STEP_MS}ms`;
  }

  /**
   * Marks which cards the player shows, and while the choice is open
   * the card element itself becomes the toggle, so it is never replaced and
   * never replays its deal animation.
   * @param {string} card
   * @param {number} index
   */
  _renderHoleCard(card, index) {
    const choice = getHoleCardState(card, this.seat.cardChoice, index);
    return html`<phg-card
      class=${choice.className}
      role=${choice.toggle?.role ?? nothing}
      tabindex=${choice.toggle?.tabindex ?? nothing}
      aria-pressed=${choice.toggle?.pressed ?? nothing}
      aria-label=${choice.toggle?.label ?? nothing}
      @click=${() => {
        this._toggleShowCard(index);
      }}
      @keydown=${(/** @type {KeyboardEvent} */ event) => {
        this._handleCardChoiceKeydown(event, index);
      }}
      .card=${choice.card}
      style=${this._dealDelay(index)}
      ?winning=${this.seat.winningCards?.includes(card)}
      ?noAnimation=${this.noAnimation}
      size="large"
    ></phg-card>`;
  }

  /**
   * The seat's hole cards. When the hand is cleared away they turn face down,
   * then go; the same card elements do it, so they flip rather than redeal.
   */
  _renderHoleCards() {
    const leaving = this._leavingCards;
    const shown = leaving ?? this.seat.cards;
    const cards = leaving ? leaving.map(() => "??") : this.seat.cards;
    const classes = `hole-cards ${shown?.some((card) => card !== "??") ? "revealed" : ""} ${leaving ? "leaving" : ""}`;
    const content = cards?.map((card, index) =>
      this._renderHoleCard(card, index),
    );
    const handleLeft = (/** @type {AnimationEvent} */ event) => {
      if (event.animationName !== "leave-table") return;
      this._leavingCards = undefined;
      this._cardSet++;
      this.requestUpdate();
    };
    // Two identical templates take turns, one per hand, so once cards have
    // left the next ones are new elements: nothing left mid-flip carries over.
    return this._cardSet % 2
      ? html`<div class=${classes} @animationend=${handleLeft}>${content}</div>`
      : html`<div class=${classes} @animationend=${handleLeft}>
          ${content}
        </div>`;
  }

  /**
   * Your own player panel opens settings. It is a button of its own over the
   * panel, so clicking your cards or chips does not open settings.
   */
  _renderSettingsButton() {
    if (!this.settingsEnabled || !this.seat?.isCurrentPlayer) return "";
    return html`<button
      type="button"
      class="seat-settings"
      aria-label="Open settings"
      @click=${() => {
        this.dispatchEvent(new CustomEvent("seat-settings", { bubbles: true }));
      }}
    ></button>`;
  }

  render() {
    if (!this.seat || this.seat.empty) return "";

    return html`
      <div class="seat-content">
        ${this._renderPlayerInfo()} ${this._renderStackOrResult()}
        ${this._renderClock()} ${this._renderStatusOrAction()}
        ${this._renderHandRank()} ${this._renderHoleCards()}
      </div>
      ${this._renderSettingsButton()}
      ${
        this._activeEmote
          ? html`<div class="emote-bubble">${this._activeEmote}</div>`
          : ""
      }
      ${
        this._activeChat
          ? html`<div class="chat-bubble">${this._activeChat}</div>`
          : ""
      }
      ${this._renderBetIndicator()} ${this._renderDealerButton()}
    `;
  }
}

customElements.define("phg-seat", Seat);
