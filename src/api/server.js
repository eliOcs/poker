import http2 from "http2";
import fs from "fs";

export function create() {
  const server = http2.createSecureServer({
    key: fs.readFileSync(process.env.HTTPS_KEY),
    cert: fs.readFileSync(process.env.HTTPS_CERT),
  });

  server.on("error", (err) => console.error(err));

  server.on("stream", (stream) => {
    stream.respond({
      "content-type": "text/html; charset=utf-8",
      ":status": 200,
    });
    stream.end("<h1>Hello World</h1>");
  });
  return server;
}
