/**
 * @typedef {import('./types.js').Cents} Cents
 */

import { PRESETS, DEFAULT } from "../../shared/stakes.js";

// Re-export stakes presets from shared module
export { PRESETS, DEFAULT };

/**
 * Validates if blinds match a preset
 * @param {{ small: Cents, big: Cents }} blinds
 * @returns {boolean}
 */
export function isValidPreset(blinds) {
  return PRESETS.some((p) => p.small === blinds.small && p.big === blinds.big);
}
