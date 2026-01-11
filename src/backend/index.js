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
 * @returns {{ player: PlayerType, isNew: boolean }}
 */
function getOrCreatePlayer(req, res) {
  const cookies = parseCookies(req.headers.cookie ?? "");
  let player = players[cookies.phg];
  let isNew = false;

  if (!player) {
    player = Player.create();
    players[player.id] = player;
    res.setHeader(
      "Set-Cookie",
      `phg=${player.id}; Domain=${process.env.DOMAIN}; HttpOnly; Path=/`,
    );
    isNew = true;
  }

  return { player, isNew };
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
    const gameId = generateGameId();
    const game = PokerGame.create();
    games.set(gameId, game);

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
      }
      PokerActions.endHand(game);
      autoStartNextHand(game, gameId);
      return;
    }

    // Check if betting round is complete
    if (game.hand.actingSeat !== -1) {
      // Someone still needs to act - check if they're disconnected
      checkDisconnectedActingPlayer(game, gameId);
      return;
    }

    // Collect bets
    Betting.collectBets(game);

    // Advance to next phase
    if (phase === "preflop") {
      runAll(PokerActions.dealFlop(game));
      Betting.startBettingRound(game, "flop");
    } else if (phase === "flop") {
      runAll(PokerActions.dealTurn(game));
      Betting.startBettingRound(game, "turn");
    } else if (phase === "turn") {
      runAll(PokerActions.dealRiver(game));
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
    startCountdownTimer(game, gameId);
  }
}

// Timer interval in ms (can be reduced via TIMER_SPEED env var for faster e2e tests)
const TIMER_INTERVAL = process.env.TIMER_SPEED
  ? Math.floor(1000 / parseInt(process.env.TIMER_SPEED, 10))
  : 1000;

// Disconnect action timeout in ms (5 seconds, can be sped up for tests)
const DISCONNECT_TIMEOUT = process.env.TIMER_SPEED
  ? Math.floor(5000 / parseInt(process.env.TIMER_SPEED, 10))
  : 5000;

// Clock duration in ms (30 seconds, can be sped up for tests)
const CLOCK_DURATION = process.env.TIMER_SPEED
  ? Math.floor(30000 / parseInt(process.env.TIMER_SPEED, 10))
  : 30000;

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
 * Starts a timer to auto-action for a disconnected player
 * @param {Game} game
 * @param {string} gameId
 * @param {number} seatIndex
 */
function startDisconnectTimer(game, gameId, seatIndex) {
  // Clear any existing timer
  if (game.disconnectTimer) {
    clearTimeout(game.disconnectTimer);
  }

  game.disconnectTimerSeat = seatIndex;
  game.disconnectTimer = setTimeout(() => {
    game.disconnectTimer = null;
    game.disconnectTimerSeat = -1;

    // Verify it's still this player's turn and they're still disconnected
    const seat = game.seats[seatIndex];
    if (
      game.hand?.actingSeat !== seatIndex ||
      seat.empty ||
      !seat.disconnected
    ) {
      return;
    }

    // Auto check/fold: check if possible, otherwise fold
    if (seat.bet === game.hand.currentBet) {
      PokerActions.check(game, { seat: seatIndex });
    } else {
      PokerActions.fold(game, { seat: seatIndex });
    }

    // Process game flow after the auto-action
    processGameFlow(game, gameId);
    broadcastGameState(gameId);
  }, DISCONNECT_TIMEOUT);
}

/**
 * Clears the clock timer if active
 * @param {Game} game
 */
function clearClockTimer(game) {
  if (game.clockTimer) {
    clearTimeout(game.clockTimer);
    game.clockTimer = null;
  }
}

/**
 * Starts a timer for call the clock (30 second countdown)
 * @param {Game} game
 * @param {string} gameId
 */
function startClockTimer(game, gameId) {
  clearClockTimer(game);

  game.clockTimer = setTimeout(() => {
    game.clockTimer = null;

    const actingSeat = game.hand?.actingSeat;
    if (actingSeat === -1 || actingSeat === undefined) return;

    const seat = game.seats[actingSeat];
    if (seat.empty) return;

    // Auto check/fold: check if possible, otherwise fold
    if (seat.bet === game.hand.currentBet) {
      PokerActions.check(game, { seat: actingSeat });
    } else {
      PokerActions.fold(game, { seat: actingSeat });
    }

    // Process game flow after the auto-action
    processGameFlow(game, gameId);
    broadcastGameState(gameId);
  }, CLOCK_DURATION);
}

