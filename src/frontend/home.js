import { html, css, LitElement } from "lit";
import { designTokens, baseStyles } from "./styles.js";
import "./button.js";

class Home extends LitElement {
  static get styles() {
    return [
      designTokens,
      baseStyles,
      css`
        :host {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background-color: var(--color-bg-medium);
          color: var(--color-fg-medium);
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
          font-size: var(--font-md);
          line-height: 2;
          color: var(--color-fg-muted);
          margin-bottom: 2em;
          text-align: center;
          padding: 0 1em;
          max-width: 500px;
        }

        @media (width >= 600px) {
          .logo {
            width: 60%;
          }

          p {
            font-size: var(--font-md);
          }
        }
      `,
    ];
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
