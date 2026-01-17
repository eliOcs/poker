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
import HandRankings from "./poker/hand-rankings.js";
import * as HandHistory from "./poker/hand-history.js";
import {
  tick,
  shouldTickBeRunning,
  resetActingTicks,
  startClockTicks,
} from "./poker/game-tick.js";
import * as logger from "./logger.js";

/**
 * @typedef {import('./poker/seat.js').Player} PlayerType
 * @typedef {import('./poker/game.js').Game} Game
 */

const server = http.createServer();

/**
 * Parses cookie header into object
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
 * Gets or creates a player from cookie
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {PlayerType}
 */
function getOrCreatePlayer(req, res) {
  const cookies = parseCookies(req.headers.cookie ?? "");
  let player = players[cookies.phg];

  if (!player) {
    player = Player.create();
    players[player.id] = player;
    res.setHeader(
      "Set-Cookie",
      `phg=${player.id}; Domain=${process.env.DOMAIN}; HttpOnly; Path=/`,
    );
  }

  return player;
}

/** @type {Record<string, PlayerType>} */
const players = {};

/** @type {Map<string, Game>} */
const games = new Map();

/**
 * Generates a short game ID
 * @returns {string}
 */
function generateGameId() {
  return crypto.randomBytes(4).toString("hex");
}

server.on("request", (req, res) => {
  const url = req.url ?? "";
  const method = req.method ?? "GET";
  const startTime = Date.now();

  // Log HTTP request when response finishes
  res.on("finish", () => {
    // Skip health check endpoint to reduce noise
    if (url !== "/up") {
      logger.info("http request", {
        method,
        path: url,
        status: res.statusCode,
        duration: Date.now() - startTime,
      });
    }
  });

  // Health check endpoint (for Kamal Proxy)
  if (method === "GET" && url === "/up") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("OK");
    return;
  }

  // Home page
  if (method === "GET" && url === "/") {
    getOrCreatePlayer(req, res);
    respondWithFile("src/frontend/index.html", res);
    return;
  }

  // Create game
  if (method === "POST" && url === "/games") {
    getOrCreatePlayer(req, res);
    const gameId = generateGameId();
    const game = PokerGame.create();
    games.set(gameId, game);

    logger.info("game created", { gameId });

    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ id: gameId }));
    return;
  }

  // Game page - serve SPA for all game routes, let frontend handle not-found
  const gameMatch = url.match(/^\/games\/([a-z0-9]+)$/);
  if (method === "GET" && gameMatch) {
    getOrCreatePlayer(req, res);
    respondWithFile("src/frontend/index.html", res);
    return;
  }

  // History page - serve SPA
  const historyPageMatch = url.match(/^\/history\/([a-z0-9]+)(\/\d+)?$/);
  if (method === "GET" && historyPageMatch) {
    getOrCreatePlayer(req, res);
    respondWithFile("src/frontend/index.html", res);
    return;
  }

  // API: List hands for a game
  const historyListMatch = url.match(/^\/api\/history\/([a-z0-9]+)$/);
  if (method === "GET" && historyListMatch) {
    const historyGameId = historyListMatch[1];
    const player = getOrCreatePlayer(req, res);

    HandHistory.getAllHands(historyGameId)
      .then((hands) => {
        const summaries = hands.map((hand) =>
          HandHistory.getHandSummary(hand, player.id),
        );
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ hands: summaries }));
      })
      .catch((err) => {
        logger.error("api error", { path: url, error: err.message });
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      });
    return;
  }

  // API: Get specific hand
  const historyHandMatch = url.match(/^\/api\/history\/([a-z0-9]+)\/(\d+)$/);
  if (method === "GET" && historyHandMatch) {
    const historyGameId = historyHandMatch[1];
    const handNumber = parseInt(historyHandMatch[2], 10);
    const player = getOrCreatePlayer(req, res);

    HandHistory.getHand(historyGameId, handNumber)
      .then((hand) => {
        if (!hand) {
          res.writeHead(404, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: "Hand not found" }));
          return;
        }

        const filteredHand = HandHistory.filterHandForPlayer(hand, player.id);
        const view = HandHistory.getHandView(filteredHand, player.id);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ hand: filteredHand, view }));
      })
      .catch((err) => {
        logger.error("api error", { path: url, error: err.message });
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      });
    return;
  }

  // Static files and node modules
  const filePath = getFilePath(url);
  if (method === "GET" && filePath) {
    respondWithFile(filePath, res);
    return;
  }

  res.writeHead(404);
  res.end();
});

