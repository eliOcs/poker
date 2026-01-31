import * as Id from "./id.js";

/**
 * @typedef {import('./id.js').Id} Id
 */

/**
 * @typedef {object} UserSettings
 * @property {number} volume - Sound volume (0, 0.25, 0.75, or 1)
 */

/**
 * @typedef {object} User
 * @property {Id} id - Unique identifier
 * @property {string|null} name - Display name
 * @property {UserSettings} settings - User preferences
 */

/** @type {UserSettings} */
export const DEFAULT_SETTINGS = {
  volume: 0.75,
};

/**
 * Creates a new user with a unique ID
 * @returns {User}
 */
export function create() {
  return { id: Id.generate(), name: null, settings: { ...DEFAULT_SETTINGS } };
}
