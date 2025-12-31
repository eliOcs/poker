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
        background-color: ${unsafeCSS(COLORS.base01)};
        font-family: system-ui, sans-serif;
        color: ${unsafeCSS(COLORS.base05)};
      }

      h1 {
        font-size: 3em;
        margin-bottom: 0.5em;
        color: ${unsafeCSS(COLORS.base07)};
      }

      p {
        font-size: 1.2em;
        color: ${unsafeCSS(COLORS.base04)};
        margin-bottom: 2em;
      }

      button {
        padding: 20px 40px;
        font-size: 1.5em;
        font-weight: bold;
        cursor: pointer;
        border: none;
        border-radius: 8px;
        background-color: ${unsafeCSS(COLORS.base0B)};
        color: white;
        transition: background-color 0.2s;
      }

      button:hover {
        background-color: ${unsafeCSS(COLORS.base0C)};
      }

      button:disabled {
        background-color: ${unsafeCSS(COLORS.base03)};
        cursor: not-allowed;
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
      <h1>Poker Home Games</h1>
      <p>Create a new game and invite your friends to play</p>
      <button @click=${this.createGame} ?disabled=${this.creating}>
        ${this.creating ? "Creating..." : "Create Game"}
      </button>
    `;
  }
}

customElements.define("phg-home", Home);
