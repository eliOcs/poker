/**
 * @param {unknown} data
 * @returns {string}
 */
function serializeWebSocketJson(data) {
  return JSON.stringify(data, undefined, 2);
}

/**
 * Sends JSON over a WebSocket unless the client has stopped draining data.
 * @param {import("ws").WebSocket} ws
 * @param {unknown} data
 * @returns {{ sent: boolean, payloadBytes: number }}
 */
export function sendWebSocketJson(ws, data) {
  const payload = serializeWebSocketJson(data);
  const payloadBytes = Buffer.byteLength(payload);
  if (ws.bufferedAmount + payloadBytes > MAX_WEBSOCKET_BUFFERED_BYTES) {
    logger.warn("ws send buffer exceeded", {
      websocket: {
        bufferedBytes: ws.bufferedAmount,
        payloadBytes,
        maxBufferedBytes: MAX_WEBSOCKET_BUFFERED_BYTES,
      },
    });
    ws.terminate();
    return { sent: false, payloadBytes };
  }

  ws.send(payload);
  return { sent: true, payloadBytes };
}
import * as logger from "./logger.js";

export const MAX_WEBSOCKET_BUFFERED_BYTES = 256 * 1024;
