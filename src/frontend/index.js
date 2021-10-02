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
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        height: 100%;
        background-color: ${unsafeCSS(COLORS.base01)};
      }

      #board {
        height: 60%;
        width: 80%;
        display: block;
        background-color: ${unsafeCSS(COLORS.base0B)};
        border: 20px solid ${unsafeCSS(COLORS.base00)};
        border-radius: 90px;
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
    return html`<div id="board"></div>`;
  }
}
customElements.define("phg-game", Game);

const gameEl = document.getElementById("main");
const socket = new WebSocket("wss://localhost:8443");
socket.onmessage = function (event) {
  gameEl.game = JSON.parse(event.data);
};
