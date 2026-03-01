import http from "http";
import { WebSocketServer } from "ws";
import { getFilePath, respondWithFile } from "./static-files.js";
import playerView from "./poker/player-view.js";
import * as Player from "./poker/player.js";
import * as PokerGame from "./poker/game.js";
import { recoverGameFromHistory } from "./poker/recovery.js";
import {
  createInactiveGameEvictor,
  getGameEvictionIntervalMs,
} from "./game-eviction.js";
import * as logger from "./logger.js";
import { createLog, emitLog } from "./logger.js";
import * as Store from "./store.js";
import { parseCookies, createRoutes } from "./http-routes.js";
import { processPokerAction } from "./websocket-handler.js";
import { createRateLimiter, getClientIp } from "./rate-limit.js";
import { HttpError } from "./http-error.js";

/**
 * @typedef {import('./user.js').User} UserType
 * @typedef {import('./poker/game.js').Game} Game
 * @typedef {import('./poker/game.js').BroadcastMessage} BroadcastMessage
 * @typedef {{ user: UserType, gameId: string }} ClientConn
 */

const server = http.createServer();

/** @type {Record<string, UserType>} */
const users = {};

/** @type {Map<string, Game>} */
const games = new Map();
/**
 * @typedef {{ recipients: number, maxPayloadBytes: number }} BroadcastStats
 * @typedef {{
 *   gameId: string,
 *   msgType: "gameState"|"history"|"social",
 *   context?: Record<string, unknown>,
 *   buildPayload: (conn: ClientConn) => string|null
 * }} BroadcastDispatch
 */

/**
 * @param {string} gameId
 * @param {(ws: import('ws').WebSocket, conn: { user: UserType, gameId: string }) => void} callback
 */
function forEachGameClient(gameId, callback) {
  for (const [ws, conn] of clientConnections) {
    if (conn.gameId === gameId && ws.readyState === 1) {
      callback(ws, conn);
    }
  }
}

/**
 * Broadcasts payloads to all connected clients for a game.
 * @param {string} gameId
 * @param {(conn: { user: UserType, gameId: string }) => string|null} buildPayload
 * @returns {{ recipients: number, maxPayloadBytes: number }}
 */
function broadcastToGameClients(gameId, buildPayload) {
  let recipients = 0;
  let maxPayloadBytes = 0;
  forEachGameClient(gameId, (ws, conn) => {
    const payload = buildPayload(conn);
    if (payload !== null) {
      ws.send(payload);
      recipients += 1;
      const payloadBytes = Buffer.byteLength(payload);
      maxPayloadBytes = Math.max(maxPayloadBytes, payloadBytes);
    }
  });
  return { recipients, maxPayloadBytes };
}

/**
 * @param {string} gameId
 * @param {'gameState'|'history'|'social'} msgType
 * @param {BroadcastStats} stats
 * @param {Record<string, unknown>} [context]
 */
