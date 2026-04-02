import * as Id from "./id.js";

/**
 * @typedef {import('./id.js').Id} Id
 */

/**
 * @typedef {object} UserSettings
 * @property {number} volume - Sound volume (0, 0.25, 0.75, or 1)
 * @property {boolean} vibration - Whether the device should vibrate
 */

/**
 * @typedef {object} User
 * @property {Id} id - Unique identifier
 * @property {string|undefined} name - Display name
 * @property {string|undefined} email - Verified sign-in email
 * @property {UserSettings} settings - User preferences
 */

/** @type {UserSettings} */
export const DEFAULT_SETTINGS = {
  volume: 0.75,
  vibration: true,
};

/**
 * Creates a new user with a unique ID
 * @returns {User}
 */
export function create() {
  return {
    id: Id.generate(),
    name: undefined,
    email: undefined,
    settings: { ...DEFAULT_SETTINGS },
  };
}
