import { html, css, LitElement } from "lit";
import { designTokens, baseStyles } from "./styles.js";
import { renderAppNavigationDrawer } from "./app-navigation-drawer.js";
import "./button.js";
import {
  PRESETS as STAKES_PRESETS,
  DEFAULT as DEFAULT_STAKES,
} from "../shared/stakes.js";
import { BUYIN_PRESETS, DEFAULT_BUYIN } from "../shared/tournament.js";

const TABLE_SIZES = [
  { seats: 2, label: "Heads-Up" },
  { seats: 6, label: "6-Max" },
  { seats: 9, label: "Full Ring" },
];
const DEFAULT_TABLE_SIZE = 6;

class Home extends LitElement {
  static get styles() {
    return [
      designTokens,
      baseStyles,
      css`
        :host {
          min-height: 100vh;
          display: block;
          background-color: var(--color-bg-medium);
          color: var(--color-fg-medium);
          box-sizing: border-box;
        }

        :host * {
          box-sizing: inherit;
        }

        .layout {
          min-height: 100vh;
          display: flex;
          background: var(--color-bg-dark);
        }

        .main {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: clamp(16px, 3vw, 32px);
          background: var(--color-bg-medium);
        }

        .panel {
          width: min(720px, 100%);
          display: grid;
          justify-items: center;
          padding: clamp(24px, 5vw, 40px);
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
          color: var(--color-fg-medium);
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
          padding: var(--space-md);
          background: var(--color-bg-light);
          color: var(--color-fg-white);
          border: 2px solid var(--color-bg-disabled);
          cursor: pointer;
          accent-color: var(--color-secondary);
          outline: none;
        }

        select:focus {
          border-color: var(--color-secondary);
        }

        option {
          color: var(--color-fg-white);
          background: var(--color-bg-light);
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
          padding: var(--space-md);
          background: var(--color-bg-medium);
          border: 2px solid var(--color-bg-disabled);
          transition: border-color 0.2s;
        }

        .radio-group label:has(input:checked) {
          border-color: var(--color-secondary);
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
          border-color: var(--color-secondary);
          background: var(--color-secondary);
        }

        .create-button-row {
          width: min(100%, 320px);
          display: flex;
          justify-self: center;
          justify-content: center;
        }

        @media (width >= 600px) {
          .logo {
            width: 60%;
          }
        }

        @media (width < 800px) {
          .main {
            padding: 56px var(--space-md) var(--space-md);
          }

          .panel {
            width: 100%;
          }

          .radio-group {
            flex-direction: column;
            width: 100%;
          }

          .radio-group label,
          .create-button-row {
            width: 100%;
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
      selectedBuyIn: { type: Object },
      selectedTableSize: { type: Number },
      user: { type: Object },
      drawerOpen: { state: true },
    };
  }

  constructor() {
    super();
    this.creating = false;
    this.selectedGameType = "cash";
    this.selectedStakes = DEFAULT_STAKES;
    this.selectedBuyIn = DEFAULT_BUYIN;
    this.selectedTableSize = DEFAULT_TABLE_SIZE;
    this.user = null;
    this.drawerOpen = false;
    this._onMediaChange = (event) => {
      this.drawerOpen = event.matches;
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this._mql = window.matchMedia("(min-width: 800px)");
    this._mql.addEventListener("change", this._onMediaChange);
    this.drawerOpen = this._mql.matches;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._mql?.removeEventListener("change", this._onMediaChange);
  }

  handleGameTypeChange(e) {
    const target = /** @type {HTMLInputElement} */ (e.target);
    this.selectedGameType = target.value;
    this.selectedTableSize = DEFAULT_TABLE_SIZE;
  }

  handleStakesChange(e) {
    const target = /** @type {HTMLSelectElement} */ (e.target);
    const index = parseInt(target.value, 10);
    this.selectedStakes = STAKES_PRESETS[index] ?? this.selectedStakes;
  }

  handleBuyInChange(e) {
    const target = /** @type {HTMLSelectElement} */ (e.target);
    const index = parseInt(target.value, 10);
    this.selectedBuyIn = BUYIN_PRESETS[index] ?? this.selectedBuyIn;
  }

  handleTableSizeChange(e) {
    const target = /** @type {HTMLSelectElement} */ (e.target);
    this.selectedTableSize = parseInt(target.value, 10);
  }

  toggleDrawer() {
    this.drawerOpen = !this.drawerOpen;
  }

  openSettings() {
    if (!this._mql?.matches) {
      this.drawerOpen = false;
    }
    this.dispatchEvent(
      new CustomEvent("open-settings", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  openSignIn() {
    if (!this._mql?.matches) {
      this.drawerOpen = false;
    }
    this.dispatchEvent(
      new CustomEvent("open-sign-in", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  async createGame() {
    this.creating = true;
    try {
      const body =
        this.selectedGameType === "tournament"
          ? {
              type: "tournament",
              seats: this.selectedTableSize,
              buyIn: this.selectedBuyIn.amount,
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
      if (!response.ok) throw new Error(`${response.status}`);
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
      (stakes) =>
        stakes.small === this.selectedStakes.small &&
        stakes.big === this.selectedStakes.big,
    );
    const isTournament = this.selectedGameType === "tournament";

    return html`
      <div class="layout">
        ${renderAppNavigationDrawer({
          view: this,
          playActive: true,
        })}
        <main class="main">
          <section class="panel">
            <img src="logo.webp" alt="Pluton Poker" class="logo" />
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
                        (stakes, index) => html`
                          <option
                            value=${index}
                            ?selected=${index === selectedIndex}
                          >
                            ${stakes.label}
                          </option>
                        `,
                      )}
                    </select>
                  </div>
                `
              : html`
                  <div class="stakes-selector">
                    <span class="stakes-label">Buy-In</span>
                    <select @change=${this.handleBuyInChange}>
                      ${BUYIN_PRESETS.map(
                        (preset, index) => html`
                          <option
                            value=${index}
                            ?selected=${preset.amount ===
                            this.selectedBuyIn.amount}
                          >
                            ${preset.label}
                          </option>
                        `,
                      )}
                    </select>
                  </div>
                `}
            <div class="stakes-selector">
              <span class="stakes-label">Table Size</span>
              <select @change=${this.handleTableSizeChange}>
                ${TABLE_SIZES.map(
                  (size) => html`
                    <option
                      value=${size.seats}
                      ?selected=${size.seats === this.selectedTableSize}
                    >
                      ${size.label}
                    </option>
                  `,
                )}
              </select>
            </div>
            <div class="create-button-row">
              <phg-button
                variant="primary"
                size="large"
                ?disabled=${this.creating}
                @click=${this.createGame}
              >
                ${this.creating ? "Creating..." : "Create Game"}
              </phg-button>
            </div>
          </section>
        </main>
      </div>
    `;
  }
}

customElements.define("phg-home", Home);
