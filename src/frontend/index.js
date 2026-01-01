import * as COLORS from "./colors.js";
import { html, css, unsafeCSS, LitElement } from "lit";

const SUIT_SYMBOLS = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

const RANK_DISPLAY = {
  ace: "A",
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "10",
  jack: "J",
  queen: "Q",
  king: "K",
};

class Game extends LitElement {
  static get styles() {
    return css`
      :host {
        height: 100%;
        display: block;
        position: relative;
        background-color: ${unsafeCSS(COLORS.bgMedium)};
        box-sizing: border-box;
        font-family: "Press Start 2P", monospace;
        color: ${unsafeCSS(COLORS.fgMedium)};
        image-rendering: pixelated;
      }

      :host * {
        box-sizing: inherit;
      }

      #container {
        position: absolute;
        top: 0%;
        left: 5%;
        height: 80%;
        width: 90%;
      }

      #board {
        position: absolute;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        top: 15%;
        left: 10%;
        height: 70%;
        width: 80%;
        background-color: ${unsafeCSS(COLORS.green)};
        border: 6px solid ${unsafeCSS(COLORS.bgDark)};
        box-shadow:
          inset 4px 4px 0 rgba(255, 255, 255, 0.1),
          inset -4px -4px 0 rgba(0, 0, 0, 0.2),
          8px 8px 0 ${unsafeCSS(COLORS.bgDark)};
      }

      .board-info {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }

      .community-cards {
        display: flex;
        gap: 6px;
      }

      .pot {
        font-size: 0.7em;
        color: ${unsafeCSS(COLORS.gold)};
      }

      .phase {
        font-size: 0.5em;
        color: ${unsafeCSS(COLORS.fgWhite)};
        text-transform: uppercase;
        letter-spacing: 2px;
      }

      #seats {
        height: 100%;
        width: 100%;
      }

      .seat {
        position: absolute;
        height: 20%;
        width: 20%;
        min-height: 130px;
        border: 4px solid ${unsafeCSS(COLORS.fgDark)};
        background-color: ${unsafeCSS(COLORS.bgLight)};
        padding: 8px;
        display: flex;
        flex-direction: column;
        font-size: 0.5em;
        box-shadow: 4px 4px 0 ${unsafeCSS(COLORS.bgDark)};
      }

      .seat.empty {
        justify-content: center;
        align-items: center;
        gap: 12px;
        font-size: 0.7em;
      }

      .seat.empty button {
        padding: 10px 20px;
        font-size: 0.9em;
        font-family: "Press Start 2P", monospace;
        cursor: pointer;
        border: 3px solid ${unsafeCSS(COLORS.bgDark)};
        background-color: ${unsafeCSS(COLORS.purple)};
        color: ${unsafeCSS(COLORS.fgWhite)};
        box-shadow:
          3px 3px 0 ${unsafeCSS(COLORS.bgDark)},
          inset -2px -2px 0 rgba(0, 0, 0, 0.2),
          inset 2px 2px 0 rgba(255, 255, 255, 0.2);
      }

      .seat.empty button:active {
        box-shadow:
          1px 1px 0 ${unsafeCSS(COLORS.bgDark)},
          inset 2px 2px 0 rgba(0, 0, 0, 0.2),
          inset -2px -2px 0 rgba(255, 255, 255, 0.2);
        transform: translate(2px, 2px);
      }

      .seat.acting {
        border-color: ${unsafeCSS(COLORS.gold)};
        background-color: ${unsafeCSS(COLORS.bgLight)};
        box-shadow:
          4px 4px 0 ${unsafeCSS(COLORS.bgDark)},
          0 0 0 4px ${unsafeCSS(COLORS.gold)};
      }

      .seat.folded {
        opacity: 0.4;
      }

      .seat.all-in {
        border-color: ${unsafeCSS(COLORS.red)};
      }

      .seat.current-player {
        border-color: ${unsafeCSS(COLORS.magenta)};
      }

      .seat:nth-child(1) {
        top: 15%;
        left: 2.5%;
      }

      .seat:nth-child(2) {
        top: 2.5%;
        left: 40%;
      }

      .seat:nth-child(3) {
        top: 15%;
        right: 2.5%;
      }

      .seat:nth-child(4) {
        bottom: 15%;
        right: 2.5%;
      }

      .seat:nth-child(5) {
        bottom: 5%;
        left: 40%;
      }

      .seat:nth-child(6) {
        bottom: 15%;
        left: 2.5%;
      }

      .player-info {
        margin-bottom: 4px;
      }

      .player-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: ${unsafeCSS(COLORS.fgWhite)};
      }

      .stack {
        color: ${unsafeCSS(COLORS.greenLight)};
      }

      .bet {
        color: ${unsafeCSS(COLORS.gold)};
      }

      .dealer-button {
        display: inline-block;
        background-color: ${unsafeCSS(COLORS.gold)};
        color: ${unsafeCSS(COLORS.bgDark)};
        width: 18px;
        height: 18px;
        text-align: center;
        line-height: 18px;
        font-size: 0.8em;
        margin-left: 4px;
        border: 2px solid ${unsafeCSS(COLORS.bgDark)};
      }

      .hole-cards {
        display: flex;
        gap: 4px;
        margin-top: auto;
      }

      .card {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 48px;
        background-color: ${unsafeCSS(COLORS.fgWhite)};
        border: 3px solid ${unsafeCSS(COLORS.bgDark)};
        line-height: 1;
      }

      .card .rank {
        font-size: 1.1em;
      }

      .card .suit {
        font-family: serif;
        font-size: 1.2em;
        margin-top: -2px;
      }

      .card.red {
        color: ${unsafeCSS(COLORS.red)};
      }

      .card.black {
        color: ${unsafeCSS(COLORS.bgDark)};
      }

      .card.hidden {
        background-color: ${unsafeCSS(COLORS.blue)};
        background-image:
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 4px,
            ${unsafeCSS(COLORS.purple)} 4px,
            ${unsafeCSS(COLORS.purple)} 8px
          ),
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 4px,
            ${unsafeCSS(COLORS.purple)} 4px,
            ${unsafeCSS(COLORS.purple)} 8px
          );
      }

      .card.placeholder {
        background-color: ${unsafeCSS(COLORS.bgLight)};
        border-color: ${unsafeCSS(COLORS.bgDisabled)};
        border-style: dashed;
      }

      .seat-action {
        margin-top: 4px;
      }

      .seat-action button {
        padding: 4px 8px;
        cursor: pointer;
      }

      #actions {
        position: absolute;
        height: 15%;
        width: 90%;
        bottom: 2%;
        left: 5%;
        border: 4px solid ${unsafeCSS(COLORS.fgDark)};
        background-color: ${unsafeCSS(COLORS.bgLight)};
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 10px;
        flex-wrap: wrap;
        box-shadow: 4px 4px 0 ${unsafeCSS(COLORS.bgDark)};
      }

      #actions button {
        padding: 8px 16px;
        font-family: "Press Start 2P", monospace;
        font-size: 0.6em;
        cursor: pointer;
        border: 3px solid ${unsafeCSS(COLORS.bgDark)};
        box-shadow:
          3px 3px 0 ${unsafeCSS(COLORS.bgDark)},
          inset -2px -2px 0 rgba(0, 0, 0, 0.2),
          inset 2px 2px 0 rgba(255, 255, 255, 0.2);
      }

      #actions button:active {
        box-shadow:
          1px 1px 0 ${unsafeCSS(COLORS.bgDark)},
          inset 2px 2px 0 rgba(0, 0, 0, 0.2),
          inset -2px -2px 0 rgba(255, 255, 255, 0.2);
        transform: translate(2px, 2px);
      }

      #actions button.fold {
        background-color: ${unsafeCSS(COLORS.red)};
        color: ${unsafeCSS(COLORS.fgWhite)};
      }

      #actions button.check,
      #actions button.call {
        background-color: ${unsafeCSS(COLORS.greenLight)};
        color: ${unsafeCSS(COLORS.bgDark)};
      }

      #actions button.bet,
      #actions button.raise {
        background-color: ${unsafeCSS(COLORS.blue)};
        color: ${unsafeCSS(COLORS.fgWhite)};
      }

      #actions button.all-in {
        background-color: ${unsafeCSS(COLORS.gold)};
        color: ${unsafeCSS(COLORS.bgDark)};
      }

      #actions button.buy-in {
        background-color: ${unsafeCSS(COLORS.purple)};
        color: ${unsafeCSS(COLORS.fgWhite)};
      }

      #actions button.start {
        background-color: ${unsafeCSS(COLORS.gold)};
        color: ${unsafeCSS(COLORS.bgDark)};
        font-size: 0.7em;
        padding: 12px 24px;
      }

      .countdown {
        font-size: 2em;
        color: ${unsafeCSS(COLORS.gold)};
        text-shadow: 4px 4px 0 ${unsafeCSS(COLORS.bgDark)};
      }

      .amount-input {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .amount-input input[type="range"] {
        width: 100px;
        height: 8px;
        appearance: none;
        background: ${unsafeCSS(COLORS.bgDisabled)};
        border: 2px solid ${unsafeCSS(COLORS.bgDark)};
      }

      .amount-input input[type="range"]::-webkit-slider-thumb {
        appearance: none;
        width: 16px;
        height: 16px;
        background: ${unsafeCSS(COLORS.gold)};
        border: 2px solid ${unsafeCSS(COLORS.bgDark)};
        cursor: pointer;
      }

      .amount-display {
        min-width: 60px;
        text-align: center;
        font-size: 0.6em;
        color: ${unsafeCSS(COLORS.gold)};
      }

      #connection-status {
        position: absolute;
        left: 0.5%;
        bottom: 0.5%;
        color: ${unsafeCSS(COLORS.bgDisabled)};
        font-size: 0.4em;
      }

      .status-label {
        font-size: 0.8em;
        color: ${unsafeCSS(COLORS.gold)};
      }

      .error-message {
        position: absolute;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        background-color: ${unsafeCSS(COLORS.red)};
        color: ${unsafeCSS(COLORS.fgWhite)};
        padding: 10px 20px;
        border: 3px solid ${unsafeCSS(COLORS.bgDark)};
        font-size: 0.5em;
        z-index: 100;
        box-shadow: 4px 4px 0 ${unsafeCSS(COLORS.bgDark)};
      }
    `;
  }

