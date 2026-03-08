import playerView from "./poker/player-view.js";
import * as Player from "./poker/player.js";

/**
 * @typedef {import('./user.js').User} UserType
 * @typedef {import('./poker/game.js').Game} Game
 * @typedef {import('./poker/game.js').BroadcastMessage} BroadcastMessage
 * @typedef {{ user: UserType, gameId: string }} ClientConn
 * @typedef {{ recipients: number, maxPayloadBytes: number }} BroadcastStats
 * @typedef {{
 *   gameId: string,
 *   msgType: "gameState"|"history"|"social",
 *   context?: Record<string, unknown>,
 *   buildPayload: (conn: ClientConn) => string|null
 * }} BroadcastDispatch
 */

/**
 * @param {Map<string, Game>} games
 * @param {Map<import('ws').WebSocket, ClientConn>} clientConnections
 */
export function createGameBroadcaster(games, clientConnections) {
  /**
   * @param {string} gameId
   * @param {(ws: import('ws').WebSocket, conn: ClientConn) => void} callback
   */
  function forEachGameClient(gameId, callback) {
    for (const [ws, conn] of clientConnections) {
      if (conn.gameId === gameId && ws.readyState === 1) {
        callback(ws, conn);
      }
    }
  }

  /**
   * @param {string} gameId
   * @param {(conn: ClientConn) => string|null} buildPayload
   * @returns {BroadcastStats}
   */
  function broadcastToGameClients(gameId, buildPayload) {
    let recipients = 0;
    let maxPayloadBytes = 0;
    forEachGameClient(gameId, (ws, conn) => {
      const payload = buildPayload(conn);
      if (payload !== null) {
        ws.send(payload);
        recipients += 1;
        maxPayloadBytes = Math.max(maxPayloadBytes, Buffer.byteLength(payload));
      }
    });
    return { recipients, maxPayloadBytes };
  }

  /**
   * @param {{ type: "gameState", gameId: string }} message
   * @returns {BroadcastDispatch}
   */
  function broadcastGameState(message) {
    const game = games.get(message.gameId);
    if (!game) {
      throw new Error(
        `Cannot broadcast gameState: game ${message.gameId} not found`,
      );
    }

    return {
      gameId: message.gameId,
      msgType: "gameState",
      context: { handNumber: game.handNumber },
      buildPayload: (conn) => {
        const player = Player.fromUser(conn.user);
        return JSON.stringify(playerView(game, player), null, 2);
      },
    };
  }

  /**
   * @param {{ type: "social", gameId: string, action: "chat", seat: number, message: string } | { type: "social", gameId: string, action: "emote", seat: number, emoji: string }} message
   * @returns {BroadcastDispatch}
   */
  function broadcastSocialAction(message) {
    const { gameId, ...socialAction } = message;
    const handNumber = games.get(gameId)?.handNumber ?? null;
    const payload = JSON.stringify(socialAction, null, 2);
    return {
      gameId,
      msgType: "social",
      context: {
        handNumber,
        action: socialAction.action,
        seat: socialAction.seat,
      },
      buildPayload: () => payload,
    };
  }

  /**
   * @param {{ type: "history", gameId: string, event: "handRecorded", handNumber: number }} message
   * @returns {BroadcastDispatch}
   */
  function broadcastHistoryUpdate(message) {
    const { gameId, ...historyEvent } = message;
    const payload = JSON.stringify(historyEvent, null, 2);
    return {
      gameId,
      msgType: "history",
      context: {
        event: message.event,
        handNumber: message.handNumber,
      },
      buildPayload: () => payload,
    };
  }

  /** @type {{
   *   gameState: (message: { type: "gameState", gameId: string }) => BroadcastDispatch,
   *   social: (message: { type: "social", gameId: string, action: "chat", seat: number, message: string } | { type: "social", gameId: string, action: "emote", seat: number, emoji: string }) => BroadcastDispatch,
   *   history: (message: { type: "history", gameId: string, event: "handRecorded", handNumber: number }) => BroadcastDispatch,
   * }} */
  const handlers = {
    gameState: broadcastGameState,
    social: broadcastSocialAction,
    history: broadcastHistoryUpdate,
  };

  /**
   * @param {BroadcastMessage} message
   * @returns {BroadcastStats}
   */
  function broadcastGameMessage(message) {
    const handler =
      /** @type {(message: BroadcastMessage) => BroadcastDispatch} */ (
        handlers[message.type]
      );
    const dispatch = handler(message);
    return broadcastToGameClients(dispatch.gameId, dispatch.buildPayload);
  }

  /** @param {string} gameId */
  function broadcastGameStateMessage(gameId) {
    broadcastGameMessage({ type: "gameState", gameId });
  }

  return {
    broadcastGameMessage,
    broadcastGameStateMessage,
  };
}
