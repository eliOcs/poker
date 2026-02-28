import { html, css, LitElement } from "lit";
import { designTokens, baseStyles } from "./styles.js";
/** @typedef {import("../backend/poker/types.js").Cents} Cents */

const MAX_PER_COLUMN = 8;
const TARGET_MAX_COLUMNS = 4;
const TARGET_MAX_CHIPS = MAX_PER_COLUMN * TARGET_MAX_COLUMNS;
const CHIP_DENOMINATION_BASES = [1, 5, 10, 25, 50];

/** @type {Record<Cents, { base: string, stripe: string }>} */
const CHIP_STYLES = {
  1: { base: "#e8e8e8", stripe: "#666666" },
  5: { base: "#cc3333", stripe: "#f6d74a" },
  10: { base: "#3366cc", stripe: "#f7efe0" },
  25: { base: "#339933", stripe: "#ffffff" },
  50: { base: "#dd7722", stripe: "#2c2c2c" },
  100: { base: "#1a1a1a", stripe: "#d94d4d" },
  500: { base: "#8844aa", stripe: "#8de5cf" },
  1000: { base: "#ccaa22", stripe: "#5a2d0c" },
  2500: { base: "#dd6699", stripe: "#1e6f63" },
  5000: { base: "#5599cc", stripe: "#f5c542" },
  10000: { base: "#885533", stripe: "#e8d3b9" },
  25000: { base: "#3366cc", stripe: "#f7efe0" },
  50000: { base: "#339933", stripe: "#ffffff" },
  100000: { base: "#dd7722", stripe: "#2c2c2c" },
  250000: { base: "#1a1a1a", stripe: "#d94d4d" },
  500000: { base: "#8844aa", stripe: "#8de5cf" },
  1000000: { base: "#ccaa22", stripe: "#5a2d0c" },
};

const KNOWN_CHIP_VALUES = Object.keys(CHIP_STYLES)
  .map(Number)
  .sort((a, b) => a - b);

/**
 * Build a display-focused denomination list that keeps very large amounts
 * around the target number of rendered chips.
 * @param {Cents} amount
 * @returns {Cents[]}
 */
function buildDisplayDenominations(amount) {
  const targetLargestDenomination = Math.max(
    10000,
    Math.ceil(amount / TARGET_MAX_CHIPS),
  );
  const maxTarget = targetLargestDenomination * 10;
  const denominations = new Set();
  let scale = 1;

  while (
    CHIP_DENOMINATION_BASES[CHIP_DENOMINATION_BASES.length - 1] * scale <=
    maxTarget
  ) {
    for (const base of CHIP_DENOMINATION_BASES) {
      denominations.add(base * scale);
    }
    scale *= 10;
  }

  return [...denominations].sort((a, b) => a - b);
}

/**
 * Decompose amount into display chip denominations using greedy algorithm.
 * @param {Cents} amount
 * @returns {Array<{denom: Cents, count: number}>}
 */
function decomposeDisplayChips(amount) {
  const denominations = buildDisplayDenominations(amount);
  const chips = [];
  let remaining = amount;

  for (let i = denominations.length - 1; i >= 0 && remaining > 0; i--) {
    const denom = denominations[i];
    const count = Math.floor(remaining / denom);
    if (count > 0) {
      chips.push({ denom, count });
      remaining -= denom * count;
    }
  }

  return chips;
}

/**
 * Resolve chip style for known and generated display denominations.
 * @param {Cents} denom
 * @returns {{ base: string, stripe: string }}
 */
function getChipStyle(denom) {
  if (CHIP_STYLES[denom]) {
    return CHIP_STYLES[denom];
  }
  for (let i = KNOWN_CHIP_VALUES.length - 1; i >= 0; i--) {
    const known = KNOWN_CHIP_VALUES[i];
    if (denom >= known) {
      return CHIP_STYLES[known];
    }
  }
  return CHIP_STYLES[1];
}

/**
 * Returns inline CSS variables for a denomination chip style.
 * @param {Cents} denom
 * @returns {string}
 */
function getChipInlineStyle(denom) {
  const { base, stripe } = getChipStyle(denom);
  return `--c: ${base}; --s: ${stripe}`;
}

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
          border: 1px solid color-mix(in srgb, var(--c), var(--s) 40%);
          background: linear-gradient(
            to right,
            var(--s) 0 2px,
            var(--c) 2px 6px,
            var(--s) 6px 9px,
            var(--c) 9px 13px,
            var(--s) 13px 15px
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

    // Decompose into display chips — result is largest-first
    const decomposed = decomposeDisplayChips(this.amount);

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
              html`<div
                class="chip"
                style="${getChipInlineStyle(denom)}"
              ></div>`,
          )}
        </div>
      `,
    );
  }
}

customElements.define("phg-chips", Chips);
