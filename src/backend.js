import fs from "fs";
import path from "path";
import mime from "mime-types";
import http2 from "http2";
const { HTTP2_HEADER_METHOD, HTTP2_HEADER_PATH, HTTP2_HEADER_STATUS } =
  http2.constants;

const server = http2.createSecureServer({
  key: fs.readFileSync(process.env.HTTPS_KEY),
  cert: fs.readFileSync(process.env.HTTPS_CERT),
});

server.on("error", (err) => console.error(err));

const files = {
  "/": "src/frontend/index.html",
  "/index.js": "src/frontend/index.js",
};

function respondWithFile(filePath, stream) {
  const fileDescriptor = fs.openSync(filePath, "r");
  const stat = fs.fstatSync(fileDescriptor);
  const headers = {
    "content-length": stat.size,
    "last-modified": stat.mtime.toUTCString(),
    "content-type": mime.contentType(path.extname(filePath)),
  };
  stream.respondWithFD(fileDescriptor, headers);
  stream.on("close", () => fs.closeSync(fileDescriptor));
}

server.on("stream", (stream, headers) => {
  const method = headers[HTTP2_HEADER_METHOD];
  const path = headers[HTTP2_HEADER_PATH];
  if (method === "GET" && path in files) {
    respondWithFile(files[path], stream);
  } else {
    stream.respond({ [HTTP2_HEADER_STATUS]: 404 });
    stream.end();
  }
});

server.listen(process.env.PORT);
