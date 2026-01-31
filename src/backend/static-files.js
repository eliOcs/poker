import * as fs from "fs";
import path from "path";
import stream from "stream";
import mime from "mime-types";

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

const allowedExtensions = [".html", ".js", ".css", ".png", ".ico"];

/** @type {Record<string, string>} */
const staticFiles = {};
for (const file of fs.readdirSync("src/frontend")) {
  const ext = path.extname(file);
  if (allowedExtensions.includes(ext)) {
    staticFiles["/" + file] = "src/frontend/" + file;
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

/**
 * Responds with a file, optionally applying text replacements
 * @param {string} filePath
 * @param {import('http').ServerResponse} res
 * @param {Object} [options]
 * @param {Record<string, string>} [options.replacements]
 * @param {boolean} [options.noCache]
 */
export function respondWithFile(filePath, res, options = {}) {
  const { replacements, noCache } = options;
  const contentType = mime.contentType(path.extname(filePath));
  const headers = {
    "content-type": contentType || "application/octet-stream",
  };
  if (noCache) {
    headers["cache-control"] = "no-store, no-cache, must-revalidate";
    headers["pragma"] = "no-cache";
    headers["expires"] = "0";
  }
  res.writeHead(200, headers);

  const fileStream = fs.createReadStream(filePath);

  if (replacements) {
    const transform = new stream.Transform({
      transform(chunk, encoding, callback) {
        let content = String(chunk);
        for (const [key, value] of Object.entries(replacements)) {
          content = content.replace(new RegExp(key, "g"), value);
        }
        callback(null, content);
      },
    });
    fileStream.pipe(transform).pipe(res);
  } else {
    fileStream.pipe(res);
  }
}
