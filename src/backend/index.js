import http from "http";
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
import {
  createRateLimiter,
  getClientIp,
  RateLimitError,
} from "./rate-limit.js";
import { HttpError } from "./http-error.js";
import { createGameBroadcaster } from "./game-broadcast.js";
import { createWebSocketServer } from "./ws-server.js";
import * as HandHistory from "./poker/hand-history/index.js";
import { getFilePath, respondWithFile } from "./static-files.js";
import { createMttManager } from "./mtt.js";

/**
 * @typedef {import('./user.js').User} UserType
 * @typedef {import('./poker/game.js').Game} Game
 * @typedef {import('./id.js').Id} Id
 */

const server = http.createServer();

/** @type {Record<string, UserType>} */
const users = {};

/** @type {Map<Id, Game>} */
const games = new Map();

/** @type {Map<import('ws').WebSocket, { user: UserType, gameId: Id|null, tournamentId: Id|null }>} */
const clientConnections = new Map();

const {
  broadcastGameMessage: rawBroadcastGameMessage,
  broadcastGameStateMessage,
  broadcastTournamentStateMessage,
  buildTournamentStatePayload,
} = createGameBroadcaster(games, clientConnections, {
  getTournamentView: (tournamentId, playerId) => {
    try {
      return mttManager?.getTournamentView(tournamentId, playerId) || null;
    } catch {
      return null;
    }
  },
});

let mttManager = null;

/** @param {import('./poker/game.js').BroadcastMessage} message */
function broadcastGameMessage(message) {
  if (message.type === "handEnded") {
    const game = games.get(message.gameId);
    if (game) {
      const handPromise = message.historyHand
        ? HandHistory.persistHand(message.gameId, message.historyHand)
        : HandHistory.finalizeHand(
            game,
            message.potResults,
            message.handNumber,
          );
      handPromise
        .then((hand) => {
          Store.recordPlayerTableActivity(
            hand.players.map((player) => ({
              playerId: player.id,
              tableId: message.gameId,
              tournamentId: game.kind === "mtt" ? game.tournamentId : null,
              lastHandNumber: message.handNumber,
              lastPlayedAt: hand.start_date_utc,
            })),
          );
          const tournamentId = game.tournamentId;
          if (game.kind === "mtt" && tournamentId) {
            Store.recordPlayerTournamentActivity(
              hand.players.map((player) => ({
                playerId: player.id,
                tournamentId,
                lastTableId: message.gameId,
                lastHandNumber: message.handNumber,
                lastPlayedAt: hand.start_date_utc,
              })),
            );
          }
          if (game.kind === "mtt" && mttManager) {
            mttManager.handleHandFinalized(game);
          }
          rawBroadcastGameMessage({
            type: "history",
            gameId: message.gameId,
            event: "handRecorded",
            handNumber: message.handNumber,
          });
        })
        .catch((err) => {
          logger.error("hand finalization failed", {
            err,
            game: { id: message.gameId },
          });
        });
    }
    return { recipients: 0, maxPayloadBytes: 0 };
  }
  return rawBroadcastGameMessage(message);
}
mttManager = createMttManager({
  games,
  broadcastTableState: broadcastGameStateMessage,
  broadcastTournamentState: broadcastTournamentStateMessage,
  ensureTableTick: (game) => {
    PokerGame.ensureGameTick(game, broadcastGameMessage);
  },
});
const routes = createRoutes(users, games, broadcastGameStateMessage, {
  clientConnections,
  mttManager,
});

const RATE_LIMIT_BLOCK_DURATION_MS = 30 * 60 * 1000;
const STATIC_HTTP_RATE_LIMIT_MAX_ACTIONS = 500;
const actionRateLimiter = createRateLimiter({
  blockDurationMs: RATE_LIMIT_BLOCK_DURATION_MS,
});
const staticFileRateLimiter = createRateLimiter({
  maxActions: STATIC_HTTP_RATE_LIMIT_MAX_ACTIONS,
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
 * @param {Id|undefined} gameId
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
      game: { id: gameId },
      error: { message: err.message },
    });
    return null;
  });
  if (!recoveredGame) {
    return null;
  }
  if (recoveredGame.kind === "mtt") {
    return null;
  }

  games.set(gameId, recoveredGame);
  logger.info("game recovered from hand history", {
    game: {
      id: gameId,
      handNumber: recoveredGame.handNumber,
      tournament: !!recoveredGame.tournament,
    },
  });
  return recoveredGame;
}

