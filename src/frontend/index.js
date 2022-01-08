import * as COLORS from "./colors.js";
import { html, css, unsafeCSS, LitElement } from "lit";

class Game extends LitElement {
  static get styles() {
    return css`
      :host {
        height: 100%;
        display: block;
        position: relative;
        background-color: ${unsafeCSS(COLORS.base01)};
        box-sizing: border-box;
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
        display: block;
        top: 15%;
        left: 10%;
        height: 70%;
        width: 80%;
        background-color: ${unsafeCSS(COLORS.base0B)};
        border: 20px solid ${unsafeCSS(COLORS.base00)};
        border-radius: 90px;
      }

      #seats {
        height: 100%;
        width: 100%;
      }

      #seat {
        position: absolute;
        height: 20%;
        width: 20%;
        border: 6px solid ${unsafeCSS(COLORS.base04)};
        border-radius: 6px;
      }

      #seat:nth-child(1) {
        top: 15%;
        left: 2.5%;
      }

      #seat:nth-child(2) {
        top: 2.5%;
        left: 40%;
      }

      #seat:nth-child(3) {
        top: 15%;
        right: 2.5%;
      }

      #seat:nth-child(4) {
        bottom: 15%;
        right: 2.5%;
      }

      #seat:nth-child(5) {
        bottom: 5%;
        left: 40%;
      }

      #seat:nth-child(6) {
        bottom: 15%;
        left: 2.5%;
      }

      #actions {
        position: absolute;
        height: 15%;
        width: 90%;
        bottom: 5%;
        left: 5%;
        border: 6px solid ${unsafeCSS(COLORS.base04)};
        border-radius: 6px;
      }

      #connection-status {
        position: absolute;
        left: 0.5%;
        bottom: 0.5%;
        color: ${unsafeCSS(COLORS.base04)};
      }
    `;
  }

  static get properties() {
    return {
      game: { type: Object },
      socket: { type: Object },
      //actions
      amount: { type: Number },
    };
  }

  constructor() {
    super();
    this.amount = 50;
    this.connect();
  }

  connect() {
    this.socket = new WebSocket(
      `wss://${process.env.DOMAIN}:${process.env.PORT}`
    );

    this.socket.onmessage = (event) => {
      const { game, error } = JSON.parse(event.data);
      this.game = game;
      this.error = error;
    };
  }

  send(message) {
    this.socket.send(JSON.stringify(message));
  }

  render() {
    if (!this.game) {
      return html`<p>Loading ...</p>`;
    }

    return html`
      <div id="container">
        <div id="board"></div>
        <div id="seats">
          ${this.game.seats.map(
            (seat, index) =>
              html`<div id="seat">
                ${seat.empty
                  ? html`<button
                      @click="${() =>
                        this.send({ action: "sit", seat: index })}"
                    >
                      Seat here
                    </button>`
                  : "Seated"}
              </div>`
          )}
        </div>
      </div>
      <span id="actions">
        <input
          type="range"
          min="20"
          max="100"
          value="${this.amount}"
          @change=${(e) => (this.amount = e.target.value)}
        />
        <button
          @click="${() => this.send({ action: "buyIn", amount: this.amount })}"
        >
          Buy-in
        </button>
      </span>
      <span id="connection-status">
        ${this.socket.readyState === 0 ? "Connecting ..." : ""}
        ${this.socket.readyState === 1 ? "Connected" : ""}
        ${this.socket.readyState === 2 ? "Closing ..." : ""}
        ${this.socket.readyState === 4 ? "Closed" : ""}
      </span>
    `;
  }
}
customElements.define("phg-game", Game);
