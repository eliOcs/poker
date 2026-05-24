import playerView from "./poker/player-view.js";
import * as Player from "./poker/player.js";
import { sendWebSocketJson } from "./ws-json.js";

/**
 * @typedef {import('./user.js').User} UserType
 * @typedef {import('./poker/game.js').Game} Game
 * @typedef {import('./poker/game.js').BroadcastMessage} BroadcastMessage
 * @typedef {{ user: UserType, gameId: string|null, tournamentId: string|null }} ClientConn
 * @typedef {{ recipients: number, maxPayloadBytes: number }} BroadcastStats
 * @typedef {import('./mtt-seating.js').PlayerMovedEvent} PlayerMovedEvent
 * @typedef {{ type: "tournamentState", tournament: unknown }} TournamentStateMessage
 * @typedef {{
 *   gameId: string,
 *   msgType: "gameState"|"history"|"social",
 *   context?: Record<string, unknown>,
 *   buildMessage: (conn: ClientConn) => unknown|null
 * }} BroadcastDispatch
 */

/**
 * @param {Map<string, Game>} games
 * @param {Map<import('ws').WebSocket, ClientConn>} clientConnections
 * @param {{ getTournamentView?: (tournamentId: string, playerId: string) => unknown|null }} [options]
 */
export function createGameBroadcaster(games, clientConnections, options = {}) {
  const { getTournamentView = () => null } = options;

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
   * @param {string} tournamentId
   * @param {(ws: import('ws').WebSocket, conn: ClientConn) => void} callback
   */
  function forEachTournamentClient(tournamentId, callback) {
    for (const [ws, conn] of clientConnections) {
      if (conn.tournamentId === tournamentId && ws.readyState === 1) {
        callback(ws, conn);
      }
    }
  }

  /**
   * @param {string} gameId
   * @param {(conn: ClientConn) => unknown|null} buildMessage
   * @returns {BroadcastStats}
   */
  function broadcastToGameClients(gameId, buildMessage) {
    let recipients = 0;
    let maxPayloadBytes = 0;
    forEachGameClient(gameId, (ws, conn) => {
      const message = buildMessage(conn);
      if (message !== null) {
        const payloadBytes = sendWebSocketJson(ws, message);
        recipients += 1;
        maxPayloadBytes = Math.max(maxPayloadBytes, payloadBytes);
      }
    });
    return { recipients, maxPayloadBytes };
  }

  /**
   * @param {string} tournamentId
   * @param {UserType} user
   * @returns {TournamentStateMessage|null}
   */
  function buildTournamentStateMessage(tournamentId, user) {
    const tournament = getTournamentView(tournamentId, user.id);
    if (!tournament) return null;
    return { type: "tournamentState", tournament };
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
      buildMessage: (conn) => {
        const player = Player.fromUser(conn.user);
        return playerView(game, player);
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
    return {
      gameId,
      msgType: "social",
      context: {
        handNumber,
        action: socialAction.action,
        seat: socialAction.seat,
      },
      buildMessage: () => socialAction,
    };
  }

  /**
   * @param {{ type: "history", gameId: string, event: "handRecorded", handNumber: number }} message
   * @returns {BroadcastDispatch}
   */
  function broadcastHistoryUpdate(message) {
    const { gameId, ...historyEvent } = message;
    return {
      gameId,
      msgType: "history",
      context: {
        event: message.event,
        handNumber: message.handNumber,
      },
      buildMessage: () => historyEvent,
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
    return broadcastToGameClients(dispatch.gameId, dispatch.buildMessage);
  }

  /** @param {string} gameId */
  function broadcastGameStateMessage(gameId) {
    broadcastGameMessage({ type: "gameState", gameId });
  }

  return {
    broadcastGameMessage,
    broadcastGameStateMessage,
    /**
     * @param {string} tournamentId
     * @param {PlayerMovedEvent[]} [playerMoves]
     */
    broadcastTournamentStateMessage(tournamentId, playerMoves = []) {
      const playerMovesById = new Map(
        playerMoves.map((move) => [move.playerId, move]),
      );
      let recipients = 0;
      let maxPayloadBytes = 0;
      forEachTournamentClient(tournamentId, (ws, conn) => {
        const tournament = getTournamentView(tournamentId, conn.user.id);
        if (!tournament) {
          throw new Error(
            `Cannot broadcast tournamentState: tournament ${tournamentId} not found`,
          );
        }

        const playerMove = playerMovesById.get(conn.user.id);
        if (playerMove) {
          maxPayloadBytes = Math.max(
            maxPayloadBytes,
            sendWebSocketJson(ws, {
              type: "playerMoved",
              tournamentId: playerMove.tournamentId,
              tableId: playerMove.tableId,
              tableName: playerMove.tableName,
            }),
          );
        }
        const payloadBytes = sendWebSocketJson(ws, {
          type: "tournamentState",
          tournament,
        });
        recipients += 1;
        maxPayloadBytes = Math.max(maxPayloadBytes, payloadBytes);
      });
      return { recipients, maxPayloadBytes };
    },
    buildTournamentStateMessage,
  };
}