/**
 * @param {import('http').IncomingMessage} req
 * @returns {{ limiter: ReturnType<typeof createRateLimiter>, source: string }}
 */
function getHttpRateLimiter(req) {
  const method = req.method ?? "GET";
  const url = req.url ?? "";
  if (method === "GET" && getFilePath(url)) {
    return {
      limiter: staticFileRateLimiter,
      source: "http-static",
    };
  }

  return {
    limiter: actionRateLimiter,
    source: "http",
  };
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('./logger.js').Log} log
 */
function throwIfRateLimitedHttpRequest(req, log) {
  const key = getRequestRateLimitKey(req);
  const { limiter, source } = getHttpRateLimiter(req);
  try {
    const rateLimit = limiter.check(key, { source });
    log.context.rateLimit = rateLimit.context;
  } catch (err) {
    if (err instanceof RateLimitError) {
      log.context.rateLimit = err.rateLimit;
    }
    throw new HttpError(429, "Too many requests", {
      body: { error: "Too many requests", status: 429 },
      headers: {
        "retry-after": String(
          err instanceof RateLimitError ? err.retryAfterSeconds : 1,
        ),
      },
    });
  }
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {import('./logger.js').Log} log
 */
async function handleRequest(req, res, log) {
  throwIfRateLimitedHttpRequest(req, log);

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

  const filePath = getFilePath(url);
  if (method === "GET" && filePath) {
    respondWithFile(req, res, filePath);
    return;
  }

  res.writeHead(404);
  res.end();
}

/**
 * @param {import('http').ServerResponse} res
 * @param {import('./logger.js').Log} log
 * @param {unknown} err
 */
function handleRequestError(res, log, err) {
  if (err instanceof HttpError) {
    log.context.error = { message: err.message };
    if (!res.headersSent) {
      res.writeHead(err.status, {
        "content-type": "application/json",
        ...(err.headers || {}),
      });
      res.end(
        JSON.stringify(err.body || { error: err.message, status: err.status }),
      );
    }
    return;
  }

  if (err instanceof Error) {
    log.context.error = { message: err.message };
  }
  if (!res.headersSent) {
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}

server.on("request", (req, res) => {
  const url = req.url ?? "";
  const method = req.method ?? "GET";
  const log = createLog("http_request");
  log.context.request = { method, path: url };

  handleRequest(req, res, log)
    .catch((err) => {
      handleRequestError(res, log, err);
    })
    .finally(() => {
      log.context.request = {
        ...(log.context.request || {}),
        status: res.statusCode,
      };
      emitLog(log);
    });
});

createWebSocketServer({
  server,
  users,
  games,
  clientConnections,
  actionRateLimiter,
  getRequestRateLimitKey,
  resolveGameForUpgrade,
  broadcastGameMessage,
  broadcastGameStateMessage,
  buildTournamentStatePayload,
});

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
async function gracefulShutdown(signal) {
  logger.info("shutdown initiated", { signal });
  server.close(() => {
    logger.info("http server closed");
  });
  clearInterval(evictionTimer);

  for (const [ws] of clientConnections) {
    ws.close(1001, "Server shutting down");
  }
  clientConnections.clear();

  for (const [, game] of games) {
    PokerGame.stopGameTick(game);
  }
  games.clear();

  mttManager?.close();
  Store.close();
  logger.info("shutdown complete");
  process.exit(0);
}

process.on("SIGTERM", () => {
  void gracefulShutdown("SIGTERM");
});
process.on("SIGINT", () => {
  void gracefulShutdown("SIGINT");
});

const port = Number(process.env.PORT);
const host = process.env.HOST;
if (host) {
  server.listen(port, host);
} else {
  server.listen(port);
}
