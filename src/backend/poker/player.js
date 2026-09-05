import { getUserAvatarRevision } from "../avatar.js";

/**
 * @typedef {import('./seat.js').Player} Player
 * @typedef {import('../user.js').User} User
 */

/**
 * Creates a Player from a User (extracts only id and name for in-game use)
 * @param {User} user
 * @returns {Player}
 */
export function fromUser(user) {
  const avatarRevision = getUserAvatarRevision(user);
  return {
    id: user.id,
    name: user.name,
    ...(avatarRevision ? { avatarRevision } : {}),
  };
}
