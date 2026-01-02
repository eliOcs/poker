import * as COLORS from "./colors.js";
import { html, css, unsafeCSS, LitElement } from "lit";
import "./card.js";
import "./board.js";
import "./seat.js";
import "./action-panel.js";

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
        width: 20%;
        z-index: 1;
      }

      phg-seat:nth-child(1) {
        top: 15%;
        left: 2.5%;
      }

      phg-seat:nth-child(2) {
        top: 2.5%;
        left: 40%;
      }

      phg-seat:nth-child(3) {
        top: 15%;
        right: 2.5%;
      }

      phg-seat:nth-child(4) {
        bottom: 15%;
        right: 2.5%;
      }

      phg-seat:nth-child(5) {
        bottom: 5%;
        left: 40%;
      }

      phg-seat:nth-child(6) {
        bottom: 15%;
        left: 2.5%;
      }

      .bet-indicator {
        position: absolute;
        z-index: 2;
        color: ${unsafeCSS(COLORS.gold)};
        font-size: 0.7em;
      }

      /* Seat 1: top-left */
      .bet-indicator[data-seat="0"] {
        top: 32%;
        left: 22%;
      }

      /* Seat 2: top-center */
      .bet-indicator[data-seat="1"] {
        top: 25%;
        left: 50%;
        transform: translateX(-50%);
      }

      /* Seat 3: top-right */
      .bet-indicator[data-seat="2"] {
        top: 32%;
        right: 26%;
      }

      /* Seat 4: bottom-right */
      .bet-indicator[data-seat="3"] {
        bottom: 38%;
        right: 26%;
      }

      /* Seat 5: bottom-center */
      .bet-indicator[data-seat="4"] {
        bottom: 30%;
        left: 50%;
        transform: translateX(-50%);
      }

      /* Seat 6: bottom-left */
      .bet-indicator[data-seat="5"] {
        bottom: 38%;
        left: 22%;
      }

      phg-action-panel {
        position: absolute;
        height: 15%;
        width: 90%;
        bottom: 2%;
        left: 5%;
      }

      #connection-status {
        position: absolute;
        left: 0.5%;
        bottom: 0.5%;
        color: ${unsafeCSS(COLORS.bgDisabled)};
        font-size: 0.4em;
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
      error: { type: String },
    };
  }

  constructor() {
    super();
    this.gameId = null;
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

  handleSeatAction(e) {
    this.send(e.detail);
  }

  handleGameAction(e) {
    this.send(e.detail);
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

  render() {
    if (!this.game) {
      return html`<p>Loading ...</p>`;
    }

    const { seatIndex, actions } = this.getMySeatInfo();
    const isSeated = this.isPlayerSeated();

    return html`
      ${this.error ? html`<div class="error-message">${this.error}</div>` : ""}
      <div id="container">
        <phg-board
          .board=${this.game.board}
          .hand=${this.game.hand}
          .countdown=${this.game.countdown}
          .winnerMessage=${this.game.winnerMessage}
        ></phg-board>
        <div id="seats">
          ${this.game.seats.map(
            (seat, i) => html`
              <phg-seat
                .seat=${seat}
                .isButton=${this.game.button === i}
                .showSitAction=${!isSeated}
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
        @game-action=${this.handleGameAction}
      ></phg-action-panel>
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
