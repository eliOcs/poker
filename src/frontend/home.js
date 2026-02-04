import { html, css, LitElement } from "lit";
import { designTokens, baseStyles } from "./styles.js";
import "./button.js";
import {
  PRESETS as STAKES_PRESETS,
  DEFAULT as DEFAULT_STAKES,
} from "/src/shared/stakes.js";

const TABLE_SIZES = [
  { seats: 2, label: "Heads-Up" },
  { seats: 6, label: "6-Max" },
  { seats: 9, label: "9-Max" },
];
const DEFAULT_TABLE_SIZE_CASH = 6;
const DEFAULT_TABLE_SIZE_TOURNAMENT = 6;

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

        .game-type-selector {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-sm);
          margin-bottom: 2em;
        }

        .radio-group {
          display: flex;
          gap: var(--space-md);
        }

        .radio-group label {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          cursor: pointer;
          font-size: var(--font-md);
          padding: var(--space-sm) var(--space-md);
          background: var(--color-bg-light);
          border: 2px solid var(--color-bg-dark);
          transition: border-color 0.2s;
        }

        .radio-group label:has(input:checked) {
          border-color: var(--color-accent);
        }

        .radio-group input[type="radio"] {
          appearance: none;
          width: 1em;
          height: 1em;
          border: 2px solid var(--color-fg-muted);
          border-radius: 50%;
          cursor: pointer;
        }

        .radio-group input[type="radio"]:checked {
          border-color: var(--color-accent);
          background: var(--color-accent);
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
      selectedGameType: { type: String },
      selectedStakes: { type: Object },
      selectedTableSize: { type: Number },
    };
  }

  constructor() {
    super();
    this.creating = false;
    this.selectedGameType = "cash";
    this.selectedStakes = DEFAULT_STAKES;
    this.selectedTableSize = DEFAULT_TABLE_SIZE_CASH;
  }

  handleGameTypeChange(e) {
    this.selectedGameType = e.target.value;
    // Update default table size based on game type
    if (this.selectedGameType === "tournament") {
      this.selectedTableSize = DEFAULT_TABLE_SIZE_TOURNAMENT;
    } else {
      this.selectedTableSize = DEFAULT_TABLE_SIZE_CASH;
    }
  }

  handleStakesChange(e) {
    const index = parseInt(e.target.value, 10);
    this.selectedStakes = STAKES_PRESETS[index];
  }

  handleTableSizeChange(e) {
    this.selectedTableSize = parseInt(e.target.value, 10);
  }

  async createGame() {
    this.creating = true;
    try {
      const body =
        this.selectedGameType === "tournament"
          ? {
              type: "tournament",
              seats: this.selectedTableSize,
            }
          : {
              type: "cash",
              small: this.selectedStakes.small,
              big: this.selectedStakes.big,
              seats: this.selectedTableSize,
            };

      const response = await fetch("/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
    const isTournament = this.selectedGameType === "tournament";

    return html`
      <img src="logo.png" alt="Pluton Poker" class="logo" />
      <p>Create a new game and invite your friends to play</p>
      <div class="game-type-selector">
        <span class="stakes-label">Game Type</span>
        <div class="radio-group">
          <label>
            <input
              type="radio"
              name="gameType"
              value="cash"
              ?checked=${!isTournament}
              @change=${this.handleGameTypeChange}
            />
            Cash
          </label>
          <label>
            <input
              type="radio"
              name="gameType"
              value="tournament"
              ?checked=${isTournament}
              @change=${this.handleGameTypeChange}
            />
            Sit & Go
          </label>
        </div>
      </div>
      ${!isTournament
        ? html`
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
          `
        : ""}
      <div class="stakes-selector">
        <span class="stakes-label">Table Size</span>
        <select @change=${this.handleTableSizeChange}>
          ${TABLE_SIZES.map(
            (size) => html`
              <option
                value="${size.seats}"
                ?selected=${size.seats === this.selectedTableSize}
              >
                ${size.label}
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