  static get properties() {
    return {
      gameId: { type: String, attribute: "game-id" },
      game: { type: Object },
      socket: { type: Object },
      betAmount: { type: Number },
      error: { type: String },
    };
  }

  constructor() {
    super();
    this.gameId = null;
    this.betAmount = 0;
    this.error = null;
  }

  firstUpdated() {
    this.connect();
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
  }

  send(message) {
    this.socket.send(JSON.stringify(message));
  }

  renderCard(card) {
    if (!card) {
      return html`<span class="card placeholder"></span>`;
    }
    if (card.hidden) {
      return html`<span class="card hidden"></span>`;
    }
    const isRed = card.suit === "hearts" || card.suit === "diamonds";
    return html`
      <span class="card ${isRed ? "red" : "black"}">
        <span class="rank">${RANK_DISPLAY[card.rank]}</span>
        <span class="suit">${SUIT_SYMBOLS[card.suit]}</span>
      </span>
    `;
  }

  renderSeat(seat, index) {
    const isButton = this.game.button === index;

    if (seat.empty) {
      const sitAction = seat.actions?.find((a) => a.action === "sit");
      return html`
        <div class="seat empty">
          <span>Empty</span>
          ${sitAction
            ? html`<button @click=${() => this.send(sitAction)}>Sit</button>`
            : ""}
        </div>
      `;
    }

    const classes = ["seat"];
    if (seat.isActing) classes.push("acting");
    if (seat.folded) classes.push("folded");
    if (seat.allIn) classes.push("all-in");
    if (seat.isCurrentPlayer) classes.push("current-player");

    return html`
      <div class="${classes.join(" ")}">
        <div class="player-info">
          <span class="player-name">
            ${seat.player?.id?.substring(0, 8) || "Player"}
            ${isButton ? html`<span class="dealer-button">D</span>` : ""}
          </span>
        </div>
        <div class="stack">Stack: $${seat.stack}</div>
        ${seat.bet > 0 ? html`<div class="bet">Bet: $${seat.bet}</div>` : ""}
        ${seat.folded ? html`<div class="status-label">FOLDED</div>` : ""}
        ${seat.allIn ? html`<div class="status-label">ALL-IN</div>` : ""}
        <div class="hole-cards">
          ${seat.cards?.map((card) => this.renderCard(card)) || ""}
        </div>
      </div>
    `;
  }

