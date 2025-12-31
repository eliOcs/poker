import * as fs from "fs";
import path from "path";
import stream from "stream";
import mime from "mime-types";
import https from "https";
import { WebSocketServer } from "ws";
import playerView from "./poker/player-view.js";
import * as PokerGame from "./poker/game.js";
import * as PokerActions from "./poker/actions.js";
import * as Player from "./poker/player.js";

/**
 * @typedef {import('./poker/seat.js').Player} PlayerType
 */

if (!process.env.HTTPS_KEY || !process.env.HTTPS_CERT) {
  throw new Error(
    "HTTPS_KEY and HTTPS_CERT environment variables are required",
  );
}

const server = https.createServer({
  key: fs.readFileSync(process.env.HTTPS_KEY),
  cert: fs.readFileSync(process.env.HTTPS_CERT),
});

server.on("error", (err) => console.error(err));

/** @type {Record<string, string>} */
const files = {
  "/": "src/frontend/index.html",
};
for (const file of fs.readdirSync("src/frontend")) {
  const ext = path.extname(file);
  if (ext === ".html" || ext === ".js" || ext === ".css") {
    files["/" + file] = "src/frontend/" + file;
  }
}

/**
 * Responds with a file, injecting environment variables
 * @param {string} filePath
 * @param {import('http').ServerResponse} res
 * @param {Record<string, string>} headers
 */
function respondWithFile(filePath, res, headers) {
  const contentType = mime.contentType(path.extname(filePath));
  res.writeHead(200, {
    "content-type": contentType || "application/octet-stream",
    ...headers,
  });

  const injectEnv = new stream.Transform({
    transform: function transformer(chunk, encoding, callback) {
      callback(
        null,
        String(chunk).replace(/process\.env\.([A-Z_]+)/g, (match, key) =>
          JSON.stringify(process.env[key]),
        ),
      );
    },
  });
  fs.createReadStream(filePath).pipe(injectEnv).pipe(res);
}

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

/** @type {Record<string, PlayerType>} */
const players = {};

server.on("request", (req, res) => {
  const url = req.url ?? "";
  if (req.method === "GET" && url in files) {
    /** @type {Record<string, string>} */
    const resHeaders = {};
    if (url === "/") {
      const p = Player.create();
      players[p.id] = p;
      resHeaders["Set-Cookie"] =
        `phg=${p.id}; Domain=${process.env.DOMAIN}; Secure; HttpOnly`;
    }
    respondWithFile(files[url], res, resHeaders);
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.on("upgrade", function upgrade(request, socket, head) {
  const cookies = parseCookies(request.headers.cookie ?? "");
  const player = players[cookies.phg];
  if (player) {
    wss.handleUpgrade(request, socket, head, (ws) =>
      wss.emit("connection", ws, request, player),
    );
  } else {
    socket.end("HTTP/1.1 401 Unauthorized\r\n\r\n");
  }
});

const game = PokerGame.create();
const wss = new WebSocketServer({ noServer: true });

/**
 * Exhausts a generator (runs all steps without delay)
 * @param {Generator} gen
 */
function runAll(gen) {
  while (!gen.next().done);
}

/** @type {Map<import('ws').WebSocket, PlayerType>} */
const clientPlayers = new Map();

/**
 * Broadcasts game state to all connected clients
 */
function broadcastGameState() {
  for (const [ws, player] of clientPlayers) {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(playerView(game, player), null, 2));
    }
  }
}

/** @type {NodeJS.Timeout|null} */
let countdownTimer = null;

/**
 * Starts the countdown timer
 */
function startCountdownTimer() {
  if (countdownTimer) return;

  countdownTimer = setInterval(() => {
    if (game.countdown === null) {
      if (countdownTimer) clearInterval(countdownTimer);
      countdownTimer = null;
      return;
    }

    game.countdown -= 1;

    if (game.countdown <= 0) {
      game.countdown = null;
      if (countdownTimer) clearInterval(countdownTimer);
      countdownTimer = null;

      // Start the hand
      PokerActions.startHand(game);
      // Post blinds
      runAll(PokerActions.blinds(game));
      // Deal preflop
      runAll(PokerActions.dealPreflop(game));
      // Set first player to act
      const firstToAct = game.seats.findIndex(
        (s, i) => !s.empty && s.stack > 0 && i !== game.button,
      );
      game.hand.actingSeat = firstToAct;
      game.hand.currentBet = game.blinds.big;
    }

    broadcastGameState();
  }, 1000);
}

wss.on("connection", async function connection(ws, request, player) {
  clientPlayers.set(ws, player);

  ws.on("close", () => {
    clientPlayers.delete(ws);
  });

  ws.on("message", function (rawMessage) {
    const { action, ...args } = JSON.parse(rawMessage);
    try {
      PokerActions[action](game, { player, ...args });

      // If start action was called, begin countdown timer
      if (action === "start" && game.countdown !== null) {
        startCountdownTimer();
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
    // Broadcast updated game state to all clients
    broadcastGameState();
  });

  // Send initial game state
  ws.send(JSON.stringify(playerView(game, player), null, 2));
});

server.listen(process.env.PORT);
