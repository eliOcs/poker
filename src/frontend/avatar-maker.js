import { html, LitElement } from "lit";
import { drawAvatar, drawAvatarPartPreview } from "./avatar-drawing.js";
import {
  BACKGROUND_COLORS,
  DEFAULT_AVATAR,
  getAvatarColors as getColors,
} from "./avatar-maker-data.js";
import { configureAvatarMaker } from "./avatar-maker-controller.js";
import { ICONS } from "./icons.js";
import {
  COLORABLE_EYE_TYPES,
  getAvatarSpriteTypes,
} from "./avatar-sprite-data.js";

const TABS = [
  { id: "face", label: "Face" },
  { id: "eyes", label: "Eyes" },
  { id: "eyebrows", label: "Eyebrows" },
  { id: "nose", label: "Nose" },
  { id: "mouth", label: "Mouth" },
  { id: "ears", label: "Ears" },
  { id: "hair", label: "Hair" },
  { id: "facialHair", label: "Facial hair" },
  { id: "clothes", label: "Clothes", showStyles: false },
].map((tab) => ({ ...tab, types: getAvatarSpriteTypes(tab.id) }));

export { DEFAULT_AVATAR };

const ADJUSTMENTS = {
  face: [
    { key: "position", label: "Position", low: "Move up", high: "Move down" },
    {
      key: "horizontalPosition",
      label: "Horizontal position",
      low: "Move left",
      high: "Move right",
    },
    { key: "size", label: "Size", low: "Smaller", high: "Bigger" },
    {
      key: "rotation",
      label: "Rotation",
      low: "Rotate anticlockwise",
      high: "Rotate clockwise",
    },
  ],
  eyes: [
    { key: "position", label: "Position", low: "Move up", high: "Move down" },
    {
      key: "spacing",
      label: "Spacing",
      low: "Move closer",
      high: "Move apart",
    },
    {
      key: "rotation",
      label: "Rotation",
      low: "Rotate outward",
      high: "Rotate inward",
    },
    { key: "size", label: "Size", low: "Smaller", high: "Bigger" },
  ],
  eyebrows: [
    { key: "position", label: "Position", low: "Move up", high: "Move down" },
    {
      key: "spacing",
      label: "Spacing",
      low: "Move closer",
      high: "Move apart",
    },
    { key: "size", label: "Size", low: "Thinner", high: "Thicker" },
  ],
  nose: [
    { key: "position", label: "Position", low: "Move up", high: "Move down" },
    {
      key: "horizontalPosition",
      label: "Horizontal position",
      low: "Move left",
      high: "Move right",
    },
    { key: "size", label: "Size", low: "Smaller", high: "Bigger" },
  ],
  mouth: [
    { key: "position", label: "Position", low: "Move up", high: "Move down" },
    {
      key: "horizontalPosition",
      label: "Horizontal position",
      low: "Move left",
      high: "Move right",
    },
    { key: "size", label: "Size", low: "Smaller", high: "Bigger" },
  ],
  ears: [
    { key: "position", label: "Position", low: "Move up", high: "Move down" },
    {
      key: "spacing",
      label: "Spacing",
      low: "Move closer",
      high: "Move apart",
    },
    { key: "size", label: "Size", low: "Smaller", high: "Bigger" },
  ],
  hair: [
    { key: "position", label: "Position", low: "Move up", high: "Move down" },
    { key: "size", label: "Size", low: "Smaller", high: "Bigger" },
  ],
  facialHair: [
    { key: "position", label: "Position", low: "Move up", high: "Move down" },
    {
      key: "horizontalPosition",
      label: "Horizontal position",
      low: "Move left",
      high: "Move right",
    },
    { key: "size", label: "Size", low: "Smaller", high: "Bigger" },
  ],
  clothes: [],
};

const ADJUSTMENT_SYMBOLS = {
  position: [ICONS.up, ICONS.down],
  horizontalPosition: [ICONS.left, ICONS.right],
  spacing: ["→←", "←→"],
  rotation: ["↺", "↻"],
  size: [ICONS.minus, ICONS.plus],
};

class AvatarMaker extends LitElement {
  createRenderRoot() {
    return this;
  }

  static get properties() {
    return {
      activeTab: { type: String },
      avatar: { type: Object },
      canvasSize: { state: true },
    };
  }

  constructor() {
    super();
    this.activeTab = "face";
    this.avatar = cloneAvatar(DEFAULT_AVATAR);
    this.canvasSize = 360;
    this.assetsReady = configureAvatarMaker(this);
  }

  updated() {
    const canvas = this.querySelector("canvas");
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error("Avatar preview canvas not found");
    }
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Avatar preview canvas context unavailable");
    drawAvatar(context, this.avatar);

