import { css } from "lit";

/** @typedef {import('../backend/poker/types.js').Cents} Cents */

/**
 * Base styles shared by all components
 */
export const baseStyles = css`
  :host {
    font-family: "Press Start 2P", monospace;
    image-rendering: pixelated;
    user-select: none;
  }
`;

/**
 * Layout styles for full-page shell views (lobby, profile, etc.)
 */
export const shellPageStyles = css`
  :host {
    display: flex;
    flex-direction: column;
    background: var(--color-bg-medium);
    color: var(--color-fg-medium);
    box-sizing: border-box;
  }

  :host * {
    box-sizing: inherit;
  }

  .main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: clamp(12px, 3vw, 32px);
    background: var(--color-bg-medium);
    overflow-y: auto;
  }
`;

/**
 * Shared content blocks for shell-style pages.
 */
export const shellContentStyles = css`
  .content {
    width: min(var(--shell-content-width, 1080px), 100%);
    max-width: 100%;
    display: grid;
    gap: 16px;
  }

  .panel {
    width: 100%;
    max-width: 100%;
    display: grid;
    gap: 16px;
    padding: clamp(18px, 4vw, 28px);
    box-sizing: border-box;
    border: var(--space-sm) solid var(--color-fg-muted);
    background: var(--color-bg-light);
    box-shadow: var(--space-md) var(--space-md) 0 var(--color-bg-dark);
  }

  .section {
    display: grid;
    gap: 12px;
  }

  .stat {
    display: grid;
    gap: 8px;
    align-content: start;
    padding: 14px;
    border: 2px solid var(--color-bg-dark);
    background: var(--color-bg-medium);
  }

  .label {
    font-size: var(--font-sm);
    color: var(--color-fg-muted);
    line-height: 1.6;
  }
`;

/**
 * Shared table chrome for data-heavy component views.
 */
export const dataTableStyles = css`
  .table-wrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    min-width: var(--data-table-min-width, 0);
    border-collapse: collapse;
  }

  th,
  td {
    padding: var(--data-table-cell-padding, var(--space-md) var(--space-lg));
    text-align: left;
    font-size: var(--font-sm);
  }

  th {
    color: var(--color-fg-muted);
    border-bottom: 2px solid
      var(--data-table-header-border-color, var(--color-fg-muted));
    white-space: nowrap;
  }

  td {
    color: var(--color-fg-medium);
    border-bottom: 1px solid var(--color-bg-dark);
  }

  tbody tr:last-child td {
    border-bottom: 0;
  }

  @media (width < 800px) {
    th,
    td {
      padding: var(
        --data-table-mobile-cell-padding,
        var(--space-sm) var(--space-md)
      );
    }
  }
`;

/**
 * Shared boxed feedback states inside component panels.
 */
