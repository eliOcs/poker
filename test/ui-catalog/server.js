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
  "/test.html": "test/ui-catalog/test.html",
  "/test-cases.js": "test/ui-catalog/test-cases.js",
  "/test-cases-history.js": "test/ui-catalog/test-cases-history.js",
  "/test-cases/history-extended.js":
    "test/ui-catalog/test-cases/history-extended.js",
  "/test-cases-email.js": "test/ui-catalog/test-cases-email.js",
  "/test-cases/game-helpers.js": "test/ui-catalog/test-cases/game-helpers.js",
  "/test-cases/game-special.js": "test/ui-catalog/test-cases/game-special.js",
  "/test-cases/table-sizes.js": "test/ui-catalog/test-cases/table-sizes.js",
  "/test-cases/action-panel.js": "test/ui-catalog/test-cases/action-panel.js",
  "/test-cases/mtt-lobby.js": "test/ui-catalog/test-cases/mtt-lobby.js",
  "/test-cases/mtt-lobby-fixtures.js":
    "test/ui-catalog/test-cases/mtt-lobby-fixtures.js",
  "/test-cases/mtt-lobby-late-registration.js":
    "test/ui-catalog/test-cases/mtt-lobby-late-registration.js",
  "/fixtures.js": "test/frontend/fixtures/index.js",
  "/history.js": "test/frontend/fixtures/history.js",
  "/logo.png": "src/frontend/logo.png",
  "/logo.webp": "src/frontend/logo.webp",
  "/app.css": "src/frontend/app.css",
  "/base.css": "src/frontend/base.css",
  "/styles/controls.css": "src/frontend/styles/controls.css",
  "/styles/shell.css": "src/frontend/styles/shell.css",
  "/styles/application.css": "src/frontend/styles/application.css",
  "/styles/pages.css": "src/frontend/styles/pages.css",
  "/styles/mtt-lobby.css": "src/frontend/styles/mtt-lobby.css",
  "/styles/player-profile.css": "src/frontend/styles/player-profile.css",
  "/styles/history.css": "src/frontend/styles/history.css",
  "/styles/game.css": "src/frontend/styles/game.css",
  "/styles/board.css": "src/frontend/styles/board.css",
  "/styles/seat.css": "src/frontend/styles/seat.css",
  "/styles/card.css": "src/frontend/styles/card.css",
  "/styles/chips.css": "src/frontend/styles/chips.css",
  "/styles/action-panel.css": "src/frontend/styles/action-panel.css",
  "/styles/currency-slider.css": "src/frontend/styles/currency-slider.css",
  "/styles/ranking-panel.css": "src/frontend/styles/ranking-panel.css",
  "/styles/tournament-levels-panel.css":
    "src/frontend/styles/tournament-levels-panel.css",
  "/styles/edit-label.css": "src/frontend/styles/edit-label.css",
  "/fonts/press-start-2p.woff2": "src/frontend/fonts/press-start-2p.woff2",
  "/release-notes": "src/frontend/index.html",
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
    pathname.startsWith("/src/backend/") ||
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
