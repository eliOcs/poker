import { createHash } from "node:crypto";
import { canonicalizeAvatar } from "../shared/avatar.js";

const userRevisionCache = new WeakMap();

/**
 * @param {unknown} avatar
 * @returns {string}
 */
export function getAvatarRevision(avatar) {
  const canonicalAvatar = canonicalizeAvatar(avatar);
  return createHash("sha256")
    .update(JSON.stringify(canonicalAvatar))
    .digest("base64url");
}

/**
 * @param {{ settings?: { avatar?: unknown } }} user
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
