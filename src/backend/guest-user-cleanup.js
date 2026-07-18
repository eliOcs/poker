import * as logger from "./logger.js";
import * as Store from "./store.js";

export const GUEST_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const GUEST_CLEANUP_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Deletes expired orphan guests from persistent and in-memory storage.
 * @param {Record<string, import('./user.js').User>} users
 * @param {number} [now]
 * @returns {number}
 */
export function cleanupOrphanGuestUsers(users, now = Date.now()) {
  const cutoff = new Date(now - GUEST_RETENTION_MS).toISOString();
  const deletedIds = Store.deleteOrphanGuestUsersCreatedBefore(cutoff);
  for (const id of deletedIds) {
    delete users[id];
  }
  logger.info("guest_cleanup", { cutoff, deletedCount: deletedIds.length });
  return deletedIds.length;
}
