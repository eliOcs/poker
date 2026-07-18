import { html, LitElement } from "lit";
import {
  PRESETS as STAKES_PRESETS,
  DEFAULT as DEFAULT_STAKES,
} from "../shared/stakes.js";
import { BUYIN_PRESETS, DEFAULT_BUYIN } from "../shared/tournament.js";
import { getTablePath } from "../shared/routes.js";
import {
  DEFAULT_TABLE_SIZE,
  dispatchNavigate,
  postCreate,
  renderCreatePage,
  renderPresetSelect,
  renderTableSizeSelect,
} from "./game-create-form.js";

class Home extends LitElement {
  createRenderRoot() {
    return this;
  }

  static get properties() {
    return {
      creating: { type: Boolean },
      selectedGameType: { type: String },
      selectedStakes: { type: Object },
      selectedBuyIn: { type: Object },
      selectedTableSize: { type: Number },
    };
  }

  constructor() {
    super();
    this.creating = false;
    this.selectedGameType = "cash";
    this.selectedStakes = DEFAULT_STAKES;
    this.selectedBuyIn = DEFAULT_BUYIN;
    this.selectedTableSize = DEFAULT_TABLE_SIZE;
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

  async createGame() {
    this.creating = true;
    try {
      const endpoint = this.selectedGameType === "cash" ? "/cash" : "/sitngo";
      const { id, type } = await postCreate(
        endpoint,
        this.selectedGameType === "cash"
          ? {
              type: "cash",
              small: this.selectedStakes.small,
              big: this.selectedStakes.big,
              seats: this.selectedTableSize,
            }
          : {
              type: "sitngo",
              seats: this.selectedTableSize,
              buyIn: this.selectedBuyIn.amount,
            },
      );
      dispatchNavigate(
        this,
        getTablePath(type === "sitngo" ? "sitngo" : "cash", id),
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
    const buyInIndex = BUYIN_PRESETS.findIndex(
      (preset) => preset.amount === this.selectedBuyIn.amount,
    );
    const isCash = this.selectedGameType === "cash";

    return renderCreatePage(
      "Invite your friends to play a poker game, no sign up required.",
      html`
        <div class="game-type-selector">
          <span class="stakes-label">Game Type</span>
          <div class="radio-group">
            <label>
              <input
                type="radio"
                name="gameType"
                value="cash"
                ?checked=${isCash}
                @change=${this.handleGameTypeChange}
              />
              Cash
            </label>
            <label>
              <input
                type="radio"
                name="gameType"
                value="sitngo"
                ?checked=${this.selectedGameType === "sitngo"}
                @change=${this.handleGameTypeChange}
              />
              Sit & Go
            </label>
          </div>
        </div>
        ${isCash
          ? renderPresetSelect({
              label: "Stakes",
              options: STAKES_PRESETS,
              selectedIndex,
              onChange: this.handleStakesChange,
            })
          : renderPresetSelect({
              label: "Buy-In",
              options: BUYIN_PRESETS,
              selectedIndex: buyInIndex,
              onChange: this.handleBuyInChange,
            })}
        ${renderTableSizeSelect({
          selectedTableSize: this.selectedTableSize,
          onChange: this.handleTableSizeChange,
        })}
        <div class="create-button-row">
          <button
            type="button"
            class="button button--primary button--large"
            ?disabled=${this.creating}
            @click=${this.createGame}
          >
            ${this.creating ? "Creating..." : "Create Game"}
          </button>
        </div>
      `,
    );
  }
}

customElements.define("phg-home", Home);
