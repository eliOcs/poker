import crypto from "crypto";
import http from "http";
import { WebSocketServer } from "ws";
import { getFilePath, respondWithFile } from "./static-files.js";
import playerView from "./poker/player-view.js";
import * as PokerGame from "./poker/game.js";
import * as PokerActions from "./poker/actions.js";
import * as Player from "./poker/player.js";
import * as Betting from "./poker/betting.js";
import * as Showdown from "./poker/showdown.js";
import * as Stakes from "./poker/stakes.js";
import HandRankings from "./poker/hand-rankings.js";
import * as HandHistory from "./poker/hand-history.js";
import {
  tick,
  shouldTickBeRunning,
  resetActingTicks,
  startClockTicks,
} from "./poker/game-tick.js";
import * as logger from "./logger.js";
import * as PlayerStore from "./player-store.js";

/**
 * @typedef {import('./poker/seat.js').Player} PlayerType
 * @typedef {import('./poker/game.js').Game} Game
 */

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

/** @param {Generator} gen */
function runAll(gen) {
  while (!gen.next().done);
}

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

/**
 * Advances to next phase, loops through streets when everyone is all-in
 * @param {Game} game
 * @param {string} gameId
 */
function processGameFlow(game, gameId) {
  // Loop to handle all-in situations where we need to run out the board
  while (true) {
    const phase = game.hand.phase;

    // Only process if we're in a betting phase
    if (!["preflop", "flop", "turn", "river"].includes(phase)) {
      return;
    }

    // Check if only one player remains (everyone else folded)
    if (Betting.countActivePlayers(game) <= 1) {
      const result = Showdown.awardToLastPlayer(game);
      if (result.winner !== -1) {
        const winnerSeat =
          /** @type {import('./poker/seat.js').OccupiedSeat} */ (
            game.seats[result.winner]
          );
        game.winnerMessage = {
          playerName: winnerSeat.player?.name || `Seat ${result.winner + 1}`,
          handRank: null, // No showdown, won by fold
          amount: result.amount,
        };
        // Finalize hand history (won by fold)
        HandHistory.finalizeHand(gameId, game, [
          {
            potAmount: result.amount,
            winners: [result.winner],
            winningHand: null,
            winningCards: null,
            awards: [{ seat: result.winner, amount: result.amount }],
          },
        ]);

        logger.info("hand ended", {
          gameId,
          handNumber: HandHistory.getHandNumber(gameId),
          winner: winnerSeat.player?.name || `Seat ${result.winner + 1}`,
          wonBy: "fold",
          amount: result.amount,
        });
      }
      PokerActions.endHand(game);
      autoStartNextHand(game, gameId);
      return;
    }

    // Check if betting round is complete
    if (game.hand.actingSeat !== -1) {
      // Someone still needs to act
      return;
    }

    Betting.collectBets(game);

    if (phase === "preflop") {
      runAll(PokerActions.dealFlop(game));
      HandHistory.recordStreet(gameId, "flop", game.board.cards);
      Betting.startBettingRound(game, "flop");
    } else if (phase === "flop") {
      runAll(PokerActions.dealTurn(game));
      HandHistory.recordStreet(gameId, "turn", [game.board.cards[3]]);
      Betting.startBettingRound(game, "turn");
    } else if (phase === "turn") {
      runAll(PokerActions.dealRiver(game));
      HandHistory.recordStreet(gameId, "river", [game.board.cards[4]]);
      Betting.startBettingRound(game, "river");
    } else if (phase === "river") {
      const gen = Showdown.showdown(game);
      let result = gen.next();
      while (!result.done) {
        result = gen.next();
      }
      // result.value contains PotResult[] when done
      const potResults = result.value || [];

      // Record showdown actions to history
      for (const seat of game.seats) {
        if (
          !seat.empty &&
          !seat.folded &&
          !seat.sittingOut &&
          seat.cards.length > 0
        ) {
          // Players who made it to showdown show their cards
          HandHistory.recordShowdown(gameId, seat.player.id, seat.cards, true);
        }
      }

      // Use the first pot result (main pot) for winner message
      if (potResults.length > 0 && potResults[0].winners.length > 0) {
        const mainPot = potResults[0];
        const winnerSeatIndex = mainPot.winners[0];
        const winnerSeat =
          /** @type {import('./poker/seat.js').OccupiedSeat} */ (
            game.seats[winnerSeatIndex]
          );
        game.winnerMessage = {
          playerName: winnerSeat.player?.name || `Seat ${winnerSeatIndex + 1}`,
          handRank: mainPot.winningHand
            ? HandRankings.formatHand(mainPot.winningHand)
            : null,
          amount: mainPot.awards.reduce((sum, a) => sum + a.amount, 0),
        };
      }

      // Finalize hand history with pot results
      HandHistory.finalizeHand(gameId, game, potResults);

      // Log hand ended with showdown results
      if (potResults.length > 0 && potResults[0].winners.length > 0) {
        const mainPot = potResults[0];
        const winnerSeatIndex = mainPot.winners[0];
        const winnerSeat =
          /** @type {import('./poker/seat.js').OccupiedSeat} */ (
            game.seats[winnerSeatIndex]
          );
        logger.info("hand ended", {
          gameId,
          handNumber: HandHistory.getHandNumber(gameId),
          winner: winnerSeat.player?.name || `Seat ${winnerSeatIndex + 1}`,
          wonBy: mainPot.winningHand
            ? HandRankings.formatHand(mainPot.winningHand)
            : "showdown",
          amount: mainPot.awards.reduce((sum, a) => sum + a.amount, 0),
        });
      }

      PokerActions.endHand(game);
      autoStartNextHand(game, gameId);
      return;
    }

    // If actingSeat is still -1 after starting new round (everyone all-in),
    // continue looping to deal next street
  }
}

