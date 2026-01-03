import * as COLORS from "./colors.js";
import { html, css, unsafeCSS, LitElement } from "lit";
import "./button.js";

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
        padding: 1em;
        box-sizing: border-box;
      }

      .logo {
        width: 80%;
        max-width: 450px;
        margin-bottom: 1.5em;
        image-rendering: pixelated;
      }

      p {
        font-size: 0.75em;
        line-height: 2;
        color: ${unsafeCSS(COLORS.fgDark)};
        margin-bottom: 2em;
        text-align: center;
        padding: 0 1em;
        max-width: 500px;
      }

      @media (min-width: 600px) {
        .logo {
          width: 60%;
        }

        p {
          font-size: 0.8em;
        }
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
      this.dispatchEvent(
        new CustomEvent("navigate", {
          detail: { path: `/games/${id}` },
          bubbles: true,
          composed: true,
        }),
      );
    } catch (err) {
      console.error("Failed to create game:", err);
      this.creating = false;
    }
  }

  render() {
    return html`
      <img src="logo.png" alt="Pluton Poker" class="logo" />
      <p>Create a new game and invite your friends to play</p>
      <phg-button
        variant="primary"
        size="large"
        ?disabled=${this.creating}
        @click=${this.createGame}
      >
        ${this.creating ? "Creating..." : "Create Game"}
      </phg-button>
    `;
  }
}

customElements.define("phg-home", Home);
