import { createHash } from "node:crypto";

const userRevisionCache = new WeakMap();

/**
 * @param {import('../shared/avatar.js').AvatarConfiguration} avatar - Canonical configuration from an input boundary.
 * @returns {string}
 */
export function getAvatarRevision(avatar) {
  return createHash("sha256")
    .update(JSON.stringify(avatar))
    .digest("base64url");
}

/**
 * @param {{ settings?: { avatar?: import('../shared/avatar.js').AvatarConfiguration } }} user
 * @returns {string|undefined}
 */
export function getUserAvatarRevision(user) {
  const avatar = user.settings?.avatar;
  if (avatar === undefined) return;
  const cached = userRevisionCache.get(user);
  if (cached?.avatar === avatar) return cached.revision;
  const revision = getAvatarRevision(avatar);
  userRevisionCache.set(user, { avatar, revision });
  return revision;
}
