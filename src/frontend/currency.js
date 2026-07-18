/** @typedef {import('../backend/poker/types.js').Cents} Cents */

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
 * Omits decimals when the amount is a whole dollar
 * @param {Cents} amount
 * @returns {string} - Formatted number string (e.g., "1.50", "100")
 */
export function formatDollars(amount) {
  const dollars = amount / 100;
  return hasCents(amount) ? dollars.toFixed(2) : dollars.toFixed(0);
}
