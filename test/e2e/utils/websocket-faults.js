export const UNSTABLE_TOURNAMENT_LATENCY_MS = 150;
const DISCONNECT_AFTER_SERVER_FRAMES = 5;

/**
 * @typedef {object} ConnectionFaultStats
 * @property {number} connections
 * @property {number} forcedDisconnects
 * @property {number} forwardedGameActions
 */

/** @param {number} ms */
async function delay(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {import('@playwright/test').WebSocketRoute} target
 * @param {string|Buffer} message
 */
async function forwardWithLatency(target, message) {
  await delay(UNSTABLE_TOURNAMENT_LATENCY_MS);
  try {
    target.send(message);
  } catch {
    // A scheduled frame may outlive the intentionally interrupted socket.
  }
}

/**
 * Adds latency in both directions and interrupts the first table connection.
 * The route remains active after reconnects and table moves.
 * @param {import('./poker-player.js').PokerPlayer} player
 * @returns {Promise<ConnectionFaultStats>}
 */
export async function installUnstableTournamentConnection(player) {
  const stats = {
    connections: 0,
    forcedDisconnects: 0,
    forwardedGameActions: 0,
  };

  await player.page.routeWebSocket(
    /\/mtt\/[a-z0-9]+\/tables\/[a-z0-9]+$/,
    (browserSocket) => {
      stats.connections += 1;
      let receivedServerFrames = 0;
      const serverSocket = browserSocket.connectToServer();

      browserSocket.onMessage(async (message) => {
        if (typeof message === "string") {
          const data = JSON.parse(message);
          if (data.action && data.action !== "ping") {
            stats.forwardedGameActions += 1;
          }
        }
        await forwardWithLatency(serverSocket, message);
      });

      serverSocket.onMessage(async (message) => {
        receivedServerFrames += 1;
        if (
          stats.forcedDisconnects === 0 &&
          receivedServerFrames === DISCONNECT_AFTER_SERVER_FRAMES
        ) {
          stats.forcedDisconnects += 1;
          await browserSocket.close({
            code: 1012,
            reason: "Injected stress-test interruption",
          });
          return;
        }
        await forwardWithLatency(browserSocket, message);
      });
    },
  );

  return stats;
}

/**
 * @param {import('./poker-player.js').PokerPlayer} player
 * @param {ConnectionFaultStats} stats
 */
export async function waitForUnstableTournamentRecovery(player, stats) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (
      stats.forcedDisconnects === 1 &&
      stats.connections >= 2 &&
      (await player.isConnected())
    ) {
      return;
    }
    await delay(100);
  }
  throw new Error(
    `Unstable tournament player did not recover: ${JSON.stringify(stats)}`,
  );
}