/**
 * @param {Game} game
 * @param {string} gameId
 */
function autoStartNextHand(game, gameId) {
  sitOutDisconnectedPlayers(game);

  if (PokerActions.countPlayersWithChips(game) >= 2) {
    game.countdown = 3; // Shorter countdown between hands
    startGameTick(game, gameId);
  }
}

// Timer interval in ms (can be reduced via TIMER_SPEED env var for faster e2e tests)
const TIMER_INTERVAL = process.env.TIMER_SPEED
  ? Math.floor(1000 / parseInt(process.env.TIMER_SPEED, 10))
  : 1000;

/**
 * @param {Game} game
 * @param {PlayerType} player
 * @returns {number} Seat index or -1 if not found
 */
function findPlayerSeatIndex(game, player) {
  return game.seats.findIndex(
    (seat) => !seat.empty && seat.player?.id === player.id,
  );
}

/**
 * @param {Game} game
 * @param {string} gameId
 * @param {number} seatIndex
 */
function performAutoAction(game, gameId, seatIndex) {
  const seat = game.seats[seatIndex];
  if (seat.empty) return;

  // Auto check/fold: check if possible, otherwise fold
  if (seat.bet === game.hand.currentBet) {
    PokerActions.check(game, { seat: seatIndex });
    HandHistory.recordAction(gameId, seat.player.id, "check");
  } else {
    PokerActions.fold(game, { seat: seatIndex });
    HandHistory.recordAction(gameId, seat.player.id, "fold");
  }

  // Reset tick counters since action was taken
  resetActingTicks(game);

  // Process game flow after the auto-action
  processGameFlow(game, gameId);
}

/**
 * @param {Game} game
 * @param {string} gameId
 */
function startHand(game, gameId) {
  // Check if we still have enough players (someone might have sat out)
  if (PokerActions.countPlayersWithChips(game) < 2) {
    return;
  }

  game.winnerMessage = null;
  PokerActions.startHand(game);
  HandHistory.startHand(gameId, game);

  const playerCount = game.seats.filter(
    (s) => !s.empty && !s.sittingOut,
  ).length;
  logger.info("hand started", {
    gameId,
    handNumber: HandHistory.getHandNumber(gameId),
    playerCount,
  });

  const sbSeat = Betting.getSmallBlindSeat(game);
  const bbSeat = Betting.getBigBlindSeat(game);
  runAll(PokerActions.blinds(game));

  const sbPlayer = /** @type {import('./poker/seat.js').OccupiedSeat} */ (
    game.seats[sbSeat]
  );
  const bbPlayer = /** @type {import('./poker/seat.js').OccupiedSeat} */ (
    game.seats[bbSeat]
  );
  HandHistory.recordBlind(gameId, sbPlayer.player.id, "sb", sbPlayer.bet);
  HandHistory.recordBlind(gameId, bbPlayer.player.id, "bb", bbPlayer.bet);

  runAll(PokerActions.dealPreflop(game));

  for (const seat of game.seats) {
    if (!seat.empty && !seat.sittingOut && seat.cards.length > 0) {
      HandHistory.recordDealtCards(gameId, seat.player.id, seat.cards);
    }
  }

  Betting.startBettingRound(game, "preflop");
  game.hand.currentBet = game.blinds.big; // Blinds already posted
  resetActingTicks(game);
}

/** @param {Game} game */
function sitOutDisconnectedPlayers(game) {
  for (const seat of game.seats) {
    if (!seat.empty && seat.disconnected && !seat.sittingOut) {
      seat.sittingOut = true;
    }
  }
}

/** @param {Game} game */
function stopGameTick(game) {
  if (game.tickTimer) {
    clearInterval(game.tickTimer);
    game.tickTimer = null;
  }
}

/**
 * @param {Game} game
 * @param {string} gameId
 */
function startGameTick(game, gameId) {
  if (game.tickTimer) {
    return; // Already running
  }

  game.tickTimer = setInterval(() => {
    const result = tick(game);

    // Handle startHand event
    if (result.startHand) {
      startHand(game, gameId);
    }

    // Handle auto-action (disconnect or clock expiry)
    if (result.autoActionSeat !== null) {
      performAutoAction(game, gameId, result.autoActionSeat);
    }

    // Stop tick if no longer needed
    if (result.shouldStopTick) {
      stopGameTick(game);
    }

    // Broadcast state to all clients
    if (result.shouldBroadcast) {
      broadcastGameState(gameId);
    }
  }, TIMER_INTERVAL);
}

