/**
 * @param {unknown} data
 * @returns {string}
 */
function serializeWebSocketJson(data) {
  return JSON.stringify(data, null, 2);
}

/**
 * Sends JSON over a WebSocket and returns the payload size in bytes.
 * @param {import("ws").WebSocket} ws
 * @param {unknown} data
 * @returns {number}
 */
export function sendWebSocketJson(ws, data) {
  const payload = serializeWebSocketJson(data);
  ws.send(payload);
  return Buffer.byteLength(payload);
}