/**
 * Checks if the acting player is disconnected and starts timer if so
 * @param {Game} game
 * @param {string} gameId
 */
function checkDisconnectedActingPlayer(game, gameId) {
  const actingSeat = game.hand?.actingSeat;
  if (actingSeat === -1 || actingSeat === undefined) return;

  const seat = game.seats[actingSeat];
  if (!seat.empty && seat.disconnected) {
    startDisconnectTimer(game, gameId, actingSeat);
  }
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
 * Starts the countdown timer for a specific game
 * @param {Game} game
 * @param {string} gameId
 */
function startCountdownTimer(game, gameId) {
  if (game.countdownTimer) {
    return;
  }

  game.countdownTimer = setInterval(() => {
    if (game.countdown === null) {
      if (game.countdownTimer) clearInterval(game.countdownTimer);
      game.countdownTimer = null;
      return;
    }

    game.countdown -= 1;

    if (game.countdown <= 0) {
      game.countdown = null;
      if (game.countdownTimer) clearInterval(game.countdownTimer);
      game.countdownTimer = null;

      // Check if we still have enough players (someone might have sat out)
      if (PokerActions.countPlayersWithChips(game) < 2) {
        broadcastGameState(gameId);
        return;
      }

      // Clear winner message from previous hand
      game.winnerMessage = null;

      // Start the hand
      PokerActions.startHand(game);
      // Post blinds
      runAll(PokerActions.blinds(game));
      // Deal preflop
      runAll(PokerActions.dealPreflop(game));
      // Initialize betting round
      Betting.startBettingRound(game, "preflop");
      // Set currentBet to big blind (blinds already posted)
      game.hand.currentBet = game.blinds.big;

      // Check if first to act is disconnected
      checkDisconnectedActingPlayer(game, gameId);
    }

    broadcastGameState(gameId);
  }, TIMER_INTERVAL);
}

wss.on(
  "connection",
  async function connection(ws, request, player, game, gameId) {
    clientConnections.set(ws, { player, gameId });

    // Mark player as connected if they have a seat
    const seatIndex = findPlayerSeatIndex(game, player);
    if (seatIndex !== -1 && !game.seats[seatIndex].empty) {
      const seat = /** @type {import('./poker/seat.js').OccupiedSeat} */ (
        game.seats[seatIndex]
      );
      seat.disconnected = false;

      // Cancel any pending disconnect timer for this seat
      if (game.disconnectTimer && game.disconnectTimerSeat === seatIndex) {
        clearTimeout(game.disconnectTimer);
        game.disconnectTimer = null;
        game.disconnectTimerSeat = -1;
      }
    }

    ws.on("close", () => {
      const conn = clientConnections.get(ws);
      clientConnections.delete(ws);

      if (!conn) return;

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

      // If it's this player's turn, start disconnect timer
      if (closedGame.hand?.actingSeat === closedSeatIndex) {
        startDisconnectTimer(closedGame, closedGameId, closedSeatIndex);
      }

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

      try {
        PokerActions[action](game, { player, ...args });

        // If start action was called, begin countdown timer
        if (action === "start" && game.countdown !== null) {
          startCountdownTimer(game, gameId);
        }

        // Cancel countdown if sitOut or leave reduces active players below 2
        if ((action === "sitOut" || action === "leave") && game.countdown !== null) {
          if (PokerActions.countPlayersWithChips(game) < 2) {
            game.countdown = null;
            if (game.countdownTimer) {
              clearInterval(game.countdownTimer);
              game.countdownTimer = null;
            }
          }
        }

        // Start clock timer when clock is called
        if (action === "callClock") {
          startClockTimer(game, gameId);
        }

        // Process game flow after betting actions
        if (bettingActions.includes(action)) {
          // Clear clock timer since action was taken
          clearClockTimer(game);
          processGameFlow(game, gameId);
        }
      } catch (err) {
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
    });

    // Send initial game state
    ws.send(JSON.stringify(playerView(game, player), null, 2));
  },
);

server.listen(process.env.PORT);