function logBroadcast(gameId, msgType, stats, context = {}) {
  logger.info("ws_broadcast", {
    gameId,
    msgType,
    recipients: stats.recipients,
    maxPayloadBytes: stats.maxPayloadBytes,
    ...context,
  });
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
 * Broadcast a social action message (chat/emote) without mutating game state.
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
 * Broadcasts a history update event when a hand is persisted.
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
const BROADCAST_HANDLERS = {
  gameState: broadcastGameState,
  social: broadcastSocialAction,
  history: broadcastHistoryUpdate,
};

/**
 * Dispatches a typed game broadcast message.
 * @param {BroadcastMessage} message
 */
function broadcastGameMessage(message) {
  const handler =
    /** @type {(message: BroadcastMessage) => BroadcastDispatch} */ (
      BROADCAST_HANDLERS[message.type]
    );
  const dispatch = handler(message);
  const stats = broadcastToGameClients(dispatch.gameId, dispatch.buildPayload);
  logBroadcast(dispatch.gameId, dispatch.msgType, stats, dispatch.context);
}

/** @param {string} gameId */
function broadcastGameStateMessage(gameId) {
  broadcastGameMessage({ type: "gameState", gameId });
}

const routes = createRoutes(users, games, broadcastGameStateMessage);
const RATE_LIMIT_BLOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const actionRateLimiter = createRateLimiter({
  blockDurationMs: RATE_LIMIT_BLOCK_DURATION_MS,
});

/**
 * @param {import('http').IncomingMessage} req
 * @returns {string}
 */
function getRequestRateLimitKey(req) {
  const cookies = parseCookies(req.headers.cookie ?? "");
  const playerId = cookies.phg;
  if (playerId && users[playerId]) {
    return `player:${playerId}`;
  }
  return `ip:${getClientIp(req)}`;
}

/**
 * @param {UserType|undefined} user
 * @param {string|undefined} gameId
 * @returns {Promise<Game|null>}
 */
async function resolveGameForUpgrade(user, gameId) {
  if (!user || !gameId) {
    return null;
  }

  const existingGame = games.get(gameId);
  if (existingGame) {
    return existingGame;
  }

  const recoveredGame = await recoverGameFromHistory(gameId).catch((err) => {
    logger.error("game recovery failed", {
      gameId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  });

  if (!recoveredGame) {
    return null;
  }

  games.set(gameId, recoveredGame);
  logger.info("game recovered from hand history", {
    gameId,
    handNumber: recoveredGame.handNumber,
    tournament: !!recoveredGame.tournament,
  });

  return recoveredGame;
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {import('./logger.js').Log|null} log
 */
async function handleRequest(req, res, log) {
  throwIfRateLimitedHttpRequest(req);

  const url = req.url ?? "";
  const method = req.method ?? "GET";

  for (const route of routes) {
    if (route.method !== method) continue;

    /** @type {RegExpMatchArray|null} */
    let match = null;
    if (typeof route.path === "string") {
      if (route.path !== url) continue;
    } else {
      match = url.match(route.path);
      if (!match) continue;
    }

    await route.handler({
      req,
      res,
      match,
      users,
      games,
      broadcast: broadcastGameStateMessage,
      log,
    });
    return;
  }

  // Static file fallback
  const filePath = getFilePath(url);
  if (method === "GET" && filePath) {
    respondWithFile(req, res, filePath);
    return;
  }

  res.writeHead(404);
  res.end();
}

/**
 * @param {import('http').IncomingMessage} req
 */
function throwIfRateLimitedHttpRequest(req) {
  const key = getRequestRateLimitKey(req);
  const rateLimit = actionRateLimiter.check(key, { source: "http" });
  if (rateLimit.allowed) return;

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil(rateLimit.retryAfterMs / 1000),
  );
  throw new HttpError(429, "Too many requests", {
    body: { error: "Too many requests", status: 429 },
    headers: {
      "retry-after": String(retryAfterSeconds),
    },
  });
}

server.on("request", (req, res) => {
  const url = req.url ?? "";
  const method = req.method ?? "GET";
  const isHealthCheck = url === "/up";
  const log = isHealthCheck ? null : createLog("http_request");

  if (log) Object.assign(log.context, { method, path: url });

  handleRequest(req, res, log)
    .catch((err) => {
      if (err instanceof HttpError) {
        if (log) log.context.error = err.message;

        if (!res.headersSent) {
          res.writeHead(err.status, {
            "content-type": "application/json",
            ...(err.headers || {}),
          });
          res.end(
            JSON.stringify(
              err.body || { error: err.message, status: err.status },
            ),
          );
        }
        return;
      }

      if (log)
        log.context.error = err instanceof Error ? err.message : String(err);
      if (!res.headersSent) {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "Internal server error" }));
      }
    })
    .finally(() => {
      if (log) {
        log.context.status = res.statusCode;
        emitLog(log);
      }
    });
});

