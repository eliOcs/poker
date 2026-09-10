import { html, LitElement } from "lit";
import {
  BUYIN_PRESETS,
  DEFAULT_BUYIN,
  DEFAULT_TOURNAMENT_SPEED,
} from "../shared/tournament.js";
import { getMttPath } from "../shared/routes.js";
import {
  DEFAULT_TABLE_SIZE,
  dispatchNavigate,
  getSelectedTournamentSpeed,
  postCreate,
  renderCreatePage,
  renderPresetSelect,
  renderTableSizeSelect,
  renderTournamentSpeedSelect,
} from "./game-create-form.js";

class Tournaments extends LitElement {
  createRenderRoot() {
    return this;
  }

  static get properties() {
    return {
      creating: { type: Boolean },
      user: { type: Object },
      selectedBuyIn: { type: Object },
      selectedTableSize: { type: Number },
      selectedSpeed: { type: String },
    };
  }

  constructor() {
    super();
    this.creating = false;
    this.user = undefined;
    this.selectedBuyIn = DEFAULT_BUYIN;
    this.selectedTableSize = DEFAULT_TABLE_SIZE;
    this.selectedSpeed = DEFAULT_TOURNAMENT_SPEED;
  }

  isSignedUp() {
    return Boolean(this.user?.email);
  }

  requestSignUp() {
    this.dispatchEvent(
      new CustomEvent("open-sign-up", {
        bubbles: true,
      }),
    );
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

  handleSpeedChange(e) {
    this.selectedSpeed = getSelectedTournamentSpeed(e);
  }

  async createTournament() {
    if (!this.isSignedUp()) {
      this.requestSignUp();
      return;
    }

    this.creating = true;
    try {
      const { id } = await postCreate("/mtt", {
        type: "mtt",
        seats: this.selectedTableSize,
        buyIn: this.selectedBuyIn.amount,
        speed: this.selectedSpeed,
      });
      dispatchNavigate(this, getMttPath(id));
    } catch (err) {
      console.error("Failed to create tournament:", err);
      this.creating = false;
    }
  }

  render() {
    const buyInIndex = BUYIN_PRESETS.findIndex(
      (preset) => preset.amount === this.selectedBuyIn.amount,
    );
    return renderCreatePage(
      "Organize a multi-table tournament for a bigger group. Share the link, let players register, then start when you're ready.",
      html`
        ${renderPresetSelect({
          label: "Buy-In",
          options: BUYIN_PRESETS,
          selectedIndex: buyInIndex,
          onChange: this.handleBuyInChange,
        })}
        ${renderTableSizeSelect({
          selectedTableSize: this.selectedTableSize,
          onChange: this.handleTableSizeChange,
        })}
        ${renderTournamentSpeedSelect({
          selectedSpeed: this.selectedSpeed,
          onChange: this.handleSpeedChange,
          tooltipId: "mtt-speed-tooltip",
          rebuysEnabled: true,
          estimatePlayerCounts: [10, 20, 30],
        })}
        <div class="create-button-row">
          <button
            type="button"
            class="button button--primary button--large"
            ?disabled=${this.creating}
            @click=${() => this.createTournament()}
          >
            ${this.creating ? "Creating..." : "Create Tournament"}
          </button>
        </div>
      `,
    );
  }
}

customElements.define("phg-tournaments", Tournaments);
