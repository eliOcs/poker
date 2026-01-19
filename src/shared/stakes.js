/**
 * Stakes presets shared between frontend and backend
 *
 * @typedef {object} Stakes
 * @property {string} label - Display label (e.g., "$1/$2")
 * @property {number} small - Small blind amount in cents
 * @property {number} big - Big blind amount in cents
 */

/**
 * Preset stakes options
 * @type {Stakes[]}
 */
export const PRESETS = [
  { label: "$0.01/$0.02", small: 1, big: 2 },
  { label: "$0.02/$0.05", small: 2, big: 5 },
  { label: "$0.05/$0.10", small: 5, big: 10 },
  { label: "$0.10/$0.25", small: 10, big: 25 },
  { label: "$0.25/$0.50", small: 25, big: 50 },
  { label: "$0.50/$1", small: 50, big: 100 },
  { label: "$1/$2", small: 100, big: 200 },
  { label: "$2/$4", small: 200, big: 400 },
  { label: "$3/$6", small: 300, big: 600 },
  { label: "$5/$10", small: 500, big: 1000 },
  { label: "$10/$20", small: 1000, big: 2000 },
];

/**
 * Default stakes ($1/$2)
 * @type {Stakes}
 */
export const DEFAULT = PRESETS[6];