server.on("upgrade", async function upgrade(request, socket, head) {
  const rateLimitKey = getRequestRateLimitKey(request);
  const upgradeRateLimit = actionRateLimiter.check(rateLimitKey, {
    source: "ws-upgrade",
  });
  if (!upgradeRateLimit.allowed) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil(upgradeRateLimit.retryAfterMs / 1000),
    );
    socket.end(
      `HTTP/1.1 429 Too Many Requests\r\nRetry-After: ${retryAfterSeconds}\r\nConnection: close\r\n\r\n`,
    );
    return;
  }

  const cookies = parseCookies(request.headers.cookie ?? "");
  const user = users[cookies.phg];

  const gameMatch = request.url?.match(/^\/games\/([a-z0-9]+)$/);
  const gameId = gameMatch?.[1];
  const game = await resolveGameForUpgrade(user, gameId);

  if (user && game && gameId) {
    wss.handleUpgrade(request, socket, head, (ws) =>
      wss.emit("connection", ws, request, user, game, gameId),
    );
  } else {
    logger.warn("ws upgrade rejected", {
      url: request.url,
      hasUser: !!user,
      hasGame: !!game,
    });
    socket.end("HTTP/1.1 401 Unauthorized\r\n\r\n");
  }
});

/**
 * Handles social actions (emote/chat) by broadcasting a dedicated social event.
 * @param {Game} game
 * @param {UserType} user
 * @param {'emote'|'chat'} action
 * @param {Record<string, unknown>} args
 * @param {(message: BroadcastMessage) => void} broadcastGameMessage
 * @param {string} gameId
 */
function handleSocialAction(
  game,
  user,
  action,
  args,
  broadcastGameMessage,
  gameId,
) {
  const player = Player.fromUser(user);
  const seatIndex = PokerGame.findPlayerSeatIndex(game, player);
  if (seatIndex !== -1 && !game.seats[seatIndex].empty) {
    if (action === "emote") {
      const emoji = String(args.emoji || "").trim();
      if (!emoji) return;
      broadcastGameMessage({
        type: "social",
        gameId,
        action: "emote",
        seat: seatIndex,
        emoji,
      });
    } else {
      const message = String(args.message || "")
        .trim()
        .slice(0, 100);
      if (!message) return;
      broadcastGameMessage({
        type: "social",
        gameId,
        action: "chat",
        seat: seatIndex,
        message,
      });
    }
  }
}

/**
 * Handles preAction/clearPreAction messages
 * @param {Game} game
 * @param {UserType} user
 * @param {string} action
 * @param {Record<string, unknown>} args
 * @param {(gameId: string) => void} broadcastGameState
 * @param {string} gameId
 * @returns {string|null} Error message or null on success
 */
function handlePreAction(game, user, action, args, broadcastGameState, gameId) {
  const player = Player.fromUser(user);
  const seatIndex = PokerGame.findPlayerSeatIndex(game, player);
  if (seatIndex === -1 || game.seats[seatIndex].empty) return null;

  const seat = /** @type {import('./poker/seat.js').OccupiedSeat} */ (
    game.seats[seatIndex]
  );

  if (action === "clearPreAction") {
    seat.preAction = null;
    broadcastGameState(gameId);
    return null;
  }

  if (game.hand?.actingSeat === seatIndex) {
    return "cannot set pre-action on your turn";
  }

  const preType = /** @type {'checkFold'|'callAmount'} */ (args.type);
  seat.preAction =
    preType === "checkFold"
      ? { type: /** @type {const} */ ("checkFold"), amount: null }
      : {
          type: /** @type {const} */ ("callAmount"),
          amount: /** @type {number} */ (args.amount ?? 0),
        };
  broadcastGameState(gameId);
  return null;
}

const wss = new WebSocketServer({ noServer: true });

/** @type {Map<import('ws').WebSocket, { user: UserType, gameId: string }>} */
const clientConnections = new Map();

