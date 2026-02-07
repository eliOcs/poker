/**
 * UI Catalog Server
 *
 * Minimal HTTP server for serving the UI catalog.
 * Reuses static file serving logic from the main backend.
 */

import * as http from "node:http";
import * as fs from "node:fs";
import {
  respondWithFile,
  buildNodeModulesMap,
} from "../../src/backend/static-files.js";

const PORT = process.env.UI_CATALOG_PORT || 8445;

// Build the node_modules file map (reusing logic from static-files.js)
const nodeModulesFiles = buildNodeModulesMap();

// Route mapping
const routes = {
  "/": "test/ui-catalog/index.html",
  "/test-cases.js": "test/ui-catalog/test-cases.js",
  "/test-cases-history.js": "test/ui-catalog/test-cases-history.js",
  "/test-cases/history-extended.js":
    "test/ui-catalog/test-cases/history-extended.js",
  "/test-cases/game-helpers.js": "test/ui-catalog/test-cases/game-helpers.js",
  "/test-cases/game-special.js": "test/ui-catalog/test-cases/game-special.js",
  "/test-cases/table-sizes.js": "test/ui-catalog/test-cases/table-sizes.js",
  "/fixtures.js": "test/frontend/fixtures/index.js",
  "/history.js": "test/frontend/fixtures/history.js",
  "/logo.png": "src/frontend/logo.png",
  "/logo.webp": "src/frontend/logo.webp",
  "/fonts/press-start-2p.woff2": "src/frontend/fonts/press-start-2p.woff2",
  "/release-notes.html": "src/frontend/release-notes.html",
};

// Handle requests
function handleRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;
  console.log(`[REQ] ${pathname}`);

  // Check static routes
  if (routes[pathname]) {
    console.log(`[200] ${pathname} -> ${routes[pathname]}`);
    respondWithFile(req, res, routes[pathname], { noCache: true });
    return;
  }

  // Serve frontend and shared source files
  if (
    pathname.startsWith("/src/frontend/") ||
    pathname.startsWith("/src/shared/")
  ) {
    const filePath = pathname.slice(1); // Remove leading /
    if (fs.existsSync(filePath)) {
      console.log(`[200] ${pathname} -> ${filePath}`);
      respondWithFile(req, res, filePath, { noCache: true });
      return;
    }
  }

  // Serve node_modules (Lit)
  if (nodeModulesFiles[pathname]) {
    console.log(`[200] ${pathname} -> ${nodeModulesFiles[pathname]}`);
    respondWithFile(req, res, nodeModulesFiles[pathname], { noCache: true });
    return;
  }

  // 404
  console.log(`[404] ${pathname}`);
  res.writeHead(404, { "content-type": "text/plain" });
  res.end("Not found");
}

// Start server
const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`UI Catalog server running at http://localhost:${PORT}`);
});
