/**
 * @typedef {import('./poker/game.js').Game} Game
 * @typedef {import('./user.js').User} UserType
 */

export const DEFAULT_GAME_INACTIVITY_MS = 60 * 60 * 1000; // 1 hour
export const DEFAULT_EVICTION_INTERVAL_MS = 60 * 1000; // 1 minute

/**
 * @param {string|undefined} value
 * @param {number} fallback
 * @returns {number}
 */
function parsePositiveMs(value, fallback) {
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * @returns {number}
 */
export function getGameInactivityMs() {
  return parsePositiveMs(
    process.env.GAME_INACTIVITY_MS,
    DEFAULT_GAME_INACTIVITY_MS,
  );
}

/**
 * @returns {number}
 */
export function getGameEvictionIntervalMs() {
  return parsePositiveMs(
    process.env.GAME_EVICTION_INTERVAL_MS,
    DEFAULT_EVICTION_INTERVAL_MS,
  );
}

/**
 * @param {Map<import('ws').WebSocket, { user: UserType, gameId: string }>} clientConnections
 * @param {string} gameId
 * @returns {boolean}
 */
export function hasConnectedClientsForGame(clientConnections, gameId) {
  for (const [, conn] of clientConnections) {
    if (conn.gameId === gameId) {
      return true;
    }
  }
  return false;
}

/**
 * @typedef {object} TrackedActivity
 * @property {number} handNumber
 * @property {number} seenAt
 */

/**
 * Creates a coarse inactivity evictor that treats game movement as hand-number changes.
 * No millisecond-level action tracking is required.
 *
 * @param {number} [defaultInactivityMs]
 * @returns {(options: {
 *   games: Map<string, Game>,
 *   clientConnections: Map<import('ws').WebSocket, { user: UserType, gameId: string }>,
 *   logInfo: (message: string, context?: Record<string, unknown>) => void,
 *   now?: number,
 *   inactivityMs?: number
 * }) => number}
 */
export function createInactiveGameEvictor(
  defaultInactivityMs = getGameInactivityMs(),
) {
  /** @type {Map<string, TrackedActivity>} */
  const trackedByGameId = new Map();

  /**
   * @param {string} gameId
   * @param {Game} game
   * @param {number} now
   */
  function track(gameId, game, now) {
    trackedByGameId.set(gameId, { handNumber: game.handNumber, seenAt: now });
  }

  /**
   * @param {Map<string, Game>} games
   */
  function cleanupDeletedGames(games) {
    for (const trackedGameId of trackedByGameId.keys()) {
      if (!games.has(trackedGameId)) {
        trackedByGameId.delete(trackedGameId);
      }
    }
  }

  return function evictInactiveGames({
    games,
    clientConnections,
    logInfo,
    now = Date.now(),
    inactivityMs = defaultInactivityMs,
  }) {
    let evictedCount = 0;

    for (const [gameId, game] of games) {
      if (hasConnectedClientsForGame(clientConnections, gameId)) {
        track(gameId, game, now);
        continue;
      }

      const tracked = trackedByGameId.get(gameId);
      if (!tracked) {
        track(gameId, game, now);
        continue;
      }

      if (tracked.handNumber !== game.handNumber) {
        track(gameId, game, now);
        continue;
      }

      const idleMs = now - tracked.seenAt;
      if (idleMs < inactivityMs) {
        continue;
      }

      if (game.tickTimer) {
        clearInterval(game.tickTimer);
        game.tickTimer = null;
      }
      games.delete(gameId);
      trackedByGameId.delete(gameId);
      evictedCount += 1;

      logInfo("inactive game evicted", { gameId, idleMs, inactivityMs });
    }

    cleanupDeletedGames(games);
    return evictedCount;
  };
}
