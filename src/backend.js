import * as fs from "fs/promises";
import { readFileSync } from "fs";
import path from "path";
import mime from "mime-types";
import http2 from "http2";
const { HTTP2_HEADER_METHOD, HTTP2_HEADER_PATH, HTTP2_HEADER_STATUS } =
  http2.constants;

const server = http2.createSecureServer({
  key: readFileSync(process.env.HTTPS_KEY),
  cert: readFileSync(process.env.HTTPS_CERT),
});

server.on("error", (err) => console.error(err));

const files = {
  "/": "src/frontend/index.html",
  "/index.js": "src/frontend/index.js",
};

async function respondWithFile(filePath, stream) {
  const fileDescriptor = await fs.open(filePath, "r");
  const stat = await fileDescriptor.stat();
  const headers = {
    "content-length": stat.size,
    "last-modified": stat.mtime.toUTCString(),
    "content-type": mime.contentType(path.extname(filePath)),
  };
  stream.respondWithFD(fileDescriptor, headers);
  stream.on("close", async () => await fileDescriptor.close());
}

server.on("stream", async (stream, headers) => {
  const method = headers[HTTP2_HEADER_METHOD];
  const path = headers[HTTP2_HEADER_PATH];
  if (method === "GET" && path in files) {
    await respondWithFile(files[path], stream);
  } else {
    stream.respond({ [HTTP2_HEADER_STATUS]: 404 });
    stream.end();
  }
});

server.listen(process.env.PORT);
