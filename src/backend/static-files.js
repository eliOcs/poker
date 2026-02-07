import * as fs from "fs";
import path from "path";
import stream from "stream";
import zlib from "zlib";

/**
 * Recursively collects all .js files from a directory
 * @param {string} dir
 * @param {string} baseUrl
 * @returns {Record<string, string>}
 */
export function collectJsFiles(dir, baseUrl) {
  /** @type {Record<string, string>} */
  const files = {};
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name);
    const urlPath = baseUrl + "/" + entry.name;
    if (entry.isDirectory()) {
      Object.assign(files, collectJsFiles(filePath, urlPath));
    } else if (entry.name.endsWith(".js")) {
      files[urlPath] = filePath;
    }
  }
  return files;
}

/** @type {Record<string, string>} */
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".webp": "image/webp",
};

/** @type {Record<string, string>} */
const staticFiles = {};
for (const file of fs.readdirSync("src/frontend")) {
  const ext = path.extname(file);
  if (ext in mimeTypes) {
    staticFiles["/" + file] = "src/frontend/" + file;
  }
}
for (const file of fs.readdirSync("src/frontend/fonts")) {
  const ext = path.extname(file);
  if (ext in mimeTypes) {
    staticFiles["/fonts/" + file] = "src/frontend/fonts/" + file;
  }
}

// Add shared files (accessible from frontend)
const sharedFiles = collectJsFiles("src/shared", "/src/shared");

/**
 * Builds a map of node_modules files for Lit packages
 * @returns {Record<string, string>}
 */
export function buildNodeModulesMap() {
  return {
    ...collectJsFiles("node_modules/lit", "/node_modules/lit"),
    ...collectJsFiles("node_modules/lit-html", "/node_modules/lit-html"),
    ...collectJsFiles("node_modules/lit-element", "/node_modules/lit-element"),
    ...collectJsFiles(
      "node_modules/@lit/reactive-element",
      "/node_modules/@lit/reactive-element",
    ),
    ...collectJsFiles("node_modules/@lit/task", "/node_modules/@lit/task"),
  };
}

const nodeModulesFiles = buildNodeModulesMap();

/**
 * Gets the file path for a URL, or undefined if not found
 * @param {string} url
 * @returns {string | undefined}
 */
export function getFilePath(url) {
  return staticFiles[url] ?? sharedFiles[url] ?? nodeModulesFiles[url];
}

const compressibleTypes = new Set([".html", ".js", ".css", ".json", ".woff2"]);

export async function respondWithFile(req, res, filePath, options = {}) {
  const { replacements, noCache } = options;
  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext];
  const headers = {
    "content-type": contentType || "application/octet-stream",
  };

  const fh = await fs.promises.open(filePath, "r");

  if (noCache) {
    headers["cache-control"] = "no-store, no-cache, must-revalidate";
    headers["pragma"] = "no-cache";
    headers["expires"] = "0";
  } else {
    const stat = await fh.stat();
    const etag = `"${stat.mtimeMs.toString(36)}"`;
    headers["etag"] = etag;
    headers["cache-control"] = "public, max-age=86400";
    if (req.headers["if-none-match"] === etag) {
      await fh.close();
      res.writeHead(304);
      res.end();
      return;
    }
  }

  const acceptEncoding = req.headers["accept-encoding"] || "";
  const useGzip = compressibleTypes.has(ext) && acceptEncoding.includes("gzip");

  if (useGzip) {
    headers["content-encoding"] = "gzip";
    headers["vary"] = "Accept-Encoding";
  }

  res.writeHead(200, headers);
  /** @type {import('stream').Readable} */
  let pipeline = fh.createReadStream();

  if (replacements) {
    pipeline = pipeline.pipe(
      new stream.Transform({
        transform(chunk, encoding, callback) {
          let content = String(chunk);
          for (const [key, value] of Object.entries(replacements)) {
            content = content.replace(new RegExp(key, "g"), value);
          }
          callback(null, content);
        },
      }),
    );
  }

  if (useGzip) {
    pipeline = pipeline.pipe(zlib.createGzip());
  }

  pipeline.pipe(res);
}