  renderBoard() {
    const { board, hand, countdown } = this.game;
    const cards = board?.cards || [];

    // Show countdown if active
    if (countdown !== null && countdown !== undefined) {
      return html`
        <div class="board-info">
          <div class="phase">Starting in...</div>
          <div class="countdown">${countdown}</div>
        </div>
      `;
    }

    return html`
      <div class="board-info">
        ${hand?.phase
          ? html`<div class="phase">${hand.phase}</div>`
          : html`<div class="phase">Waiting</div>`}
        <div class="community-cards">
          ${cards.map((card) => this.renderCard(card))}
        </div>
        ${hand?.pot !== undefined
          ? html`<div class="pot">Pot: $${hand.pot}</div>`
          : ""}
      </div>
    `;
  }

  getMySeatInfo() {
    // Find the current player's seat index and actions
    const seatIndex = this.game.seats.findIndex(
      (s) => s.isCurrentPlayer && !s.empty,
    );
    if (seatIndex === -1) {
      return { seatIndex: -1, actions: [] };
    }
    return { seatIndex, actions: this.game.seats[seatIndex].actions || [] };
  }

  renderActions() {
    const { seatIndex, actions } = this.getMySeatInfo();

    if (actions.length === 0) {
      return html`<span style="color: ${COLORS.fgDark}"
        >Waiting for your turn...</span
      >`;
    }

    const result = [];

    for (const action of actions) {
      switch (action.action) {
        case "buyIn":
          result.push(html`
            <div class="amount-input">
              <input
                type="range"
                min="${action.min}"
                max="${action.max}"
                .value="${this.betAmount || action.min}"
                @input=${(e) => (this.betAmount = parseInt(e.target.value))}
              />
              <span class="amount-display"
                >$${this.betAmount || action.min}</span
              >
              <button
                class="buy-in"
                @click=${() =>
                  this.send({
                    action: "buyIn",
                    seat: seatIndex,
                    amount: this.betAmount || action.min,
                  })}
              >
                Buy In
              </button>
            </div>
          `);
          break;

        case "check":
          result.push(html`
            <button
              class="check"
              @click=${() => this.send({ action: "check", seat: seatIndex })}
            >
              Check
            </button>
          `);
          break;

        case "call":
          result.push(html`
            <button
              class="call"
              @click=${() => this.send({ action: "call", seat: seatIndex })}
            >
              Call $${action.amount}
            </button>
          `);
          break;

        case "fold":
          result.push(html`
            <button
              class="fold"
              @click=${() => this.send({ action: "fold", seat: seatIndex })}
            >
              Fold
            </button>
          `);
          break;

        case "bet": {
          const betValue = this.betAmount || action.min;
          const isAllIn = betValue >= action.max;
          result.push(html`
            <div class="amount-input">
              <input
                type="range"
                min="${action.min}"
                max="${action.max}"
                .value="${betValue}"
                @input=${(e) => (this.betAmount = parseInt(e.target.value))}
              />
              <span class="amount-display">$${betValue}</span>
              <button
                class="${isAllIn ? "all-in" : "bet"}"
                @click=${() =>
                  this.send(
                    isAllIn
                      ? { action: "allIn", seat: seatIndex }
                      : { action: "bet", seat: seatIndex, amount: betValue },
                  )}
              >
                ${isAllIn ? "All-In" : "Bet"}
              </button>
            </div>
          `);
          break;
        }

        case "raise": {
          const raiseValue = this.betAmount || action.min;
          const isAllIn = raiseValue >= action.max;
          result.push(html`
            <div class="amount-input">
              <input
                type="range"
                min="${action.min}"
                max="${action.max}"
                .value="${raiseValue}"
                @input=${(e) => (this.betAmount = parseInt(e.target.value))}
              />
              <span class="amount-display">$${raiseValue}</span>
              <button
                class="${isAllIn ? "all-in" : "raise"}"
                @click=${() =>
                  this.send(
                    isAllIn
                      ? { action: "allIn", seat: seatIndex }
                      : {
                          action: "raise",
                          seat: seatIndex,
                          amount: raiseValue,
                        },
                  )}
              >
                ${isAllIn ? "All-In" : "Raise to"}
              </button>
            </div>
          `);
          break;
        }

        case "start":
          result.push(html`
            <button
              class="start"
              @click=${() => this.send({ action: "start" })}
            >
              Start Game
            </button>
          `);
          break;
      }
    }

    return result;
  }

  render() {
    if (!this.game) {
      return html`<p>Loading ...</p>`;
    }

    return html`
      ${this.error ? html`<div class="error-message">${this.error}</div>` : ""}
      <div id="container">
        <div id="board">${this.renderBoard()}</div>
        <div id="seats">
          ${this.game.seats.map((seat, i) => this.renderSeat(seat, i))}
        </div>
      </div>
      <div id="actions">${this.renderActions()}</div>
      <span id="connection-status">
        ${!this.socket ? "Not connected" : ""}
        ${this.socket?.readyState === 0 ? "Connecting ..." : ""}
        ${this.socket?.readyState === 1 ? "Connected" : ""}
        ${this.socket?.readyState === 2 ? "Closing ..." : ""}
        ${this.socket?.readyState === 3 ? "Closed" : ""}
      </span>
    `;
  }
}
customElements.define("phg-game", Game);
