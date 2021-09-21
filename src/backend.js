import * as fs from "fs";
import path from "path";
import mime from "mime-types";
import https from "https";
import { WebSocketServer } from "ws";

const server = https.createServer({
  key: fs.readFileSync(process.env.HTTPS_KEY),
  cert: fs.readFileSync(process.env.HTTPS_CERT),
});

server.on("error", (err) => console.error(err));

const files = {
  "/": "src/frontend/index.html",
  "/index.js": "src/frontend/index.js",
};

function respondWithFile(filePath, res) {
  res.writeHead(200, {
    "content-type": mime.contentType(path.extname(filePath)),
  });
  fs.createReadStream(filePath).pipe(res);
}

server.on("request", (req, res) => {
  if (req.method === "GET" && req.url in files) {
    respondWithFile(files[req.url], res);
  } else {
    res.writeHead(404);
    res.end();
  }
});

const wss = new WebSocketServer({ server });
wss.on("connection", function connection(ws) {
  ws.on("message", function incoming(message) {
    console.log("received: %s", message);
  });

  ws.send("something");
});

server.listen(process.env.PORT);