export const feedbackStateStyles = css`
  .empty,
  .error {
    margin: 0;
    padding: 18px;
    border: 2px solid var(--color-bg-dark);
    background: var(--color-bg-medium);
    color: var(--color-fg-muted);
    font-size: var(--font-sm);
    line-height: 1.8;
  }

  .error {
    color: var(--color-error);
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
    gap: var(--space-md);
    padding: var(--space-md);
    border: none;
    background-color: transparent;
    box-shadow: none;
    box-sizing: border-box;
    width: min(560px, calc(100vw - 2 * var(--space-md)));
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

  .action-row {
    display: grid;
    grid-auto-columns: 1fr;
    grid-auto-flow: column;
    gap: var(--space-md);
    width: 100%;
  }

  .action-row phg-button {
    display: block;
    width: 100%;
  }

  .stacked {
    display: block;
    max-width: 100%;
    text-align: center;
    white-space: normal;
    line-height: 1.4;
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

export const seatBetStyles = css`
  .bet-indicator {
    position: absolute;
    display: flex;
    align-items: center;
    gap: var(--space-md);
    color: var(--color-primary);
    font-size: var(--font-md);
    white-space: nowrap;
    z-index: 1;
  }

  /* Seat 0: bottom right */
  :host([data-seat="0"]) .bet-indicator {
    bottom: -3em;
    right: 0;
  }

  /* Seat 1: bottom center */
  :host([data-seat="1"]) .bet-indicator {
    bottom: -3em;
    left: 50%;
    transform: translateX(-50%);
  }

  /* Seat 2: bottom left */
  :host([data-seat="2"]) .bet-indicator {
    bottom: -3em;
    left: 0;
  }

  /* Seat 3: left center */
  :host([data-seat="3"]) .bet-indicator {
    top: 50%;
    right: calc(100% + 1em);
    transform: translateY(-50%);
  }

  /* Seat 4: top left */
  :host([data-seat="4"]) .bet-indicator {
    top: -3em;
    left: -4em;
  }

  /* Seat 5: top center */
  :host([data-seat="5"]) .bet-indicator {
    top: -6em;
    left: 50%;
    transform: translateX(-50%);
  }

  /* Seat 6: top center */
  :host([data-seat="6"]) .bet-indicator {
    top: -5em;
    left: 50%;
    transform: translateX(-50%);
  }

  /* Seat 7: top right */
  :host([data-seat="7"]) .bet-indicator {
    top: -3em;
    right: -4em;
  }

  /* Seat 8: right center */
  :host([data-seat="8"]) .bet-indicator {
    top: 50%;
    left: calc(100% + 1em);
    transform: translateY(-50%);
  }

  /* === HEADS UP BET POSITIONING === */
  :host([data-table-size="2"][data-seat="0"]) .bet-indicator {
    inset: -7em auto auto 50%;
    transform: translateX(-50%);
  }

  :host([data-table-size="2"][data-seat="1"]) .bet-indicator {
    inset: auto auto -3em 50%;
    transform: translateX(-50%);
  }

  /* === 6-MAX BET POSITIONING === */

  /* Left side seats - bet to the right */
  :host([data-table-size="6"][data-seat="0"]) .bet-indicator,
  :host([data-table-size="6"][data-seat="5"]) .bet-indicator {
    inset: 50% auto auto calc(100% + 1em);
    transform: translateY(-50%);
  }

  /* Right side seats - bet to the left */
  :host([data-table-size="6"][data-seat="2"]) .bet-indicator,
  :host([data-table-size="6"][data-seat="3"]) .bet-indicator {
    inset: 50% calc(100% + 1em) auto auto;
    transform: translateY(-50%);
  }

  :host([data-table-size="6"][data-seat="4"]) .bet-indicator {
    inset: -6em auto auto 50%;
    transform: translateX(-50%);
  }

  /* === MOBILE BET POSITIONING === */
  @media (width < 800px) {
    :host([data-seat="1"]) .bet-indicator {
      bottom: -2em;
      top: auto;
      left: 50%;
      transform: translateX(-50%);
    }

    :host([data-seat="0"]) .bet-indicator,
    :host([data-seat="7"]) .bet-indicator,
    :host([data-seat="8"]) .bet-indicator {
      inset: auto 0 -2em auto;
      transform: none;
    }

    :host([data-seat="2"]) .bet-indicator,
    :host([data-seat="3"]) .bet-indicator,
    :host([data-seat="4"]) .bet-indicator {
      inset: auto auto -2em 0;
      transform: none;
    }

    :host([data-seat="6"]) .bet-indicator {
      inset: -4em 0 auto auto;
      transform: none;
    }

    :host([data-seat="5"]) .bet-indicator {
      inset: -4em auto auto 0;
      transform: none;
    }

    /* 6-MAX mobile overrides */
    :host([data-table-size="6"][data-seat="0"]) .bet-indicator,
    :host([data-table-size="6"][data-seat="5"]) .bet-indicator {
      inset: auto 0 -2em auto;
      transform: none;
    }
    :host([data-table-size="6"][data-seat="2"]) .bet-indicator,
    :host([data-table-size="6"][data-seat="3"]) .bet-indicator {
      inset: auto auto -2em 0;
      transform: none;
    }
  }
`;
