import { html, LitElement } from "lit";
import { formatCurrency } from "./currency.js";
import { renderHistoryTimeline } from "./history-timeline.js";
import { getHistoryPath } from "../shared/routes.js";
import "./card.js";
import "./seat.js";
import "./board.js";

const TIMELINE_MIN_HEIGHT = 120;
const TABLE_MIN_HEIGHT = 160;
const TIMELINE_KEYBOARD_STEP = 16;

function getTimelineHeightBounds(mainHeight) {
  const maxHeight = Math.max(0, mainHeight - TABLE_MIN_HEIGHT);
  const minHeight = Math.min(TIMELINE_MIN_HEIGHT, maxHeight);
  return { minHeight, maxHeight };
}

function clampTimelineHeight(height, mainHeight) {
  const { minHeight, maxHeight } = getTimelineHeightBounds(mainHeight);
  return Math.min(maxHeight, Math.max(minHeight, height));
}

export class History extends LitElement {
  createRenderRoot() {
    return this;
  }

  static get properties() {
    return {
      gameId: { type: String },
      handNumber: { type: Number },
      hand: { type: Object },
      view: { type: Object },
      handList: { type: Array },
      error: { type: String },
      playerId: { type: String },
      timelineHeight: { state: true },
    };
  }

  constructor() {
    super();
    this.gameId = undefined;
    this.handNumber = undefined;
    this.hand = undefined;
    this.view = undefined;
    this.handList = undefined;
    this.error = undefined;
    this.playerId = undefined;
    this.timelineHeight = undefined;
    this.touchStartX = undefined;
    this.timelineResizeStartY = undefined;
    this.timelineResizeStartHeight = undefined;
    this.boundHandleKeydown = this.handleKeydown.bind(this);
    this.boundHandleTouchStart = this.handleTouchStart.bind(this);
    this.boundHandleTouchEnd = this.handleTouchEnd.bind(this);
    this.boundHandleTimelineResize = this.handleTimelineResize.bind(this);
    this.boundStopTimelineResize = this.stopTimelineResize.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("keydown", this.boundHandleKeydown);
    this.addEventListener("touchstart", this.boundHandleTouchStart);
    this.addEventListener("touchend", this.boundHandleTouchEnd);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("keydown", this.boundHandleKeydown);
    this.removeEventListener("touchstart", this.boundHandleTouchStart);
    this.removeEventListener("touchend", this.boundHandleTouchEnd);
    this.stopTimelineResize();
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
    if (this.isTimelineResizeEvent(e)) return;
    this.touchStartX = e.touches[0].clientX;
  }

  handleTouchEnd(e) {
    if (this.isTimelineResizeEvent(e)) return;
    if (this.touchStartX === undefined) return;

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

    this.touchStartX = undefined;
  }

  isTimelineResizeEvent(event) {
    return event
      .composedPath()
      .some((element) => element.classList?.contains("timeline-resize-handle"));
  }

  handleTimelineResizeStart(event) {
    const timeline = this.renderRoot.querySelector(".timeline-panel");
    if (!timeline) return;

    event.preventDefault();
    this.touchStartX = undefined;
    this.timelineResizeStartY = event.clientY;
    this.timelineResizeStartHeight = timeline.getBoundingClientRect().height;
    window.addEventListener("pointermove", this.boundHandleTimelineResize);
    window.addEventListener("pointerup", this.boundStopTimelineResize);
    window.addEventListener("pointercancel", this.boundStopTimelineResize);
    window.addEventListener("blur", this.boundStopTimelineResize);
  }

  handleTimelineResize(event) {
    if (
      this.timelineResizeStartHeight === undefined ||
      this.timelineResizeStartY === undefined
    ) {
      return;
    }

    const main = this.renderRoot.querySelector(".main");
    if (!main) return;

    const height =
      this.timelineResizeStartHeight -
      (event.clientY - this.timelineResizeStartY);
    this.timelineHeight = clampTimelineHeight(
      height,
      main.getBoundingClientRect().height,
    );
  }

  handleTimelineResizeKeydown(event) {
    const direction =
      event.key === "ArrowUp" ? 1 : event.key === "ArrowDown" ? -1 : 0;
    if (!direction) return;

    const timeline = this.renderRoot.querySelector(".timeline-panel");
    const main = this.renderRoot.querySelector(".main");
    if (!timeline || !main) return;

    event.preventDefault();
    this.timelineHeight = clampTimelineHeight(
      timeline.getBoundingClientRect().height +
        direction * TIMELINE_KEYBOARD_STEP,
      main.getBoundingClientRect().height,
    );
  }

