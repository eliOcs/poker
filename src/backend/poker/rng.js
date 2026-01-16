/**
 * Random number generator module
 * Uses Math.random by default, but can be seeded via RNG_SEED env var
 */

import * as logger from "../logger.js";

/**
 * Mulberry32 - Simple, fast seeded PRNG
 * @param {number} seed
 * @returns {function(): number} Returns number in [0, 1)
 */
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** @type {function(): number} */
let random = Math.random;

// If RNG_SEED is set, use seeded PRNG
if (process.env.RNG_SEED) {
  const seed = parseInt(process.env.RNG_SEED, 10);
  if (!isNaN(seed)) {
    random = mulberry32(seed);
    logger.debug("using seeded PRNG", { seed });
  }
}

export { random };
