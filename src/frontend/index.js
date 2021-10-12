import * as COLORS from "./colors.js";
import {
  html,
  css,
  unsafeCSS,
  LitElement,
} from "https://cdn.skypack.dev/pin/lit@v2.0.0-fmIQPXLJVWh8dPhS7nD3/mode=imports/optimized/lit.js";

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
        top: 5%;
        left: 5%;
        height: 90%;
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
        left: 2.5%;
      }

      #seat:nth-child(5) {
        bottom: 5%;
        left: 40%;
      }

      #seat:nth-child(6) {
        bottom: 15%;
        right: 2.5%;
      }
    `;
  }

  static get properties() {
    return {
      game: { type: Object },
    };
  }

  constructor() {
    super();
  }

  render() {
    if (!this.game) {
      return html`<p>Loading ...</p>`;
    }

    return html`
      <div id="container">
        <div id="board"></div>
        <div id="seats">
          ${this.game.seats.map(() => html`<div id="seat"></div>`)}
        </div>
      </div>
    `;
  }
}
customElements.define("phg-game", Game);

const gameEl = document.getElementById("main");
const socket = new WebSocket("wss://localhost:8443");
socket.onmessage = function (event) {
  gameEl.game = JSON.parse(event.data);
};