  stopTimelineResize() {
    this.timelineResizeStartY = undefined;
    this.timelineResizeStartHeight = undefined;
    window.removeEventListener("pointermove", this.boundHandleTimelineResize);
    window.removeEventListener("pointerup", this.boundStopTimelineResize);
    window.removeEventListener("pointercancel", this.boundStopTimelineResize);
    window.removeEventListener("blur", this.boundStopTimelineResize);
  }

  navigateTo(handNumber) {
    this.dispatchEvent(
      new CustomEvent("hand-select", {
        detail: { handNumber },
        bubbles: true,
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
      }),
    );
    // Go back in browser history for standalone mode (direct URL access)
    window.history.back();
  }

  getPlayerName(playerId) {
    const player = this.hand?.players.find((p) => p.id === playerId);
    return player?.name ?? `Seat ${player?.seat ?? "?"}`;
  }

  getCurrentHandSummary() {
    return this.handList?.find((h) => h.hand_number === this.handNumber);
  }

  renderHandNavLink(label, title, handNumber) {
    if (handNumber === undefined) {
      return html`<button type="button" class="nav-btn" disabled title=${title}>
        ${label}
      </button>`;
    }
    return html`<a
      class="nav-btn"
      href=${getHistoryPath(this.gameId, handNumber)}
      data-app-history="replace"
      title=${title}
    >
      ${label}
    </a>`;
  }

  renderHandSummaryCards(summary) {
    // Show player's hole cards if dealt, otherwise winner's hole cards
    const cards = summary.was_dealt
      ? summary.hole_cards
      : (summary.winner_hole_cards ?? []);
    return cards.map(
      (card) => html`<phg-card .card=${card} noAnimation></phg-card>`,
    );
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
    const prevHandNumber =
      currentIndex > 0
        ? this.handList[currentIndex - 1].hand_number
        : undefined;
    const nextHandNumber =
      currentIndex < this.handList.length - 1
        ? this.handList[currentIndex + 1].hand_number
        : undefined;

    return html`
      <div class="nav-bar">
        <button
          type="button"
          class="nav-btn"
          @click=${this.goBack}
          title="Back to game"
        >
          ✕
        </button>
        ${this.renderHandNavLink("←", "Previous hand", prevHandNumber)}
        <div class="nav-info">
          <span class="nav-number">#${summary.hand_number}</span>
          <div class="nav-cards">${this.renderHandSummaryCards(summary)}</div>
          ${this.renderHandSummaryResult(summary)}
        </div>
        ${this.renderHandNavLink("→", "Next hand", nextHandNumber)}
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
          noAnimation
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
                noAnimation
              ></phg-seat>
            `;
          })}
        </div>
      </div>
    `;
  }

  renderTimeline() {
    const { minHeight: ariaMinHeight, maxHeight: ariaMaxHeight } =
      getTimelineHeightBounds(this.clientHeight);
    return renderHistoryTimeline(this, {
      minHeight: ariaMinHeight,
      maxHeight: ariaMaxHeight,
      height: Math.round(
        Math.min(
          ariaMaxHeight,
          Math.max(ariaMinHeight, this.timelineHeight ?? 220),
        ),
      ),
    });
  }

  renderShowdownResult() {
    const mainPot = this.hand?.pots[0];
    if (!mainPot) return "";

    const winningHand = mainPot.winning_hand;
    const winningCards = mainPot.winning_cards;
    const winnerIds = mainPot.player_wins.map((w) => w.player_id);
    const winAmount = mainPot.player_wins[0]?.win_amount ?? mainPot.amount;

    return html`
      ${winnerIds.map((winnerId) => {
        const isYou = winnerId === this.playerId;
        const playerName = this.getPlayerName(winnerId);
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
              (card) => html`<phg-card .card=${card} noAnimation></phg-card>`,
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
            type="button"
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
              : (item.winner_hole_cards ?? []);

            return html`
              <li>
                <a
                  class="hand-item ${isActive ? "active" : ""} ${isWinner
                    ? "winner"
                    : ""}"
                  href=${getHistoryPath(this.gameId, item.hand_number)}
                  data-app-history="replace"
                >
                  <span class="hand-number">#${item.hand_number}</span>
                  <div class="hand-cards">
                    ${cards.map(
                      (card) =>
                        html`<phg-card .card=${card} noAnimation></phg-card>`,
                    )}
                  </div>
                  ${this.renderHandListResult(item)}
                </a>
              </li>
            `;
          })}
        </ul>
      </div>
    `;
  }

  render() {
    if (this.error) {
      return html`
        <div class="error">
          ${this.error}
          <a
            class="back-link"
            href="/"
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

    // History data has not arrived yet.
    if (!this.handList) {
      return html``;
    }

    if (this.handList.length === 0) {
      return html`
        <div class="empty">
          No hands recorded yet
          <a
            class="back-link"
            href="/"
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

    // Waiting for selected hand details; avoid replacing UI with a loading screen.
    if (!this.hand || !this.view) {
      return html``;
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
