import * as COLORS from "./colors.js";
import { html, css, unsafeCSS, LitElement } from "lit";

class Home extends LitElement {
  static get styles() {
    return css`
      :host {
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background-color: ${unsafeCSS(COLORS.bgMedium)};
        font-family: "Press Start 2P", monospace;
        color: ${unsafeCSS(COLORS.fgMedium)};
        image-rendering: pixelated;
      }

      .logo {
        max-width: 450px;
        margin-bottom: 2em;
        image-rendering: pixelated;
      }

      p {
        font-size: 0.7em;
        line-height: 1.8;
        color: ${unsafeCSS(COLORS.fgDark)};
        margin-bottom: 2em;
        text-align: center;
        padding: 0 1em;
      }

      button {
        padding: 16px 32px;
        font-family: "Press Start 2P", monospace;
        font-size: 0.9em;
        cursor: pointer;
        border: 4px solid ${unsafeCSS(COLORS.bgDark)};
        background-color: ${unsafeCSS(COLORS.gold)};
        color: ${unsafeCSS(COLORS.bgDark)};
        box-shadow:
          4px 4px 0 ${unsafeCSS(COLORS.bgDark)},
          inset -2px -2px 0 ${unsafeCSS(COLORS.orange)},
          inset 2px 2px 0 ${unsafeCSS(COLORS.fgWhite)};
      }

      button:hover {
        background-color: ${unsafeCSS(COLORS.orange)};
      }

      button:active {
        box-shadow:
          2px 2px 0 ${unsafeCSS(COLORS.bgDark)},
          inset 2px 2px 0 ${unsafeCSS(COLORS.orange)},
          inset -2px -2px 0 ${unsafeCSS(COLORS.fgWhite)};
        transform: translate(2px, 2px);
      }

      button:disabled {
        background-color: ${unsafeCSS(COLORS.bgDisabled)};
        color: ${unsafeCSS(COLORS.fgDark)};
        cursor: not-allowed;
        box-shadow: 4px 4px 0 ${unsafeCSS(COLORS.bgDark)};
      }
    `;
  }

  static get properties() {
    return {
      creating: { type: Boolean },
    };
  }

  constructor() {
    super();
    this.creating = false;
  }

  async createGame() {
    this.creating = true;
    try {
      const response = await fetch("/games", { method: "POST" });
      const { id } = await response.json();
      window.location.href = `/games/${id}`;
    } catch (err) {
      console.error("Failed to create game:", err);
      this.creating = false;
    }
  }

  render() {
    return html`
      <img src="logo.png" alt="Pluton Poker" class="logo" />
      <p>Create a new game and invite your friends to play</p>
      <button @click=${this.createGame} ?disabled=${this.creating}>
        ${this.creating ? "Creating..." : "Create Game"}
      </button>
    `;
  }
}

customElements.define("phg-home", Home);
