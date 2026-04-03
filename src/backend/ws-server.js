import { WebSocketServer } from "ws";
import * as Player from "./poker/player.js";
import * as logger from "./logger.js";
import { getSessionPlayerLogContext } from "./logger.js";
import { parseCookies } from "./http-routes.js";
import { RateLimitError } from "./rate-limit.js";
import { matchLiveRoute } from "../shared/routes.js";
import {
  markPlayerConnected,
  handlePlayerDisconnected,
  sendInitialTournamentPayload,
  sendInitialGameView,
} from "./ws-connection.js";
import { createMessageHandler } from "./ws-message-handler.js";

/**
 * @typedef {import('./user.js').User} UserType
 * @typedef {import('./poker/game.js').Game} Game
 * @typedef {import('./poker/game.js').BroadcastMessage} BroadcastMessage
 * @typedef {import('./logger.js').Log} Log
 */

/**
 * @typedef {object} WebSocketServerParams
 * @property {import('http').Server} server
 * @property {Record<string, UserType>} users
 * @property {Map<string, Game>} games
 * @property {Map<import('ws').WebSocket, { user: UserType, gameId: string|null, tournamentId: string|null }>} clientConnections
 * @property {ReturnType<import('./rate-limit.js').createRateLimiter>} actionRateLimiter
 * @property {(req: import('http').IncomingMessage) => string} getRequestRateLimitKey
 * @property {(user: UserType|undefined, gameId: string|undefined) => Promise<Game|null>} resolveGameForUpgrade
 * @property {(message: BroadcastMessage) => { recipients: number, maxPayloadBytes: number }} broadcastGameMessage
 * @property {(gameId: string) => void} broadcastGameStateMessage
 * @property {(tournamentId: string, user: UserType) => string|null} buildTournamentStatePayload
 */

/**
 * @param {ReturnType<import('./rate-limit.js').createRateLimiter>} actionRateLimiter
 * @param {(req: import('http').IncomingMessage) => string} getRequestRateLimitKey
 * @param {import('http').IncomingMessage} request
 * @param {import('stream').Duplex} socket
 * @returns {boolean}
 */
function allowUpgradeRequest(
  actionRateLimiter,
  getRequestRateLimitKey,
  request,
  socket,
) {
  const rateLimitKey = getRequestRateLimitKey(request);
  try {
    actionRateLimiter.check(rateLimitKey, { source: "ws-upgrade" });
  } catch (err) {
    socket.end(
      `HTTP/1.1 429 Too Many Requests\r\nRetry-After: ${err instanceof RateLimitError ? err.retryAfterSeconds : 1}\r\nConnection: close\r\n\r\n`,
    );
    return false;
  }
  return true;
}

/**
 * @param {ReturnType<typeof matchLiveRoute>} liveRoute
 * @returns {string|undefined}
 */
function resolveGameId(liveRoute) {
  if (!liveRoute) return undefined;
  if (
    liveRoute.kind === "cash" ||
    liveRoute.kind === "sitngo" ||
    liveRoute.kind === "mtt_table"
  ) {
    return liveRoute.tableId;
  }
  return undefined;
}

/**
 * @param {ReturnType<typeof matchLiveRoute>} liveRoute
 * @returns {string|undefined}
 */
function resolveTournamentId(liveRoute) {
  if (!liveRoute) return undefined;
  if (liveRoute.kind === "mtt" || liveRoute.kind === "mtt_table") {
    return liveRoute.tournamentId;
  }
  return undefined;
}

/**
 * @param {Record<string, UserType>} users
 * @param {import('http').IncomingMessage} request
 * @returns {{
 *   user: UserType|undefined,
 *   gameId: string|undefined,
 *   tournamentId: string|undefined,
 *   liveKind: "cash"|"sitngo"|"mtt"|"mtt_table"|null,
 * }}
 */
function getUpgradeSession(users, request) {
  const cookies = parseCookies(request.headers.cookie ?? "");
  const liveRoute = request.url ? matchLiveRoute(request.url) : null;
  return {
    user: users[cookies.phg ?? ""],
    liveKind: liveRoute?.kind ?? null,
    gameId: resolveGameId(liveRoute),
    tournamentId: resolveTournamentId(liveRoute),
  };
}

/**
 * @param {object} params
 * @param {UserType|undefined} params.user
 * @param {string|null|undefined} params.liveKind
 * @param {string|undefined} params.gameId
 * @param {Game|null} params.game
 * @param {string|null} params.initialTournamentPayload
 * @param {string|undefined} params.tournamentId
 * @returns {boolean}
 */
function isUpgradeSessionValid({
  user,
  liveKind,
  gameId,
  game,
  initialTournamentPayload,
}) {
  if (!user || !liveKind) return false;
  if (gameId && !game) return false;
  if (liveKind === "mtt" && !initialTournamentPayload) return false;
  return true;
}

/**
 * @param {import('http').IncomingMessage} request
 * @param {import('stream').Duplex} socket
 * @param {Buffer} head
 * @param {WebSocketServerParams & { wss: WebSocketServer }} params
 */
