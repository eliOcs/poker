import crypto from "crypto";
import http from "http";
import { WebSocketServer } from "ws";
import { getFilePath, respondWithFile } from "./static-files.js";
import playerView from "./poker/player-view.js";
import * as PokerGame from "./poker/game.js";
import * as PokerActions from "./poker/actions.js";
import * as Player from "./poker/player.js";
import * as Stakes from "./poker/stakes.js";
import * as HandHistory from "./poker/hand-history.js";
import { resetActingTicks, startClockTicks } from "./poker/game-tick.js";
import * as logger from "./logger.js";
import * as PlayerStore from "./player-store.js";

/**
 * @typedef {import('./poker/seat.js').Player} PlayerType
 * @typedef {import('./poker/game.js').Game} Game
 * @typedef {import('./poker/seat.js').OccupiedSeat} OccupiedSeat
 */

const BETTING_ACTIONS = ["check", "call", "bet", "raise", "fold", "allIn"];

/**
 * Classifies an all-in action as call, bet, or raise based on game context
 * @param {number} betBefore - Player's bet before the action
 * @param {number} currentBet - Current bet to match
 * @param {number} finalBet - Player's bet after going all-in
 * @returns {'call'|'bet'|'raise'}
 */
function classifyAllInAction(betBefore, currentBet, finalBet) {
  if (betBefore >= currentBet || finalBet <= currentBet) {
    return "call";
  }
  if (currentBet === 0) {
    return "bet";
  }
  return "raise";
}

/**
 * Records a betting action to hand history
 * @param {string} gameId
 * @param {string} playerId
 * @param {string} action
 * @param {OccupiedSeat} seatAfter
 * @param {number} betBefore
 * @param {Game} game
 */
function recordBettingAction(
  gameId,
  playerId,
  action,
  seatAfter,
  betBefore,
  game,
) {
  const isAllIn = seatAfter.allIn;

  if (action === "fold" || action === "check") {
    HandHistory.recordAction(gameId, playerId, action);
    return;
  }

  if (action === "allIn") {
    const historyAction = classifyAllInAction(
      betBefore,
      game.hand.currentBet,
      seatAfter.bet,
    );
    HandHistory.recordAction(
      gameId,
      playerId,
      historyAction,
      seatAfter.bet,
      true,
    );
    return;
  }

  // call, bet, raise
  HandHistory.recordAction(gameId, playerId, action, seatAfter.bet, isAllIn);
}

/**
 * Handles the start action
 * @param {Game} game
 * @param {string} gameId
 * @param {(gameId: string) => void} broadcastGameState
 */
function handleStartAction(game, gameId, broadcastGameState) {
  if (game.countdown !== null) {
    PokerGame.startGameTick(game, gameId, broadcastGameState);
  }
}

/**
 * Handles sitOut/leave actions that may cancel countdown
 * @param {Game} game
 */
function handleSitOutOrLeave(game) {
  if (game.countdown !== null && PokerActions.countPlayersWithChips(game) < 2) {
    game.countdown = null;
    PokerGame.stopGameTick(game);
  }
}

/**
 * Handles betting actions (processes game flow)
 * @param {Game} game
 * @param {string} gameId
 * @param {(gameId: string) => void} broadcastGameState
 */
function handleBettingAction(game, gameId, broadcastGameState) {
  resetActingTicks(game);
  PokerGame.processGameFlow(game, gameId, broadcastGameState);
}

/** @type {Record<string, (game: Game, gameId: string, broadcastGameState: (gameId: string) => void) => void>} */
const POST_ACTION_HANDLERS = {
  start: handleStartAction,
  sitOut: handleSitOutOrLeave,
  leave: handleSitOutOrLeave,
  callClock: (game) => startClockTicks(game),
};

/**
 * Handles post-action side effects for specific actions
 * @param {string} action
 * @param {Game} game
 * @param {string} gameId
 * @param {(gameId: string) => void} broadcastGameState
 */
function handlePostAction(action, game, gameId, broadcastGameState) {
  const handler = POST_ACTION_HANDLERS[action];
  if (handler) {
    handler(game, gameId, broadcastGameState);
  } else if (BETTING_ACTIONS.includes(action)) {
    handleBettingAction(game, gameId, broadcastGameState);
  }
}

/**
 * Gets the player's seat data before an action
 * @param {Game} game
 * @param {PlayerType} player
 * @returns {{ seatIndex: number, seatBefore: OccupiedSeat|null, betBefore: number }}
 */
function getSeatStateBefore(game, player) {
  const seatIndex = PokerGame.findPlayerSeatIndex(game, player);
  const seatBefore =
    seatIndex !== -1 && !game.seats[seatIndex].empty
      ? /** @type {OccupiedSeat} */ (game.seats[seatIndex])
      : null;
  return { seatIndex, seatBefore, betBefore: seatBefore?.bet || 0 };
}

/**
 * Processes a poker action and records to history
 * @param {Game} game
 * @param {string} gameId
 * @param {PlayerType} player
 * @param {string} action
 * @param {Record<string, unknown>} args
 * @param {(gameId: string) => void} broadcastGameState
 */
