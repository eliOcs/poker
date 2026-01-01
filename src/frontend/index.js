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
        background-color: ${unsafeCSS(COLORS.base01)};
        box-sizing: border-box;
        font-family: system-ui, sans-serif;
        color: ${unsafeCSS(COLORS.base05)};
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
        background-color: ${unsafeCSS(COLORS.base0B)};
        border: 20px solid ${unsafeCSS(COLORS.base00)};
        border-radius: 90px;
      }

      .board-info {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
      }

      .community-cards {
        display: flex;
        gap: 8px;
      }

      .pot {
        font-size: 1.2em;
        font-weight: bold;
        color: ${unsafeCSS(COLORS.base07)};
      }

      .phase {
        font-size: 0.9em;
        color: ${unsafeCSS(COLORS.base06)};
        text-transform: uppercase;
      }

      #seats {
        height: 100%;
        width: 100%;
      }

      .seat {
        position: absolute;
        height: 20%;
        width: 20%;
        min-height: 120px;
        border: 3px solid ${unsafeCSS(COLORS.base04)};
        border-radius: 6px;
        background-color: ${unsafeCSS(COLORS.base02)};
        padding: 8px;
        display: flex;
        flex-direction: column;
        font-size: 0.85em;
      }

      .seat.empty {
        justify-content: center;
        align-items: center;
        opacity: 0.6;
      }

      .seat.acting {
        border-color: ${unsafeCSS(COLORS.base0A)};
        box-shadow: 0 0 10px ${unsafeCSS(COLORS.base0A)};
      }

      .seat.folded {
        opacity: 0.4;
      }

      .seat.all-in {
        border-color: ${unsafeCSS(COLORS.base08)};
      }

      .seat.current-player {
        border-width: 4px;
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
        font-weight: bold;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .stack {
        color: ${unsafeCSS(COLORS.base0B)};
      }

      .bet {
        color: ${unsafeCSS(COLORS.base0A)};
      }

      .dealer-button {
        display: inline-block;
        background-color: ${unsafeCSS(COLORS.base07)};
        color: ${unsafeCSS(COLORS.base00)};
        border-radius: 50%;
        width: 20px;
        height: 20px;
        text-align: center;
        line-height: 20px;
        font-size: 0.7em;
        font-weight: bold;
        margin-left: 4px;
      }

      .hole-cards {
        display: flex;
        gap: 4px;
        margin-top: auto;
      }

      .card {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 50px;
        background-color: ${unsafeCSS(COLORS.base07)};
        border: 1px solid ${unsafeCSS(COLORS.base03)};
        border-radius: 4px;
        font-size: 0.9em;
        font-weight: bold;
      }

      .card.red {
        color: #d32f2f;
      }

      .card.black {
        color: ${unsafeCSS(COLORS.base00)};
      }

      .card.hidden {
        background: linear-gradient(
          135deg,
          ${unsafeCSS(COLORS.base0D)} 25%,
          ${unsafeCSS(COLORS.base02)} 25%,
          ${unsafeCSS(COLORS.base02)} 50%,
          ${unsafeCSS(COLORS.base0D)} 50%,
          ${unsafeCSS(COLORS.base0D)} 75%,
          ${unsafeCSS(COLORS.base02)} 75%
        );
        background-size: 8px 8px;
      }

      .card.placeholder {
        background-color: ${unsafeCSS(COLORS.base03)};
        opacity: 0.3;
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
        border: 3px solid ${unsafeCSS(COLORS.base04)};
        border-radius: 6px;
        background-color: ${unsafeCSS(COLORS.base02)};
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 10px;
        flex-wrap: wrap;
      }

      #actions button {
        padding: 10px 20px;
        font-size: 1em;
        cursor: pointer;
        border: none;
        border-radius: 4px;
        font-weight: bold;
      }

      #actions button.fold {
        background-color: ${unsafeCSS(COLORS.base08)};
        color: white;
      }

      #actions button.check,
      #actions button.call {
        background-color: ${unsafeCSS(COLORS.base0B)};
        color: white;
      }

      #actions button.bet,
      #actions button.raise {
        background-color: ${unsafeCSS(COLORS.base0D)};
        color: white;
      }

      #actions button.all-in {
        background-color: ${unsafeCSS(COLORS.base09)};
        color: white;
      }

      #actions button.buy-in {
        background-color: ${unsafeCSS(COLORS.base0E)};
        color: white;
      }

      #actions button.start {
        background-color: ${unsafeCSS(COLORS.base0C)};
        color: white;
        font-size: 1.2em;
        padding: 15px 30px;
      }

      .countdown {
        font-size: 3em;
        font-weight: bold;
        color: ${unsafeCSS(COLORS.base07)};
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
      }

      .amount-input {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .amount-input input[type="range"] {
        width: 120px;
      }

      .amount-input input[type="number"] {
        width: 70px;
        padding: 4px;
      }

      .amount-display {
        min-width: 50px;
        text-align: center;
      }

      #connection-status {
        position: absolute;
        left: 0.5%;
        bottom: 0.5%;
        color: ${unsafeCSS(COLORS.base04)};
        font-size: 0.8em;
      }

      .status-label {
        font-size: 0.75em;
        color: ${unsafeCSS(COLORS.base04)};
      }

      .error-message {
        position: absolute;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        background-color: ${unsafeCSS(COLORS.base08)};
        color: white;
        padding: 10px 20px;
        border-radius: 4px;
        font-weight: bold;
        z-index: 100;
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
        ${RANK_DISPLAY[card.rank]}${SUIT_SYMBOLS[card.suit]}
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
          ${cards.length > 0
            ? cards.map((card) => this.renderCard(card))
            : html`<span style="color: ${COLORS.base06}">No cards yet</span>`}
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
      return html`<span style="color: ${COLORS.base04}"
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

        case "bet":
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
                class="bet"
                @click=${() =>
                  this.send({
                    action: "bet",
                    seat: seatIndex,
                    amount: this.betAmount || action.min,
                  })}
              >
                Bet
              </button>
            </div>
          `);
          break;

        case "raise":
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
                class="raise"
                @click=${() =>
                  this.send({
                    action: "raise",
                    seat: seatIndex,
                    amount: this.betAmount || action.min,
                  })}
              >
                Raise to
              </button>
            </div>
          `);
          break;

        case "allIn":
          result.push(html`
            <button
              class="all-in"
              @click=${() => this.send({ action: "allIn", seat: seatIndex })}
            >
              All-In $${action.amount}
            </button>
          `);
          break;

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
