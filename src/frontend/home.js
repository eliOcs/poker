import { html, css, LitElement } from "lit";
import { designTokens, baseStyles } from "./styles.js";
import "./button.js";

const STAKES_PRESETS = [
  { label: "$0.01/$0.02", small: 0.01, big: 0.02 },
  { label: "$0.02/$0.05", small: 0.02, big: 0.05 },
  { label: "$0.05/$0.10", small: 0.05, big: 0.1 },
  { label: "$0.10/$0.25", small: 0.1, big: 0.25 },
  { label: "$0.25/$0.50", small: 0.25, big: 0.5 },
  { label: "$0.50/$1", small: 0.5, big: 1 },
  { label: "$1/$2", small: 1, big: 2 },
  { label: "$2/$4", small: 2, big: 4 },
  { label: "$3/$6", small: 3, big: 6 },
  { label: "$5/$10", small: 5, big: 10 },
  { label: "$10/$20", small: 10, big: 20 },
];

const DEFAULT_STAKES = STAKES_PRESETS[6]; // $1/$2

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

        .stakes-selector {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-sm);
          margin-bottom: 2em;
        }

        .stakes-label {
          font-size: var(--font-sm);
          color: var(--color-fg-muted);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        select {
          font-family: inherit;
          font-size: var(--font-md);
          padding: var(--space-sm) var(--space-md);
          background: var(--color-bg-light);
          color: var(--color-fg-white);
          border: 2px solid var(--color-bg-dark);
          cursor: pointer;
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
      selectedStakes: { type: Object },
    };
  }

  constructor() {
    super();
    this.creating = false;
    this.selectedStakes = DEFAULT_STAKES;
  }

  handleStakesChange(e) {
    const index = parseInt(e.target.value, 10);
    this.selectedStakes = STAKES_PRESETS[index];
  }

  async createGame() {
    this.creating = true;
    try {
      const response = await fetch("/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          small: this.selectedStakes.small,
          big: this.selectedStakes.big,
        }),
      });
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
    const selectedIndex = STAKES_PRESETS.findIndex(
      (s) =>
        s.small === this.selectedStakes.small &&
        s.big === this.selectedStakes.big,
    );

    return html`
      <img src="logo.png" alt="Pluton Poker" class="logo" />
      <p>Create a new game and invite your friends to play</p>
      <div class="stakes-selector">
        <span class="stakes-label">Stakes</span>
        <select @change=${this.handleStakesChange}>
          ${STAKES_PRESETS.map(
            (stakes, i) => html`
              <option value="${i}" ?selected=${i === selectedIndex}>
                ${stakes.label}
              </option>
            `,
          )}
        </select>
      </div>
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
