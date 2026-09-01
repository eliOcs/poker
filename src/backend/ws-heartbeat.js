export const WEBSOCKET_HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * @param {import("ws").WebSocketServer} wss
 * @param {object} [options]
 * @param {(callback: () => void, delay: number) => NodeJS.Timeout} [options.setIntervalFn]
 * @param {(timer: NodeJS.Timeout) => void} [options.clearIntervalFn]
 * @param {(ws: import("ws").WebSocket) => void} [options.onTimeout]
 * @returns {NodeJS.Timeout}
 */
export function startWebSocketHeartbeat(
  wss,
  {
    setIntervalFn = setInterval,
    clearIntervalFn = clearInterval,
    onTimeout = () => {},
  } = {},
) {
  /** @type {WeakSet<import("ws").WebSocket>} */
  const responsiveSockets = new WeakSet();

  wss.on("connection", (ws) => {
    responsiveSockets.add(ws);
    ws.on("pong", () => responsiveSockets.add(ws));
  });

  const timer = setIntervalFn(() => {
    for (const ws of wss.clients) {
      if (!responsiveSockets.has(ws)) {
        onTimeout(ws);
        ws.terminate();
        continue;
      }

      responsiveSockets.delete(ws);
      ws.ping();
    }
  }, WEBSOCKET_HEARTBEAT_INTERVAL_MS);

  timer.unref();
  wss.on("close", () => {
    clearIntervalFn(timer);
  });
  return timer;
}
