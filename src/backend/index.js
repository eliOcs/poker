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
import { parseCookies, createRoutes, handleRequest } from "./http-routes.js";
import { throwIfHttpRateLimited } from "./http-route-utils.js";
import { createRateLimiter, getClientIp } from "./rate-limit.js";
import { handleRequestError } from "./http-error.js";
import { createGameBroadcaster } from "./game-broadcast.js";
import { createWebSocketServer } from "./ws-server.js";
import * as HandHistory from "./poker/hand-history/index.js";
import { createMttManager } from "./mtt.js";
import {
  cleanupOrphanGuestUsers,
  GUEST_CLEANUP_INTERVAL_MS,
} from "./guest-user-cleanup.js";

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

/** @type {Map<import('ws').WebSocket, { user: UserType, gameId?: Id, tournamentId?: Id }>} */
const clientConnections = new Map();

const {
  broadcastGameMessage: rawBroadcastGameMessage,
  broadcastGameStateMessage,
  broadcastTournamentStateMessage,
  buildTournamentStateMessage,
} = createGameBroadcaster(games, clientConnections, {
  getTournamentView: (tournamentId, playerId) => {
    try {
      return mttManager?.getTournamentView(tournamentId, playerId);
    } catch {
      return;
    }
  },
});

let mttManager;

/**
 * @param {Game} game
 * @param {{ handNumber: number, potResults: import("./poker/showdown.js").PotResult[], historyHand?: import("./poker/hand-history/index.js").OHHHand }} handData
 */
function recordFinalizedHand(game, handData) {
  const handPromise = handData.historyHand
    ? HandHistory.persistHand(game.id, handData.historyHand)
    : HandHistory.finalizeHand(game, handData.potResults, handData.handNumber);

  handPromise
    .then((hand) => {
      const tableEntries = hand.players.map((player) => ({
        playerId: player.id,
        tableId: game.id,
        ...(game.kind === "mtt" ? { tournamentId: game.tournamentId } : {}),
        lastHandNumber: handData.handNumber,
        lastPlayedAt: hand.start_date_utc,
      }));
      const tournamentEntries =
        game.kind === "mtt"
          ? hand.players.map((player) => ({
              playerId: player.id,
              tournamentId: game.tournamentId,
              lastTableId: game.id,
              lastHandNumber: handData.handNumber,
              lastPlayedAt: hand.start_date_utc,
            }))
          : [];
      Store.recordHandActivity(tableEntries, tournamentEntries);
      rawBroadcastGameMessage({
        type: "history",
        gameId: game.id,
        event: "handRecorded",
        handNumber: handData.handNumber,
      });
    })
    .catch((err) => {
      logger.error("hand finalization failed", {
        err,
        game: { tableId: game.id },
      });
    });
}

/** @param {import('./poker/game.js').BroadcastMessage} message */
function broadcastGameMessage(message) {
  if (message.type === "handEnded") {
    const game = games.get(message.gameId);
    if (game) {
      if (game.kind === "mtt" && mttManager) {
        mttManager.handleHandFinalized(game);
      }
      recordFinalizedHand(game, {
        handNumber: message.handNumber,
        potResults: message.potResults,
        historyHand: message.historyHand,
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
// HTTP requests and WebSocket actions share a budget per session or IP.
const actionRateLimiter = createRateLimiter({
  maxActions: 1_000,
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
 * @returns {Promise<Game|void>}
 */
async function resolveGameForUpgrade(user, gameId) {
  if (!user || !gameId) {
    return;
  }

  const existingGame = games.get(gameId);
  if (existingGame) {
    return existingGame;
  }

  const recoveredGame = await recoverGameFromHistory(gameId).catch((err) => {
    logger.error("game recovery failed", {
      game: { tableId: gameId },
      error: { message: err.message },
    });
    return;
  });
  if (!recoveredGame) {
    return;
  }
  if (recoveredGame.kind === "mtt") {
    return;
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
 * @param {import('http').ServerResponse} res
 * @param {import('./logger.js').Log} log
 */
async function handleServerRequest(req, res, log) {
  const key = getRequestRateLimitKey(req);
  throwIfHttpRateLimited(
    () => actionRateLimiter.check(key, { source: "http" }),
    log,
    "rateLimit",
  );
  await handleRequest(req, res, routes, {
    users,
    games,
    broadcast: broadcastGameStateMessage,
    log,
  });
}

server.on("request", (req, res) => {
  const url = req.url ?? "";
  const method = req.method ?? "GET";
  const log = createLog("http_request");
  log.context.request = { method, path: url };

  handleServerRequest(req, res, log)
    .catch((err) => {
      handleRequestError(res, log, err);
    })
    .finally(() => {
      log.context.request = {
        ...(log.context.request ?? {}),
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
  buildTournamentStateMessage,
  handleManagedTableAction: mttManager.handleTableAction,
});

Store.initialize();

function runGuestUserCleanup() {
  try {
    cleanupOrphanGuestUsers(users);
  } catch (err) {
    logger.error("guest cleanup failed", {
      error: err,
    });
  }
}

runGuestUserCleanup();
const guestCleanupTimer = setInterval(
  runGuestUserCleanup,
  GUEST_CLEANUP_INTERVAL_MS,
);
guestCleanupTimer.unref();

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
  clearInterval(guestCleanupTimer);

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
