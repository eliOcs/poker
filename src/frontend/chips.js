import { html, css, LitElement } from "lit";
import { designTokens, baseStyles } from "./styles.js";
import { decomposeChips } from "/src/shared/stakes.js";

const MAX_PER_COLUMN = 8;

/** @type {Record<number, string>} */
const CHIP_COLORS = {
  1: "#e8e8e8",
  5: "#cc3333",
  10: "#3366cc",
  25: "#339933",
  50: "#dd7722",
  100: "#1a1a1a",
  500: "#8844aa",
  1000: "#ccaa22",
  2500: "#dd6699",
  5000: "#5599cc",
  10000: "#885533",
};

class Chips extends LitElement {
  static get styles() {
    return [
      designTokens,
      baseStyles,
      css`
        :host {
          display: inline-flex;
          align-items: flex-end;
          gap: var(--space-md);
        }

        .column {
          display: flex;
          flex-direction: column-reverse;
        }

        .chip {
          width: 16px;
          height: 4px;
          border: 1px solid color-mix(in srgb, var(--c), black 80%);
          background: linear-gradient(
            to right,
            color-mix(in srgb, var(--c), white 80%) 0px 2px,
            var(--c) 2px 6px,
            color-mix(in srgb, var(--c), white 80%) 6px 9px,
            var(--c) 9px 13px,
            color-mix(in srgb, var(--c), white 80%) 13px 15px
          );
          box-sizing: border-box;
        }
      `,
    ];
  }

  static get properties() {
    return {
      amount: { type: Number },
    };
  }

  render() {
    if (!this.amount || this.amount <= 0) return "";

    // Decompose into chips — result is largest-first
    const decomposed = decomposeChips(this.amount);

    // Flatten into individual chips (largest denom first = bottom of stack)
    const chips = [];
    for (const { denom, count } of decomposed) {
      for (let i = 0; i < count; i++) {
        chips.push(denom);
      }
    }

    // Split into columns
    const columns = [];
    for (let i = 0; i < chips.length; i += MAX_PER_COLUMN) {
      columns.push(chips.slice(i, i + MAX_PER_COLUMN));
    }

    return columns.map(
      (col) => html`
        <div class="column">
          ${col.map(
            (denom) =>
              html`<div class="chip" style="--c: ${CHIP_COLORS[denom]}"></div>`,
          )}
        </div>
      `,
    );
  }
}

customElements.define("phg-chips", Chips);
