import { css } from "lit";

/** @typedef {import('../backend/poker/types.js').Cents} Cents */

/**
 * Design Tokens
 *
 * Constrained design system with:
 * - 3 font sizes (sm, md, lg)
 * - 3 spacing sizes (sm, md, lg)
 * - Semantic colors
 *
 * Tokens are responsive - values change at mobile breakpoint (<800px)
 */
export const designTokens = css`
  :host {
    /* Font sizes */
    --font-sm: 10px;
    --font-md: 12px;
    --font-lg: 14px;

    /* Spacing */
    --space-sm: 4px;
    --space-md: 8px;
    --space-lg: 16px;

    /* Colors - Semantic */
    --color-primary: #f4a020;
    --color-secondary: #84a;
    --color-accent: #36c;
    --color-success: #3a5;
    --color-error: #c33;
    --color-warning: #e07020;
    --color-highlight: #c4a;

    /* Colors - Backgrounds */
    --color-bg-dark: #0f0f1a;
    --color-bg-medium: #1a1a2e;
    --color-bg-light: #2d2d44;
    --color-bg-disabled: #4a4a5e;
    --color-table: #2d5a27;
    --color-table-history: #622028;

    /* Colors - Foregrounds */
    --color-fg-muted: #88a;
    --color-fg-medium: #c0c0d0;
    --color-fg-light: #e0e0e8;
    --color-fg-white: #f0f0f0;
  }

  @media (width < 800px) {
    :host {
      /* Smaller sizes for mobile */
      --font-sm: 9px;
      --font-md: 10px;
      --font-lg: 12px;

      --space-sm: 3px;
      --space-md: 6px;
      --space-lg: 12px;
    }
  }
`;

/**
 * Base styles shared by all components
 */
export const baseStyles = css`
  :host {
    font-family: "Press Start 2P", monospace;
    image-rendering: pixelated;
  }
`;

/**
 * Check if an amount in cents has decimal cents
 * @param {Cents} amount
 * @returns {boolean} - True if there are cents (not a whole dollar)
 */
export function hasCents(amount) {
  return amount % 100 !== 0;
}

/**
 * Format an amount in cents as currency using Intl.NumberFormat
 * Omits decimals when the amount is a whole dollar (no cents)
 * @param {Cents} amount
 * @returns {string} - Formatted currency string (e.g., "$1.50", "$100")
 */
export function formatCurrency(amount) {
  const dollars = amount / 100;
  const hasDecimals = hasCents(amount);
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  });
  return formatter.format(dollars);
}

/**
 * Format an amount in cents as a dollar number string (no $ symbol)
 * Omits decimals when the amount is a whole dollar (no cents)
 * @param {Cents} amount
 * @returns {string} - Formatted number string (e.g., "1.50", "100")
 */
export function formatDollars(amount) {
  const dollars = amount / 100;
  return hasCents(amount) ? dollars.toFixed(2) : dollars.toFixed(0);
}

/**
 * Action panel component styles
 */
export const actionPanelStyles = css`
  :host {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: center;
    gap: var(--space-md);
    padding: var(--space-md);
    border: var(--space-sm) solid var(--color-fg-muted);
    background-color: var(--color-bg-light);
    box-shadow: var(--space-sm) var(--space-sm) 0 var(--color-bg-dark);
    box-sizing: border-box;
    width: min(560px, calc(100vw - 24px));
    min-height: 100px;
  }

  /* Betting panel styles */
  .betting-panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    width: 100%;
  }

  .slider-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-md);
  }

  .slider-row input[type="number"] {
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

  .slider-row input[type="number"]::-webkit-inner-spin-button,
  .slider-row input[type="number"]::-webkit-outer-spin-button {
    appearance: none;
    margin: 0;
  }

  .slider-row input[type="range"] {
    flex: 1;
    height: var(--space-md);
    appearance: none;
    background: var(--color-bg-disabled);
    border: 2px solid var(--color-bg-dark);
    min-width: 80px;
  }

  .slider-row input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: var(--space-lg);
    height: var(--space-lg);
    background: var(--color-primary);
    border: 2px solid var(--color-bg-dark);
    cursor: pointer;
  }

  .action-row,
  .simple-actions {
    display: grid;
    grid-auto-columns: 1fr;
    grid-auto-flow: column;
    gap: var(--space-md);
    width: 100%;
    align-items: stretch;
  }

  .share-buttons,
  .waiting-actions {
    display: flex;
    gap: var(--space-md);
    justify-content: center;
    width: 100%;
  }

  .action-row phg-button,
  .simple-actions phg-button {
    display: block;
    width: 100%;
    height: 100%;
  }

  .action-row .amount,
  .simple-actions .amount {
    font-size: var(--font-md);
  }

  .stacked {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-md);
  }

  .waiting {
    color: var(--color-fg-muted);
    font-size: var(--font-md);
    text-align: center;
  }

  .tournament-result {
    color: var(--color-fg);
    font-size: var(--font-lg);
    font-weight: bold;
  }

  .tournament-result.winner {
    color: var(--color-success);
  }

  .waiting-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-lg);
  }
`;
