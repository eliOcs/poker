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

const server = https.createServer({
  key: fs.readFileSync(process.env.HTTPS_KEY),
  cert: fs.readFileSync(process.env.HTTPS_CERT),
});

server.on("error", (err) => console.error(err));

let files = {
  "/": "src/frontend/index.html",
};
for (const file of fs.readdirSync("src/frontend")) {
  const ext = path.extname(file);
  if (ext === ".html" || ext === ".js" || ext === ".css") {
    files["/" + file] = "src/frontend/" + file;
  }
}

function respondWithFile(filePath, res, headers) {
  res.writeHead(200, {
    "content-type": mime.contentType(path.extname(filePath)),
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

function parseCookies(rawCookies) {
  const cookies = {};
  for (const rawCookie of rawCookies.split("; ")) {
    const [key, value] = rawCookie.split("=");
    cookies[key] = value;
  }
  return cookies;
}

const players = {};

server.on("request", (req, res) => {
  if (req.method === "GET" && req.url in files) {
    const resHeaders = {};
    if (req.url === "/") {
      const p = Player.create();
      players[p.id] = p;
      resHeaders["Set-Cookie"] =
        `phg=${p.id}; Domain=${process.env.DOMAIN}; Secure; HttpOnly`;
    }
    respondWithFile(files[req.url], res, resHeaders);
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.on("upgrade", function upgrade(request, socket, head) {
  const cookies = parseCookies(request.headers.cookie);
  const player = players[cookies.phg];
  if (player) {
    wss.handleUpgrade(request, socket, head, (ws) =>
      wss.emit("connection", ws, request, player),
    );
  } else {
    socket.end("HTTP/1.1 401 Unauthorized\r\n\r\n");
  }
});

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const game = PokerGame.create();
const wss = new WebSocketServer({ noServer: true });
wss.on("connection", async function connection(ws, request, player) {
  ws.on("message", function (rawMessage) {
    const { action, ...args } = JSON.parse(rawMessage);
    try {
      PokerActions[action](game, { player, ...args });
    } catch (err) {
      ws.send(JSON.stringify({ error: { message: err.message } }, null, 2));
    }
  });

  while (game.running) {
    PokerGame.next(game);
    ws.send(JSON.stringify(playerView(game, player), null, 2));
    await sleep(200);
  }
});

server.listen(process.env.PORT);
