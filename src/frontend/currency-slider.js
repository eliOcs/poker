import { html, css, LitElement } from "lit";
import { designTokens, baseStyles } from "./styles.js";
import "./button.js";

/**
 * Reusable currency slider component
 * - Displays dollars in the number input
 * - Uses cents internally for precise calculations
 * - Emits value-changed events with cents
 */
class CurrencySlider extends LitElement {
  static get styles() {
    return [
      designTokens,
      baseStyles,
      css`
        :host {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-md);
        }

        input[type="number"] {
          width: 80px;
          padding: var(--space-sm);
          font-family: inherit;
          font-size: var(--font-sm);
          text-align: center;
          border: 2px solid var(--color-bg-dark);
          background: var(--color-bg-disabled);
          color: var(--color-fg-white);
          line-height: 2;
          appearance: textfield;
        }

        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          appearance: none;
          margin: 0;
        }

        input[type="range"] {
          flex: 1;
          height: var(--space-md);
          appearance: none;
          background: var(--color-bg-disabled);
          border: 2px solid var(--color-bg-dark);
          min-width: 80px;
        }

        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: var(--space-lg);
          height: var(--space-lg);
          background: var(--color-primary);
          border: 2px solid var(--color-bg-dark);
          cursor: pointer;
        }
      `,
    ];
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
      <input
        type="number"
        min="${minDollars}"
        max="${maxDollars}"
        step="0.01"
        .value="${displayValue}"
        @input=${this._handleNumberInput}
      />
      <phg-button variant="muted" size="compact" @click=${this._handleDecrement}
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
      <phg-button variant="muted" size="compact" @click=${this._handleIncrement}
        >+</phg-button
      >
    `;
  }
}

customElements.define("phg-currency-slider", CurrencySlider);
