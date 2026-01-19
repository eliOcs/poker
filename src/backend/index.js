import http from "http";
import { WebSocketServer } from "ws";
import { getFilePath, respondWithFile } from "./static-files.js";
import playerView from "./poker/player-view.js";
import * as PokerGame from "./poker/game.js";
import * as logger from "./logger.js";
import * as PlayerStore from "./player-store.js";
import { parseCookies, createRoutes } from "./http-routes.js";
import { processPokerAction } from "./websocket-handler.js";

/**
 * @typedef {import('./poker/seat.js').Player} PlayerType
 * @typedef {import('./poker/game.js').Game} Game
 */

const server = http.createServer();

/** @type {Record<string, PlayerType>} */
const players = {};

/** @type {Map<string, Game>} */
const games = new Map();

const routes = createRoutes(players, games);

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

    await route.handler({ req, res, match, players, games });
    return;
  }

  // Static file fallback
  const filePath = getFilePath(url);
  if (method === "GET" && filePath) {
    respondWithFile(filePath, res);
    return;
  }

  res.writeHead(404);
  res.end();
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

server.on("upgrade", function upgrade(request, socket, head) {
  const cookies = parseCookies(request.headers.cookie ?? "");
  const player = players[cookies.phg];

  const gameMatch = request.url?.match(/^\/games\/([a-z0-9]+)$/);
  const gameId = gameMatch?.[1];
  const game = gameId ? games.get(gameId) : undefined;

  if (player && game && gameId) {
    wss.handleUpgrade(request, socket, head, (ws) =>
      wss.emit("connection", ws, request, player, game, gameId),
    );
  } else {
    logger.warn("ws upgrade rejected", {
      url: request.url,
      hasPlayer: !!player,
      hasGame: !!game,
    });
    socket.end("HTTP/1.1 401 Unauthorized\r\n\r\n");
  }
});

const wss = new WebSocketServer({ noServer: true });

/** @type {Map<import('ws').WebSocket, { player: PlayerType, gameId: string }>} */
const clientConnections = new Map();

/** @param {string} gameId */
function broadcastGameState(gameId) {
  const game = games.get(gameId);
  if (!game) return;

  for (const [ws, conn] of clientConnections) {
    if (conn.gameId === gameId && ws.readyState === 1) {
      ws.send(JSON.stringify(playerView(game, conn.player), null, 2));
    }
  }
}

wss.on(
  "connection",
  async function connection(ws, request, player, game, gameId) {
    clientConnections.set(ws, { player, gameId });
    logger.info("ws connected", { gameId, playerId: player.id });

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
        playerId: conn.player.id,
      });

      const { player: closedPlayer, gameId: closedGameId } = conn;
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
      PokerGame.ensureGameTick(closedGame, closedGameId, broadcastGameState);
      broadcastGameState(closedGameId);
    });

    ws.on("message", function (rawMessage) {
      const { action, ...args } = JSON.parse(rawMessage);

      logger.info("ws message", {
        gameId,
        playerId: player.id,
        action,
        ...args,
      });

      if (action === "setName") {
        player.name = args.name?.trim().substring(0, 20) || null;
        PlayerStore.save(player);
        broadcastGameState(gameId);
        return;
      }

      try {
        processPokerAction(
          game,
          gameId,
          player,
          action,
          args,
          broadcastGameState,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error("action error", {
          gameId,
          playerId: player.id,
          action,
          error: message,
        });
        ws.send(JSON.stringify({ error: { message } }, null, 2));
      }

      broadcastGameState(gameId);
      PokerGame.ensureGameTick(game, gameId, broadcastGameState);
    });

    // Send initial game state
    ws.send(JSON.stringify(playerView(game, player), null, 2));
  },
);

PlayerStore.initialize();

/** @param {string} signal */
function gracefulShutdown(signal) {
  logger.info("shutdown initiated", { signal });

  server.close(() => logger.info("http server closed"));

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

  PlayerStore.close();
  logger.info("shutdown complete");
  process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

server.listen(process.env.PORT);
