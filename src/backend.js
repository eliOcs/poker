import * as fs from "fs";
import path from "path";
import mime from "mime-types";
import https from "https";
import { WebSocketServer } from "ws";
import * as pokerGame from "./poker/game.js";
import { randomBytes } from "crypto";

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
  fs.createReadStream(filePath).pipe(res);
}

function parseCookies(rawCookies) {
  const cookies = {};
  for (const rawCookie of rawCookies.split(";")) {
    const [key, value] = rawCookie.split("=");
    cookies[key] = value;
  }
  return cookies;
}

async function generateId() {
  return new Promise((res, rej) => {
    randomBytes(32, (err, buf) => {
      if (err) return rej(err);
      res(buf.toString("hex"));
    });
  });
}

server.on("request", async (req, res) => {
  if (req.method === "GET" && req.url in files) {
    const resHeaders = {};
    if (req.url === "/") {
      const cookies = parseCookies(req.headers.cookie);
      if (!("phg" in cookies)) {
        resHeaders[
          "Set-Cookie"
        ] = `phg=${await generateId()}; Domain=localhost; Secure; HttpOnly`;
      }
    }
    respondWithFile(files[req.url], res, resHeaders);
  } else {
    res.writeHead(404);
    res.end();
  }
});

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const wss = new WebSocketServer({ server });
wss.on("connection", async function connection(ws) {
  let game = pokerGame.create();
  while (game.running) {
    game = pokerGame.next(game);
    ws.send(JSON.stringify(game, null, 2));
    await sleep(200);
  }
});

server.listen(process.env.PORT);