/**
 * @param {Game} game
 * @param {string} gameId
 */
function ensureGameTick(game, gameId) {
  if (shouldTickBeRunning(game) && !game.tickTimer) {
    startGameTick(game, gameId);
  }
}

wss.on(
  "connection",
  async function connection(ws, request, player, game, gameId) {
    clientConnections.set(ws, { player, gameId });
    logger.info("ws connected", { gameId, playerId: player.id });

    // Mark player as connected if they have a seat
    const seatIndex = findPlayerSeatIndex(game, player);
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

      const closedSeatIndex = findPlayerSeatIndex(closedGame, closedPlayer);
      if (closedSeatIndex === -1 || closedGame.seats[closedSeatIndex].empty)
        return;

      const closedSeat = /** @type {import('./poker/seat.js').OccupiedSeat} */ (
        closedGame.seats[closedSeatIndex]
      );

      closedSeat.disconnected = true;
      ensureGameTick(closedGame, closedGameId);
      broadcastGameState(closedGameId);
    });

    ws.on("message", function (rawMessage) {
      const { action, ...args } = JSON.parse(rawMessage);
      const bettingActions = ["check", "call", "bet", "raise", "fold", "allIn"];

      // Handle setName separately (not a poker action)
      if (action === "setName") {
        const name = args.name?.trim().substring(0, 20) || null;
        player.name = name;
        PlayerStore.save(player);
        broadcastGameState(gameId);
        return;
      }

      // Capture seat state before action for history recording
      const seatIndex = findPlayerSeatIndex(game, player);
      const seatBefore =
        seatIndex !== -1 && !game.seats[seatIndex].empty
          ? /** @type {import('./poker/seat.js').OccupiedSeat} */ (
              game.seats[seatIndex]
            )
          : null;
      const betBefore = seatBefore?.bet || 0;

      try {
        PokerActions[action](game, { player, ...args });

        // Log game actions (debug for betting, info for others)
        const logFn = bettingActions.includes(action)
          ? logger.debug
          : logger.info;
        logFn("game action", { gameId, playerId: player.id, action });

        // Record betting actions to history
        if (bettingActions.includes(action) && seatBefore) {
          const seatAfter =
            /** @type {import('./poker/seat.js').OccupiedSeat} */ (
              game.seats[seatIndex]
            );
          const isAllIn = seatAfter.allIn;

          if (action === "fold") {
            HandHistory.recordAction(gameId, player.id, "fold");
          } else if (action === "check") {
            HandHistory.recordAction(gameId, player.id, "check");
          } else if (action === "call") {
            HandHistory.recordAction(
              gameId,
              player.id,
              "call",
              seatAfter.bet,
              isAllIn,
            );
          } else if (action === "bet") {
            HandHistory.recordAction(
              gameId,
              player.id,
              "bet",
              seatAfter.bet,
              isAllIn,
            );
          } else if (action === "raise") {
            HandHistory.recordAction(
              gameId,
              player.id,
              "raise",
              seatAfter.bet,
              isAllIn,
            );
          } else if (action === "allIn") {
            // Determine if it's a call, bet, or raise based on context
            const currentBet = game.hand.currentBet;
            if (betBefore >= currentBet || seatAfter.bet <= currentBet) {
              HandHistory.recordAction(
                gameId,
                player.id,
                "call",
                seatAfter.bet,
                true,
              );
            } else if (currentBet === 0) {
              HandHistory.recordAction(
                gameId,
                player.id,
                "bet",
                seatAfter.bet,
                true,
              );
            } else {
              HandHistory.recordAction(
                gameId,
                player.id,
                "raise",
                seatAfter.bet,
                true,
              );
            }
          }
        }

        // If start action was called, begin game tick
        if (action === "start" && game.countdown !== null) {
          startGameTick(game, gameId);
        }

        // Cancel countdown if sitOut or leave reduces active players below 2
        if (
          (action === "sitOut" || action === "leave") &&
          game.countdown !== null
        ) {
          if (PokerActions.countPlayersWithChips(game) < 2) {
            game.countdown = null;
            stopGameTick(game);
          }
        }

        // Process game flow after betting actions
        if (bettingActions.includes(action)) {
          // Reset tick counters since player took action
          resetActingTicks(game);
          processGameFlow(game, gameId);
        }

        // Start clock countdown when callClock action is called
        if (action === "callClock") {
          startClockTicks(game);
        }
      } catch (err) {
        logger.error("action error", {
          gameId,
          playerId: player.id,
          action,
          error: err instanceof Error ? err.message : String(err),
        });
        ws.send(
          JSON.stringify(
            {
              error: {
                message: err instanceof Error ? err.message : String(err),
              },
            },
            null,
            2,
          ),
        );
      }

      // Broadcast updated game state to clients in this game
      broadcastGameState(gameId);

      // Ensure tick is running if needed (e.g., someone is acting)
      ensureGameTick(game, gameId);
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