    this.querySelectorAll("canvas[data-part]").forEach((preview) => {
      if (!(preview instanceof HTMLCanvasElement)) {
        throw new Error("Avatar style preview canvas not found");
      }
      const partId = preview.dataset.part;
      const type = preview.dataset.type;
      if (!partId || !type) {
        throw new Error("Avatar style preview is missing part metadata");
      }
      const previewContext = preview.getContext("2d");
      if (!previewContext) {
        throw new Error("Avatar style preview canvas context unavailable");
      }
      drawAvatarPartPreview(previewContext, this.avatar, partId, type);
    });
  }

  render() {
    const tab = TABS.find(({ id }) => id === this.activeTab);
    if (!tab) throw new Error(`Unknown avatar maker tab: ${this.activeTab}`);
    const part = this.avatar[tab.id];

    return html`
      <main class="avatar-maker">
        <div class="avatar-maker__workspace">
          <section class="avatar-maker__preview" aria-label="Avatar preview">
            <div class="avatar-maker__canvas-frame">
              <canvas
                width=${this.canvasSize}
                height=${this.canvasSize}
                role="img"
                aria-label="Preview of your customized avatar"
              ></canvas>
            </div>
            <div class="avatar-maker__preview-actions">
              <button
                class="button button--muted button--compact"
                type="button"
                @click=${this.reset}
              >
                Reset
              </button>
              <button
                class="button button--action button--compact"
                type="button"
                @click=${this.randomize}
              >
                Randomize
              </button>
            </div>
          </section>

          <section
            class="avatar-maker__editor"
            aria-label="Avatar customization"
          >
            ${this.renderTabs()}
            <div
              class="avatar-maker__controls"
              role="tabpanel"
              aria-labelledby=${`avatar-tab-${tab.id}`}
            >
              ${tab.showStyles === false
                ? ""
                : html`
                    <div class="avatar-maker__options">
                      ${tab.types.map((type) =>
                        this.renderTypeOption(tab, type, part.type === type),
                      )}
                    </div>
                  `}
              <div class="avatar-maker__fine-tuning">
                <div class="avatar-maker__adjustments">
                  ${ADJUSTMENTS[tab.id].map((adjustment) =>
                    this.renderAdjustment(
                      tab.id,
                      adjustment,
                      part[adjustment.key],
                    ),
                  )}
                </div>
                ${this.renderColors(tab.id, part.color, part.type)}
                ${tab.id === "clothes" ? this.renderBackgroundColors() : ""}
              </div>
            </div>
          </section>
        </div>
      </main>
    `;
  }

  renderTabs() {
    return html`
      <div
        class="avatar-maker__tabs"
        role="tablist"
        aria-label="Avatar features"
      >
        ${TABS.map(
          (tab) => html`
            <button
              id=${`avatar-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected=${this.activeTab === tab.id ? "true" : "false"}
              tabindex=${this.activeTab === tab.id ? "0" : "-1"}
              @click=${() => {
                this.activeTab = tab.id;
              }}
              @keydown=${this.handleTabKeydown}
            >
              ${tab.label}
            </button>
          `,
        )}
      </div>
    `;
  }

  renderTypeOption(tab, type, selected) {
    return html`
      <button
        type="button"
        class=${`avatar-maker__option ${selected ? "is-selected" : ""}`}
        aria-pressed=${selected ? "true" : "false"}
        @click=${() => {
          this.updatePart(tab.id, "type", type);
        }}
      >
        <span
          class=${`avatar-maker__option-icon avatar-maker__option-icon--${toKebabCase(tab.id)}`}
          aria-hidden="true"
        >
          <canvas
            width="96"
            height="64"
            data-part=${tab.id}
            data-type=${type}
          ></canvas>
        </span>
        <span>${formatLabel(type)}</span>
      </button>
    `;
  }

  renderAdjustment(partId, adjustment, value) {
    return html`
      <div class="avatar-maker__adjustment">
        <span>${adjustment.label}</span>
        <div class="avatar-maker__stepper">
          <button
            type="button"
            aria-label=${`${adjustment.low} ${getTabLabel(partId)}`}
            ?disabled=${value <= -2}
            @click=${() => {
              this.updatePart(partId, adjustment.key, Math.max(-2, value - 1));
            }}
          >
            ${getAdjustmentSymbol(partId, adjustment.key, -1)}
          </button>
          <div
            class="avatar-maker__meter"
            role="group"
            aria-label=${`${adjustment.label}: ${value}`}
          >
            ${[-2, -1, 0, 1, 2].map(
              (step) =>
                html`<button
                  type="button"
                  class=${step === value ? "is-active" : ""}
                  aria-label=${`Set ${getTabLabel(partId)} ${adjustment.label.toLowerCase()} to ${step}`}
                  aria-pressed=${step === value}
                  @click=${() => {
                    this.updatePart(partId, adjustment.key, step);
                  }}
                ></button>`,
            )}
          </div>
          <button
            type="button"
            aria-label=${`${adjustment.high} ${getTabLabel(partId)}`}
            ?disabled=${value >= 2}
            @click=${() => {
              this.updatePart(partId, adjustment.key, Math.min(2, value + 1));
            }}
          >
            ${getAdjustmentSymbol(partId, adjustment.key, 1)}
          </button>
        </div>
      </div>
    `;
  }

  renderColors(partId, selectedColor, selectedType) {
    const colors = getColors(partId);
    if (
      !colors ||
      (partId === "eyes" && !COLORABLE_EYE_TYPES.includes(selectedType))
    ) {
      return "";
    }
    const label =
      partId === "face"
        ? "Skin color"
        : partId === "eyes"
          ? "Eye color"
          : partId === "clothes"
            ? "Clothes color"
            : "Hair color";
    return this.renderColorPalette(label, colors, selectedColor, (color) => {
      this.updatePart(partId, "color", color);
    });
  }

  renderBackgroundColors() {
    return this.renderColorPalette(
      "Background color",
      BACKGROUND_COLORS,
      this.avatar.background.color,
      (color) => {
        this.updatePart("background", "color", color);
      },
    );
  }

  renderColorPalette(label, colors, selectedColor, selectColor) {
    return html`
      <fieldset class="avatar-maker__colors">
        <legend>${label}</legend>
        <div>
          ${colors.map(
            (color, index) => html`
              <button
                type="button"
                class=${color === selectedColor ? "is-selected" : ""}
                style=${`--swatch-color: ${color}`}
                aria-label=${label === "Background color" ||
                label === "Clothes color"
                  ? `${label} ${index + 1}`
                  : `Color ${index + 1}`}
                aria-pressed=${color === selectedColor ? "true" : "false"}
                @click=${() => {
                  selectColor(color);
                }}
              ></button>
            `,
          )}
        </div>
      </fieldset>
    `;
  }

  updatePart(partId, property, value) {
    this.avatar = {
      ...this.avatar,
      [partId]: { ...this.avatar[partId], [property]: value },
    };
    this.emitChange();
  }

  reset() {
    this.avatar = cloneAvatar(DEFAULT_AVATAR);
    this.emitChange();
  }

  randomize() {
    const avatar = cloneAvatar(DEFAULT_AVATAR);
    for (const tab of TABS) {
      avatar[tab.id].type =
        tab.types[Math.floor(Math.random() * tab.types.length)];
      for (const adjustment of ADJUSTMENTS[tab.id]) {
        avatar[tab.id][adjustment.key] = Math.floor(Math.random() * 3) - 1;
      }
      const colors = getColors(tab.id);
      if (colors)
        avatar[tab.id].color =
          colors[Math.floor(Math.random() * colors.length)];
    }
    avatar.background.color =
      BACKGROUND_COLORS[Math.floor(Math.random() * BACKGROUND_COLORS.length)];
    this.avatar = avatar;
    this.emitChange();
  }

  emitChange() {
    this.dispatchEvent(
      new CustomEvent("avatar-changed", {
        detail: { avatar: cloneAvatar(this.avatar) },
        bubbles: true,
      }),
    );
  }

  handleTabKeydown(event) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = TABS.findIndex(({ id }) => id === this.activeTab);
    if (currentIndex < 0) {
      throw new Error(`Unknown avatar maker tab: ${this.activeTab}`);
    }
    const nextIndex = getNextTabIndex(event.key, currentIndex);
    const nextTab = TABS[nextIndex];
    if (!nextTab)
      throw new Error(`Avatar maker tab index out of range: ${nextIndex}`);
    this.activeTab = nextTab.id;
    this.updateComplete.then(() => {
      const tab = /** @type {HTMLElement | null} */ (
        this.querySelector(`#avatar-tab-${this.activeTab}`)
      );
      if (!tab)
        throw new Error(
          `Avatar maker tab element not found: ${this.activeTab}`,
        );
      tab.focus();
    });
  }
}

function getNextTabIndex(key, currentIndex) {
  if (key === "Home") return 0;
  if (key === "End") return TABS.length - 1;
  const direction = key === "ArrowRight" ? 1 : -1;
  return (currentIndex + direction + TABS.length) % TABS.length;
}

function getTabLabel(partId) {
  const tab = TABS.find(({ id }) => id === partId);
  if (!tab) throw new Error(`Unknown avatar maker part: ${partId}`);
  return tab.label;
}

function getAdjustmentSymbol(partId, key, direction) {
  const symbols =
    key === "rotation" && partId === "eyes"
      ? ["↻↺", "↺↻"]
      : ADJUSTMENT_SYMBOLS[key];
  return symbols[direction < 0 ? 0 : 1];
}

function cloneAvatar(avatar) {
  return structuredClone(avatar);
}

function formatLabel(value) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function toKebabCase(value) {
  return value.replace(/([A-Z])/g, "-$1").toLowerCase();
}

customElements.define("phg-avatar-maker", AvatarMaker);
