import { html, LitElement } from "lit";
import { designTokens, baseStyles, actionPanelStyles } from "./styles.js";
import "./button.js";

/**
 * Reusable currency slider component
 * - Displays dollars in the number input
 * - Uses cents internally for precise calculations
 * - Emits value-changed events with cents
 */
class CurrencySlider extends LitElement {
  static get styles() {
    return [designTokens, baseStyles, actionPanelStyles];
  }

  static get properties() {
    return {
      value: { type: Number }, // Current value in cents
      min: { type: Number }, // Min value in cents
      max: { type: Number }, // Max value in cents
      step: { type: Number }, // Step for +/- buttons in cents
    };
  }

  constructor() {
    super();
    this.value = 0;
    this.min = 0;
    this.max = 100;
    this.step = 1;
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
          composed: true,
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
    const cents = parseInt(e.target.value) || 0;
    this._emitChange(cents);
  }

  _handleDecrement() {
    this._emitChange(this.value - this.step);
  }

  _handleIncrement() {
    this._emitChange(this.value + this.step);
  }

  render() {
    const displayValue = (this.value / 100).toFixed(2);
    const minDollars = this.min / 100;
    const maxDollars = this.max / 100;

    return html`
      <div class="slider-row">
        <input
          type="number"
          min="${minDollars}"
          max="${maxDollars}"
          step="0.01"
          .value="${displayValue}"
          @input=${this._handleNumberInput}
        />
        <phg-button
          variant="muted"
          size="compact"
          @click=${this._handleDecrement}
          >-</phg-button
        >
        <input
          type="range"
          min="${this.min}"
          max="${this.max}"
          step="1"
          .value="${this.value}"
          @input=${this._handleRangeInput}
        />
        <phg-button
          variant="muted"
          size="compact"
          @click=${this._handleIncrement}
          >+</phg-button
        >
      </div>
    `;
  }
}

customElements.define("phg-currency-slider", CurrencySlider);