async function handleUpgrade(request, socket, head, params) {
  const {
    users,
    actionRateLimiter,
    getRequestRateLimitKey,
    resolveGameForUpgrade,
    buildTournamentStatePayload,
    wss,
  } = params;

  if (
    !allowUpgradeRequest(
      actionRateLimiter,
      getRequestRateLimitKey,
      request,
      socket,
    )
  ) {
    return;
  }

  const { user, gameId, tournamentId, liveKind } = getUpgradeSession(
    users,
    request,
  );
  const game = gameId ? await resolveGameForUpgrade(user, gameId) : null;
  const initialTournamentPayload =
    user && tournamentId
      ? buildTournamentStatePayload(tournamentId, user)
      : null;

  if (
    !isUpgradeSessionValid({
      user,
      liveKind,
      gameId,
      game,
      initialTournamentPayload,
      tournamentId,
    })
  ) {
    logger.warn("ws upgrade rejected", {
      request: { url: request.url },
      session: { hasPlayer: !!user },
      game: { tableId: gameId ?? null, found: !!game },
      tournament: {
        id: tournamentId ?? null,
        found: !!initialTournamentPayload,
      },
    });
    socket.end("HTTP/1.1 401 Unauthorized\r\n\r\n");
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit(
      "connection",
      ws,
      request,
      user,
      game,
      gameId ?? null,
      tournamentId ?? null,
      initialTournamentPayload,
    );
  });
}

/**
 * @param {{
 *   clientConnections: WebSocketServerParams["clientConnections"],
 *   games: WebSocketServerParams["games"],
 *   actionRateLimiter: WebSocketServerParams["actionRateLimiter"],
 *   broadcastGameMessage: WebSocketServerParams["broadcastGameMessage"],
 *   broadcastGameStateMessage: WebSocketServerParams["broadcastGameStateMessage"],
 *   buildTournamentStatePayload: WebSocketServerParams["buildTournamentStatePayload"],
 * }} params
 * @returns {(
 *   ws: import("ws").WebSocket,
 *   request: import("http").IncomingMessage,
 *   user: UserType,
 *   game: Game|null,
 *   gameId: string|null,
 *   tournamentId: string|null,
 *   initialTournamentPayload: string|null,
 * ) => void}
 */
function createConnectionHandler({
  clientConnections,
  games,
  actionRateLimiter,
  broadcastGameMessage,
  broadcastGameStateMessage,
  buildTournamentStatePayload,
}) {
  function handleConnection(
    ws,
    _request,
    user,
    game,
    gameId,
    tournamentId,
    initialTournamentPayload,
  ) {
    const playerRateLimitKey = `player:${user.id}`;
    clientConnections.set(ws, { user, gameId, tournamentId });
    logger.info("ws connected", {
      game: { tableId: gameId, ...(tournamentId && { tournamentId }) },
      ...getSessionPlayerLogContext(user),
    });

    const player = Player.fromUser(user);
    if (game && gameId) {
      markPlayerConnected(game, player, gameId, broadcastGameStateMessage);
    }

    ws.on("close", () => {
      const conn = clientConnections.get(ws);
      clientConnections.delete(ws);
      if (!conn) return;

      logger.info("ws disconnected", {
        game: {
          tableId: conn.gameId,
          ...(conn.tournamentId && { tournamentId: conn.tournamentId }),
        },
        ...getSessionPlayerLogContext(conn.user),
      });

      handlePlayerDisconnected(
        conn,
        games,
        clientConnections,
        broadcastGameMessage,
        broadcastGameStateMessage,
      );
    });

    ws.on(
      "message",
      createMessageHandler({
        ws,
        user,
        game,
        gameId,
        player,
        playerRateLimitKey,
        actionRateLimiter,
        broadcastGameMessage,
        broadcastGameStateMessage,
      }),
    );

    sendInitialTournamentPayload(
      ws,
      tournamentId,
      initialTournamentPayload,
      user,
      buildTournamentStatePayload,
    );

    if (game) {
      sendInitialGameView(ws, game, player, broadcastGameMessage);
    }
  }

  return handleConnection;
}

/**
 * @param {WebSocketServerParams} params
 * @returns {{ wss: WebSocketServer }}
 */
export function createWebSocketServer(params) {
  const {
    server,
    clientConnections,
    games,
    actionRateLimiter,
    broadcastGameMessage,
    broadcastGameStateMessage,
    buildTournamentStatePayload,
  } = params;
  const wss = new WebSocketServer({ noServer: true, maxPayload: 4096 });

  server.on("upgrade", (request, socket, head) => {
    void handleUpgrade(request, socket, head, { ...params, wss }).catch(
      (err) => {
        logger.error("ws upgrade failed", {
          request: { url: request.url },
          error: { message: err.message },
        });
        socket.end("HTTP/1.1 500 Internal Server Error\r\n\r\n");
      },
    );
  });

  wss.on(
    "connection",
    createConnectionHandler({
      clientConnections,
      games,
      actionRateLimiter,
      broadcastGameMessage,
      broadcastGameStateMessage,
      buildTournamentStatePayload,
    }),
  );

  return { wss };
}
