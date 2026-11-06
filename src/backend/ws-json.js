import * as logger from "./logger.js";
import { getSessionPlayerLogContext } from "./logger.js";

export const MAX_WEBSOCKET_BUFFERED_BYTES = 256 * 1024;

/**
 * @typedef {{ user: import('./user.js').User, gameId?: string, tournamentId?: string }} ClientConn
 */

/**
 * Builds the game and player context for a WebSocket connection's logs.
 * @param {ClientConn} conn
 */
export function getConnectionLogContext(conn) {
  return {
    game: {
      tableId: conn.gameId,
      ...(conn.tournamentId && { tournamentId: conn.tournamentId }),
    },
    ...getSessionPlayerLogContext(conn.user),
  };
}

/**
 * Sends JSON over a WebSocket unless the client has stopped draining data.
 * @param {import("ws").WebSocket} ws
 * @param {ClientConn} conn
 * @param {unknown} data
 * @returns {{ sent: boolean, payloadBytes: number }}
 */
export function sendWebSocketJson(ws, conn, data) {
  const payload = JSON.stringify(data);
  const payloadBytes = Buffer.byteLength(payload);
  if (ws.bufferedAmount + payloadBytes > MAX_WEBSOCKET_BUFFERED_BYTES) {
    logger.warn("ws send buffer exceeded", {
      ...getConnectionLogContext(conn),
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
