/**
 * UI Catalog Server
 *
 * Minimal HTTP server for serving the UI catalog.
 * Reuses static file serving logic from the main backend.
 */

import * as http from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
import { respondWithFile } from "../../src/backend/static-files.js";

const PORT = process.env.UI_CATALOG_PORT || 8445;

// Collect all .js files from a directory recursively
function collectJsFiles(dir, baseUrl) {
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

// Build the node_modules file map (same as static-files.js)
const nodeModulesFiles = {
  ...collectJsFiles("node_modules/lit", "/node_modules/lit"),
  ...collectJsFiles("node_modules/lit-html", "/node_modules/lit-html"),
  ...collectJsFiles("node_modules/lit-element", "/node_modules/lit-element"),
  ...collectJsFiles(
    "node_modules/@lit/reactive-element",
    "/node_modules/@lit/reactive-element",
  ),
};

// Route mapping
const routes = {
  "/": "test/ui-catalog/index.html",
  "/test-cases.js": "test/ui-catalog/test-cases.js",
  "/test-cases-history.js": "test/ui-catalog/test-cases-history.js",
  "/fixtures.js": "test/frontend/fixtures.js",
  "/logo.png": "src/frontend/logo.png",
};

// Handle requests
function handleRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // Check static routes
  if (routes[pathname]) {
    respondWithFile(routes[pathname], res, { noCache: true });
    return;
  }

  // Serve frontend source files
  if (pathname.startsWith("/src/frontend/")) {
    const filePath = pathname.slice(1); // Remove leading /
    if (fs.existsSync(filePath)) {
      respondWithFile(filePath, res, { noCache: true });
      return;
    }
  }

  // Serve node_modules (Lit)
  if (nodeModulesFiles[pathname]) {
    respondWithFile(nodeModulesFiles[pathname], res, { noCache: true });
    return;
  }

  // 404
  res.writeHead(404, { "content-type": "text/plain" });
  res.end("Not found");
}

// Start server
const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`UI Catalog server running at http://localhost:${PORT}`);
});
