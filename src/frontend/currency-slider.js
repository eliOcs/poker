import { html, LitElement } from "lit";
import { formatDollars } from "./currency.js";

/**
 * Reusable currency slider component
 * - Displays dollars in the number input
 * - Uses cents internally for precise calculations
 * - Emits value-changed events with cents
 * - Labeled handles display action frequencies in whole percentage points
 */
class CurrencySlider extends LitElement {
  createRenderRoot() {
    return this;
  }

  static get properties() {
    return {
      value: { type: Number }, // Current value in cents
      min: { type: Number }, // Min value in cents
      max: { type: Number }, // Max value in cents
      step: { type: Number }, // Step for +/- buttons in cents
      label: { type: String },
      handleLabel: { type: String },
      variant: { type: String },
    };
  }

  constructor() {
    super();
    this.value = 0;
    this.min = 0;
    this.max = 100;
    this.step = 1;
    this.label = "Amount";
    this.handleLabel = "";
    this.variant = "primary";
  }

  _clamp(value) {
    return Math.max(this.min, Math.min(this.max, value));
  }

  _emitChange(newValue) {
    const clamped = this._clamp(newValue);
    if (clamped !== this.value) {
      this.dispatchEvent(
        new CustomEvent("value-changed", {
          detail: { value: clamped },
          bubbles: true,
        }),
      );
    }
  }

  _handleNumberInput(e) {
    // Input is in dollars, convert to cents
    const dollars = parseFloat(e.target.value) || 0;
    const cents = Math.round(dollars * 100);
    this._emitChange(cents);
  }

  _handleRangeInput(e) {
    // Range is in cents
    let cents = parseInt(e.target.value) || 0;
    // Snap to max if within one step (handles non-divisible max values)
    if (this.max - cents < this.step && cents !== this.max) {
      cents = this.max;
    }
    this._emitChange(cents);
  }

  _handleDecrement() {
    this._emitChange(this.value - this.step);
  }

  _handleIncrement() {
    this._emitChange(this.value + this.step);
  }

  renderLabeledHandle() {
    const ratio = (this.value - this.min) / (this.max - this.min);
    return html`<div class="labeled-slider" style=${`--slider-ratio: ${ratio}`}>
      <span
        class="button button--${this.variant} slider-handle"
        aria-hidden="true"
        >${this.handleLabel} ${this.value}%</span
      >
      <input
        type="range"
        aria-label=${this.label}
        aria-valuetext=${`${this.value}%`}
        min=${this.min}
        max=${this.max}
        step=${this.step}
        .value=${String(this.value)}
        @input=${this._handleRangeInput}
      />
    </div>`;
  }

  render() {
    if (this.handleLabel) return this.renderLabeledHandle();
    const displayValue = formatDollars(this.value);
    const minDollars = this.min / 100;
    const maxDollars = this.max / 100;
    const stepDollars = this.step / 100;

    return html`
      <input
        type="number"
        aria-label=${this.label}
        min="${minDollars}"
        max="${maxDollars}"
        step="${stepDollars}"
        .value="${displayValue}"
        @input=${this._handleNumberInput}
      />
      <button
        type="button"
        class="button button--muted button--compact"
        aria-label=${`Decrease ${this.label}`}
        @click=${this._handleDecrement}
      >
        -
      </button>
      <input
        type="range"
        aria-label=${this.label}
        min="${this.min}"
        max="${this.max}"
        step="${this.step}"
        .value="${this.value}"
        @input=${this._handleRangeInput}
      />
      <button
        type="button"
        class="button button--muted button--compact"
        aria-label=${`Increase ${this.label}`}
        @click=${this._handleIncrement}
      >
        +
      </button>
    `;
  }
}

customElements.define("phg-currency-slider", CurrencySlider);
