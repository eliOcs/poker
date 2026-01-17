import { css } from "lit";

/**
 * Design Tokens
 *
 * Constrained design system with:
 * - 3 font sizes (sm, md, lg)
 * - 3 spacing sizes (sm, md, lg)
 * - Semantic colors
 *
 * Tokens are responsive - values change at mobile breakpoint (<600px)
 */
export const designTokens = css`
  :host {
    /* Font sizes */
    --font-sm: 0.5em;
    --font-md: 0.7em;
    --font-lg: 1em;

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

    /* Colors - Foregrounds */
    --color-fg-muted: #88a;
    --color-fg-medium: #c0c0d0;
    --color-fg-light: #e0e0e8;
    --color-fg-white: #f0f0f0;
  }

  @media (width <= 599px) {
    :host {
      /* Smaller sizes for mobile */
      --font-sm: 0.45em;
      --font-md: 0.6em;
      --font-lg: 0.85em;

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
 * Format an amount in cents as currency using Intl.NumberFormat
 * @param {number} amountInCents - The amount in cents to format
 * @returns {string} - Formatted currency string (e.g., "$1.50", "$100.00")
 */
export function formatCurrency(amountInCents) {
  const dollars = amountInCents / 100;
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(dollars);
}