function processPokerAction(
  game,
  gameId,
  player,
  action,
  args,
  broadcastGameState,
) {
  const { seatIndex, seatBefore, betBefore } = getSeatStateBefore(game, player);

  PokerActions[action](game, { player, ...args });

  if (BETTING_ACTIONS.includes(action) && seatBefore) {
    const seatAfter = /** @type {OccupiedSeat} */ (game.seats[seatIndex]);
    recordBettingAction(gameId, player.id, action, seatAfter, betBefore, game);
  }

  handlePostAction(action, game, gameId, broadcastGameState);
}

const server = http.createServer();

/**
 * Parses the request body as JSON
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<unknown>}
 */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      if (!body) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

/**
 * @param {string} rawCookies
 * @returns {Record<string, string>}
 */
function parseCookies(rawCookies) {
  /** @type {Record<string, string>} */
  const cookies = {};
  for (const rawCookie of rawCookies.split("; ")) {
    const [key, value] = rawCookie.split("=");
    cookies[key] = value;
  }
  return cookies;
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {PlayerType}
 */
function getOrCreatePlayer(req, res) {
  const cookies = parseCookies(req.headers.cookie ?? "");
  let player = players[cookies.phg];

  if (!player) {
    // Check database for returning visitor
    const loadedPlayer = PlayerStore.load(cookies.phg);

    if (loadedPlayer) {
      // Returning player - add to memory cache
      player = loadedPlayer;
      players[player.id] = player;
    } else {
      // New player - create and persist
      player = Player.create();
      players[player.id] = player;
      PlayerStore.save(player);
      res.setHeader(
        "Set-Cookie",
        `phg=${player.id}; Domain=${process.env.DOMAIN}; HttpOnly; Path=/`,
      );
    }
  }

  return player;
}

/** @type {Record<string, PlayerType>} */
const players = {};

/** @type {Map<string, Game>} */
const games = new Map();

/** @returns {string} */
function generateGameId() {
  return crypto.randomBytes(4).toString("hex");
}

/**
 * @typedef {import('http').IncomingMessage} Request
 * @typedef {import('http').ServerResponse} Response
 */

/**
 * @typedef {object} RouteContext
 * @property {Request} req
 * @property {Response} res
 * @property {RegExpMatchArray|null} match
 */

/**
 * @typedef {object} Route
 * @property {string} method
 * @property {RegExp|string} path
 * @property {(ctx: RouteContext) => Promise<void>|void} handler
 */

/** @type {Route[]} */
const routes = [
  {
    method: "GET",
    path: "/up",
    handler: ({ res }) => {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("OK");
    },
  },
  {
    method: "GET",
    path: "/",
    handler: ({ req, res }) => {
      getOrCreatePlayer(req, res);
      respondWithFile("src/frontend/index.html", res);
    },
  },
  {
    method: "POST",
    path: "/games",
    handler: async ({ req, res }) => {
      getOrCreatePlayer(req, res);

      const data = await parseBody(req);
      let blinds = {
        ante: 0,
        small: Stakes.DEFAULT.small,
        big: Stakes.DEFAULT.big,
      };

      if (
        data &&
        typeof data === "object" &&
        "small" in data &&
        "big" in data &&
        Stakes.isValidPreset({
          small: /** @type {number} */ (data.small),
          big: /** @type {number} */ (data.big),
        })
      ) {
        blinds = {
          ante: 0,
          small: /** @type {number} */ (data.small),
          big: /** @type {number} */ (data.big),
        };
      }

      const gameId = generateGameId();
      const game = PokerGame.create({ blinds });
      games.set(gameId, game);

      logger.info("game created", {
        gameId,
        blinds: `${blinds.small}/${blinds.big}`,
      });

      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ id: gameId }));
    },
  },
  {
    method: "GET",
    path: /^\/games\/([a-z0-9]+)$/,
    handler: ({ req, res }) => {
      getOrCreatePlayer(req, res);
      respondWithFile("src/frontend/index.html", res);
    },
  },
  {
    method: "GET",
    path: /^\/history\/([a-z0-9]+)(\/\d+)?$/,
    handler: ({ req, res }) => {
      getOrCreatePlayer(req, res);
      respondWithFile("src/frontend/index.html", res);
    },
  },
  {
    method: "GET",
    path: /^\/api\/history\/([a-z0-9]+)$/,
    handler: async ({ req, res, match }) => {
      const gameId = /** @type {RegExpMatchArray} */ (match)[1];
      const player = getOrCreatePlayer(req, res);

      const hands = await HandHistory.getAllHands(gameId);
      const summaries = hands.map((hand) =>
        HandHistory.getHandSummary(hand, player.id),
      );
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ hands: summaries }));
    },
  },
  {
    method: "GET",
    path: /^\/api\/history\/([a-z0-9]+)\/(\d+)$/,
    handler: async ({ req, res, match }) => {
      const m = /** @type {RegExpMatchArray} */ (match);
      const gameId = m[1];
      const handNumber = parseInt(m[2], 10);
      const player = getOrCreatePlayer(req, res);

      const hand = await HandHistory.getHand(gameId, handNumber);
      if (!hand) {
        res.writeHead(404, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "Hand not found" }));
        return;
      }

      const filteredHand = HandHistory.filterHandForPlayer(hand, player.id);
      const view = HandHistory.getHandView(filteredHand, player.id);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ hand: filteredHand, view }));
    },
  },
];

/**
 * @param {Request} req
 * @param {Response} res
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

    await route.handler({ req, res, match });
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