wss.on(
  "connection",
  async function connection(ws, request, user, game, gameId) {
    const playerRateLimitKey = `player:${user.id}`;
    clientConnections.set(ws, { user, gameId });
    logger.info("ws connected", { gameId, playerId: user.id });

    // Create player from user for game operations
    const player = Player.fromUser(user);

    // Mark player as connected if they have a seat
    const seatIndex = PokerGame.findPlayerSeatIndex(game, player);
    if (seatIndex !== -1 && !game.seats[seatIndex].empty) {
      const seat = /** @type {import('./poker/seat.js').OccupiedSeat} */ (
        game.seats[seatIndex]
      );
      seat.disconnected = false;

      // Notify other players that this player reconnected
      broadcastGameStateMessage(gameId);
    }

    ws.on("close", () => {
      const conn = clientConnections.get(ws);
      clientConnections.delete(ws);

      if (!conn) return;

      logger.info("ws disconnected", {
        gameId: conn.gameId,
        playerId: conn.user.id,
      });

      const closedPlayer = Player.fromUser(conn.user);
      const closedGameId = conn.gameId;
      const closedGame = games.get(closedGameId);
      if (!closedGame) return;

      const closedSeatIndex = PokerGame.findPlayerSeatIndex(
        closedGame,
        closedPlayer,
      );
      if (closedSeatIndex === -1 || closedGame.seats[closedSeatIndex].empty)
        return;

      const closedSeat = /** @type {import('./poker/seat.js').OccupiedSeat} */ (
        closedGame.seats[closedSeatIndex]
      );

      closedSeat.disconnected = true;
      PokerGame.ensureGameTick(closedGame, broadcastGameMessage);
      broadcastGameStateMessage(closedGameId);
    });

    ws.on("message", function (rawMessage) {
      const actionRateLimit = actionRateLimiter.check(playerRateLimitKey, {
        source: "ws-action",
      });
      if (!actionRateLimit.allowed) {
        ws.send(
          JSON.stringify(
            { error: { message: "Too many requests", status: 429 } },
            null,
            2,
          ),
        );
        return;
      }

      /** @type {{ action: string } & Record<string, unknown>} */
      let messageData;
      try {
        messageData = JSON.parse(String(rawMessage));
      } catch {
        ws.send(
          JSON.stringify(
            { error: { message: "Invalid JSON payload", status: 400 } },
            null,
            2,
          ),
        );
        return;
      }

      const { action, ...args } = messageData;
      const log = createLog("ws_action");
      Object.assign(log.context, {
        gameId,
        playerId: user.id,
        action,
        ...args,
      });

      // Handle social actions (emote/chat) — no game logic, just broadcast
      if (action === "emote" || action === "chat") {
        handleSocialAction(
          game,
          user,
          action,
          args,
          broadcastGameMessage,
          gameId,
        );
        emitLog(log);
        return;
      }

      // Handle pre-action toggle — set or clear pre-selected action
      if (["preAction", "clearPreAction"].includes(action)) {
        const error = handlePreAction(
          game,
          user,
          action,
          args,
          broadcastGameStateMessage,
          gameId,
        );
        if (error) ws.send(JSON.stringify({ error: { message: error } }));
        emitLog(log);
        return;
      }

      try {
        const player = Player.fromUser(user);
        processPokerAction(game, player, action, args, broadcastGameMessage);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log.context.error = message;
        ws.send(JSON.stringify({ error: { message } }, null, 2));
      } finally {
        emitLog(log);
      }

      broadcastGameMessage({ type: "gameState", gameId });
      PokerGame.ensureGameTick(game, broadcastGameMessage);
    });

    // Send initial game state
    ws.send(JSON.stringify(playerView(game, player), null, 2));

    // Recovered tournaments need ticking resumed after reconnect.
    PokerGame.ensureGameTick(game, broadcastGameMessage);
  },
);

Store.initialize();

const evictInactiveGames = createInactiveGameEvictor();
const evictionTimer = setInterval(() => {
  evictInactiveGames({
    games,
    clientConnections,
    createLog,
    emitLog,
  });
}, getGameEvictionIntervalMs());

if (typeof evictionTimer.unref === "function") {
  evictionTimer.unref();
}

/** @param {string} signal */
function gracefulShutdown(signal) {
  logger.info("shutdown initiated", { signal });

  server.close(() => logger.info("http server closed"));
  clearInterval(evictionTimer);

  for (const [ws] of clientConnections) {
    ws.close(1001, "Server shutting down");
  }
  clientConnections.clear();

  for (const [, game] of games) {
    if (game.tickTimer) {
      clearInterval(game.tickTimer);
      game.tickTimer = null;
    }
  }
  games.clear();

  Store.close();
  logger.info("shutdown complete");
  process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

server.listen(process.env.PORT);
