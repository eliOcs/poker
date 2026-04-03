import { matchLiveRoute } from "../shared/routes.js";
import { createFrontendErrorReport } from "./error-reporting.js";
import { isHistoryRouteForLivePath } from "./app-route-state.js";

const RESUME_SOCKET_HEALTH_TIMEOUT_MS = 1500;

function clearSocketHealthCheck(app, socket = app._socket) {
  if (app._socketHealthCheck?.socket !== socket) return;
  clearTimeout(app._socketHealthCheck.timeoutId);
  app._socketHealthCheck = null;
}

function restartConnection(app) {
  if (!app._activeGamePath) return;
  const path = app._activeGamePath;

  if (app._socket) {
    clearSocketHealthCheck(app, app._socket);
    app._intentionalSocketCloses.add(app._socket);
    app._socket.close();
    app._socket = null;
  }

  app._activeGameId = null;
  app._activeGamePath = null;
  app.gameConnectionStatus = "disconnected";
  connectToGame(app, path);
}

function runSocketHealthCheck(app) {
  if (
    !app._socket ||
    app._socket.readyState !== WebSocket.OPEN ||
    !app._activeGamePath
  ) {
    return;
  }

  clearSocketHealthCheck(app, app._socket);
  const socket = app._socket;
  const path = app._activeGamePath;
  const timeoutId = setTimeout(() => {
    if (app._socket !== socket || app._activeGamePath !== path) {
      return;
    }
    restartConnection(app);
  }, RESUME_SOCKET_HEALTH_TIMEOUT_MS);

  app._socketHealthCheck = { socket, timeoutId };
  try {
    socket.send(JSON.stringify({ action: "ping" }));
  } catch {
    clearSocketHealthCheck(app, socket);
    restartConnection(app);
  }
}

function handleTypedSocketMessage(app, data) {
  if (data.type === "pong") {
    return true;
  }

  if (data.type === "social") {
    if (!matchLiveRoute(app.path)) return true;
    app.socialAction = data;
    return true;
  }

  if (data.type === "history") {
    if (
      data.event === "handRecorded" &&
      isHistoryRouteForLivePath(app.path, app._activeGamePath)
    ) {
      app._historyListRefreshNonce += 1;
    }
    return true;
  }

  if (data.type === "tournamentState") {
    app._mttView = data.tournament;
    app._mttLoading = false;
    app._mttError = "";
    app._maybeRedirectMttRoute();
    return true;
  }

  return Boolean(data.type);
}

/**
 * Connects to a game via WebSocket
 * @param {any} app
 * @param {string} path
 */
export function connectToGame(app, path) {
  const liveRoute = matchLiveRoute(path);
  if (!liveRoute) {
    return;
  }

  // Already connected to this game
  if (app._activeGamePath === path && app._socket) {
    return;
  }

  // Disconnect from previous game if different
  if (app._activeGamePath && app._activeGamePath !== path) {
    disconnectFromGame(app);
  }

  app._activeGameId =
    liveRoute.kind === "mtt" ? liveRoute.tournamentId : liveRoute.tableId;
  app._activeGamePath = path;
  app.game = null;
  app.socialAction = null;
  app.gameConnectionStatus = "connecting";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const socket = new WebSocket(`${protocol}//${window.location.host}${path}`);
  app._socket = socket;

  socket.onopen = () => {
    if (app._socket !== socket) return;
    app.gameConnectionStatus = "connected";
  };

  socket.onmessage = (event) => {
    if (app._socket !== socket) return;
    clearSocketHealthCheck(app, socket);
    const data = JSON.parse(event.data);
    if (data.error) {
      app.toast = { message: data.error.message, variant: "error" };
      return;
    }

    if (handleTypedSocketMessage(app, data)) {
      return;
    }

    app.game = data;
  };

  socket.onerror = () => {
    if (app._socket !== socket) return;
    handleGameNotFound(app);
  };

  socket.onclose = (event) => {
    const intentionallyClosed =
      app._intentionalSocketCloses.has(socket) || app._socket !== socket;
    app._intentionalSocketCloses.delete(socket);

    if (app._socket !== socket) {
      return;
    }

    clearSocketHealthCheck(app, socket);
    app._socket = null;
    app.gameConnectionStatus = "disconnected";
    // Code 1006 = abnormal closure (connection rejected before game loaded)
    if (!app.game && !app._mttView && event.code === 1006) {
      handleGameNotFound(app);
      return;
    }
    // Reconnect automatically unless we closed intentionally
    if (!intentionallyClosed && app._activeGamePath === path) {
      setTimeout(() => {
        if (!app._socket && app._activeGamePath === path) {
          reconnectIfNeeded(app);
        }
      }, 1000);
    }
  };
}

/**
 * Reconnects to the active game if the socket is closed
 * @param {any} app
 */
export function reconnectIfNeeded(app) {
  if (
    app._activeGamePath &&
    (!app._socket || app._socket.readyState === WebSocket.CLOSED)
  ) {
    const path = app._activeGamePath;
    app._activeGameId = null;
    app._activeGamePath = null;
    connectToGame(app, path);
  }
}

/**
 * Refreshes the current game connection when the page becomes visible again.
 * @param {any} app
 */
export function resumeConnectionIfNeeded(app) {
  if (!app._activeGamePath) return;
  if (!app._socket || app._socket.readyState === WebSocket.CLOSED) {
    reconnectIfNeeded(app);
    return;
  }
  if (app._socket.readyState === WebSocket.OPEN) {
    runSocketHealthCheck(app);
  }
}

/**
 * Disconnects from the current game
 * @param {any} app
 */
export function disconnectFromGame(app) {
  if (app._socket) {
    clearSocketHealthCheck(app, app._socket);
    app._intentionalSocketCloses.add(app._socket);
    app._socket.close();
    app._socket = null;
  }
  app._activeGameId = null;
  app._activeGamePath = null;
  app._socketHealthCheck = null;
  app.game = null;
  app.socialAction = null;
  app.gameConnectionStatus = "disconnected";
}

/**
 * Sends a message to the game via WebSocket
 * @param {any} app
 * @param {object} message
 */
export function sendToGame(app, message) {
  if (app._socket?.readyState === WebSocket.OPEN) {
    app._socket.send(JSON.stringify(message));
  }
}

/**
 * Reports a frontend error to the backend
 * @param {any} app
 * @param {object} error
 */
export function reportFrontendError(app, error) {
  const payload = createFrontendErrorReport(
    error,
    window.location.pathname,
    app._activeGameId,
    app.gameConnectionStatus,
  );

  void fetch("/api/client-errors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}

/**
 * Handles the case when a game is not found
 * @param {any} app
 */
export function handleGameNotFound(app) {
  const liveRoute = matchLiveRoute(app.path);
  app.toast = {
    message:
      liveRoute?.kind === "mtt" ? "Tournament not found" : "Game not found",
    variant: "error",
  };
  disconnectFromGame(app);
  history.replaceState({}, "", "/");
  app.path = "/";
}

/**
 * Manages WebSocket connection based on current path
 * @param {any} app
 * @param {string|null} path
 */
export function manageConnection(app, path) {
  if (path) {
    if (app._activeGamePath === path && !app._socket) {
      return;
    }
    connectToGame(app, path);
  } else if (app._activeGamePath) {
    disconnectFromGame(app);
  }
}
