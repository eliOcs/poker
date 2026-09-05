const avatarRequests = new Map();

/**
 * Loads one public avatar configuration per player revision.
 *
 * @param {string} playerId
 * @param {string} revision
 * @returns {Promise<object>}
 */
export function loadPlayerAvatar(playerId, revision) {
  const key = `${playerId}:${revision}`;
  const cached = avatarRequests.get(key);
  if (cached) return cached;

  const request = fetch(`/api/players/${encodeURIComponent(playerId)}/avatar`)
    .then(async (response) => {
      if (!response.ok) throw new Error("Unable to load player avatar");
      const data = await response.json();
      if (data.revision !== revision || !data.avatar) {
        throw new Error("Player avatar revision changed while loading");
      }
      return data.avatar;
    })
    .catch((error) => {
      avatarRequests.delete(key);
      throw error;
    });
  avatarRequests.set(key, request);
  return request;
}
