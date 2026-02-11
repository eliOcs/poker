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
import * as Store from "./store.js";
import { parseCookies, createRoutes } from "./http-routes.js";
import { processPokerAction } from "./websocket-handler.js";
import { createRateLimiter, getClientIp } from "./rate-limit.js";

/**
 * @typedef {import('./user.js').User} UserType
 * @typedef {import('./poker/game.js').Game} Game
 */

const server = http.createServer();

/** @type {Record<string, UserType>} */
const users = {};

/** @type {Map<string, Game>} */
const games = new Map();

/** @param {string} gameId */
function broadcastGameState(gameId) {
  const game = games.get(gameId);
  if (!game) return;

  for (const [ws, conn] of clientConnections) {
    if (conn.gameId === gameId && ws.readyState === 1) {
      const player = Player.fromUser(conn.user);
      ws.send(JSON.stringify(playerView(game, player), null, 2));
    }
  }
}

const routes = createRoutes(users, games, broadcastGameState);
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
 */
async function handleRequest(req, res) {
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
      broadcast: broadcastGameState,
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
 * @param {import('http').ServerResponse} res
 * @returns {boolean}
 */
function rejectRateLimitedHttpRequest(req, res) {
  const key = getRequestRateLimitKey(req);
  const rateLimit = actionRateLimiter.check(key, { source: "http" });
  if (rateLimit.allowed) {
    return false;
  }

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil(rateLimit.retryAfterMs / 1000),
  );
  res.writeHead(429, {
    "content-type": "application/json",
    "retry-after": String(retryAfterSeconds),
  });
  res.end(JSON.stringify({ error: "Too many requests", status: 429 }));
  return true;
}

server.on("request", (req, res) => {
  const url = req.url ?? "";
  const method = req.method ?? "GET";
  const startTime = Date.now();

  res.on("finish", () => {
    // Skip health check to reduce noise
    if (url !== "/up") {
      logger.info("http request", {
        method,
        path: url,
        status: res.statusCode,
        duration: Date.now() - startTime,
      });
    }
  });

  if (rejectRateLimitedHttpRequest(req, res)) {
    return;
  }

  handleRequest(req, res).catch((err) => {
    logger.error("request error", {
      method,
      path: url,
      error: err instanceof Error ? err.message : String(err),
    });
    if (!res.headersSent) {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
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

      // Reset disconnect tick counter if this was the disconnected acting player
      if (seatIndex === game.hand?.actingSeat) {
        game.disconnectedActingTicks = 0;
      }

      // Notify other players that this player reconnected
      broadcastGameState(gameId);
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
      PokerGame.ensureGameTick(closedGame, broadcastGameState);
      broadcastGameState(closedGameId);
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

      logger.info("ws message", {
        gameId,
        playerId: user.id,
        action,
        ...args,
      });

      // Handle emote action separately — no game logic, just broadcast
      if (action === "emote") {
        const player = Player.fromUser(user);
        const seatIndex = PokerGame.findPlayerSeatIndex(game, player);
        if (seatIndex !== -1 && !game.seats[seatIndex].empty) {
          game.seats[seatIndex].emote = args.emoji;
          broadcastGameState(gameId);
          game.seats[seatIndex].emote = null;
        }
        return;
      }

      try {
        const player = Player.fromUser(user);
        processPokerAction(game, player, action, args, broadcastGameState);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error("action error", {
          gameId,
          playerId: user.id,
          action,
          error: message,
        });
        ws.send(JSON.stringify({ error: { message } }, null, 2));
      }

      broadcastGameState(gameId);
      PokerGame.ensureGameTick(game, broadcastGameState);
    });

    // Send initial game state
    ws.send(JSON.stringify(playerView(game, player), null, 2));

    // Recovered tournaments need ticking resumed after reconnect.
    PokerGame.ensureGameTick(game, broadcastGameState);
  },
);

Store.initialize();

const evictInactiveGames = createInactiveGameEvictor();
const evictionTimer = setInterval(() => {
  evictInactiveGames({
    games,
    clientConnections,
    logInfo: logger.info,
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