server.on("upgrade", function upgrade(request, socket, head) {
  const cookies = parseCookies(request.headers.cookie ?? "");
  const player = players[cookies.phg];

  // Parse game ID from URL: /games/:id
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

/**
 * Exhausts a generator (runs all steps without delay)
 * @param {Generator} gen
 */
function runAll(gen) {
  while (!gen.next().done);
}

/** @type {Map<import('ws').WebSocket, { player: PlayerType, gameId: string }>} */
const clientConnections = new Map();

/**
 * Broadcasts game state to all clients in a specific game
 * @param {string} gameId
 */
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
 * Processes game flow after a betting action
 * Checks if round is complete and advances to next phase
 * Loops through all remaining streets when everyone is all-in
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

    // Collect bets
    Betting.collectBets(game);

    // Advance to next phase
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
      // Go to showdown
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
 * Automatically starts countdown for next hand if enough players
 * @param {Game} game
 * @param {string} gameId
 */
function autoStartNextHand(game, gameId) {
  // Sit out any disconnected players
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
 * Finds the seat index for a player in a game
 * @param {Game} game
 * @param {PlayerType} player
 * @returns {number} - Seat index or -1 if not found
 */
function findPlayerSeatIndex(game, player) {
  return game.seats.findIndex(
    (seat) => !seat.empty && seat.player?.id === player.id,
  );
}

/**
 * Performs auto check/fold for a seat
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
 * Starts the hand (called when countdown reaches 0)
 * @param {Game} game
 * @param {string} gameId
 */
function startHand(game, gameId) {
  // Check if we still have enough players (someone might have sat out)
  if (PokerActions.countPlayersWithChips(game) < 2) {
    return;
  }

  // Clear winner message from previous hand
  game.winnerMessage = null;

  // Start the hand
  PokerActions.startHand(game);

  // Start hand history recording
  HandHistory.startHand(gameId, game);

  // Count active players
  const playerCount = game.seats.filter(
    (s) => !s.empty && !s.sittingOut,
  ).length;
  logger.info("hand started", {
    gameId,
    handNumber: HandHistory.getHandNumber(gameId),
    playerCount,
  });

  // Post blinds and record them
  const sbSeat = Betting.getSmallBlindSeat(game);
  const bbSeat = Betting.getBigBlindSeat(game);
  runAll(PokerActions.blinds(game));

  // Record blinds to history
  const sbPlayer = /** @type {import('./poker/seat.js').OccupiedSeat} */ (
    game.seats[sbSeat]
  );
  const bbPlayer = /** @type {import('./poker/seat.js').OccupiedSeat} */ (
    game.seats[bbSeat]
  );
  HandHistory.recordBlind(gameId, sbPlayer.player.id, "sb", sbPlayer.bet);
  HandHistory.recordBlind(gameId, bbPlayer.player.id, "bb", bbPlayer.bet);

  // Deal preflop and record cards
  runAll(PokerActions.dealPreflop(game));

  // Record dealt cards for each player
  for (const seat of game.seats) {
    if (!seat.empty && !seat.sittingOut && seat.cards.length > 0) {
      HandHistory.recordDealtCards(gameId, seat.player.id, seat.cards);
    }
  }

  // Initialize betting round
  Betting.startBettingRound(game, "preflop");
  // Set currentBet to big blind (blinds already posted)
  game.hand.currentBet = game.blinds.big;

  // Reset tick counters for first player to act
  resetActingTicks(game);
}

/**
 * Sits out all disconnected players at end of hand
 * @param {Game} game
 */
function sitOutDisconnectedPlayers(game) {
  for (const seat of game.seats) {
    if (!seat.empty && seat.disconnected && !seat.sittingOut) {
      seat.sittingOut = true;
    }
  }
}

/**
 * Stops the game tick timer
 * @param {Game} game
 */
function stopGameTick(game) {
  if (game.tickTimer) {
    clearInterval(game.tickTimer);
    game.tickTimer = null;
  }
}

/**
 * Starts the unified game tick timer
 * Handles countdown, disconnect timeout, and clock expiry
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
 * Ensures the game tick is running if needed
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

      // Mark seat as disconnected
      closedSeat.disconnected = true;

      // Ensure tick is running to handle disconnect timeout
      ensureGameTick(closedGame, closedGameId);

      // Broadcast updated state (shows DISCONNECTED status)
      broadcastGameState(closedGameId);
    });

    ws.on("message", function (rawMessage) {
      const { action, ...args } = JSON.parse(rawMessage);
      const bettingActions = ["check", "call", "bet", "raise", "fold", "allIn"];

      // Handle setName separately (not a poker action)
      if (action === "setName") {
        const name = args.name?.trim().substring(0, 20) || null;
        player.name = name;
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

server.listen(process.env.PORT);
