import { getTablePath, matchLiveRoute } from "../shared/routes.js";
import { createFrontendErrorReport } from "./error-reporting.js";
import { isHistoryRouteForTableId } from "./app-route-state.js";
import { navigateApp } from "./app-navigation.js";

const RESUME_SOCKET_HEALTH_TIMEOUT_MS = 1500;
const UNCORRELATED_ACTIONS = new Set(["chat", "emote", "ping"]);

function resetPendingGameAction(app) {
  app._pendingGameActionId = undefined;
  app.gameActionPending = false;
}

function resolvePendingGameAction(app, actionId) {
  if (typeof actionId !== "string" || app._pendingGameActionId !== actionId) {
    app.toast = {
      message: "Game connection was out of sync",
      variant: "error",
    };
    restartConnection(app);
    return;
  }
  resetPendingGameAction(app);
}

function clearSocketHealthCheck(app, socket = app._socket) {
  if (app._socketHealthCheck?.socket !== socket) return;
  clearTimeout(app._socketHealthCheck.timeoutId);
  app._socketHealthCheck = undefined;
}

function restartConnection(app) {
  if (!app._activeGamePath) return;
  const path = app._activeGamePath;

  if (app._socket) {
    clearSocketHealthCheck(app, app._socket);
    app._intentionalSocketCloses.add(app._socket);
    app._socket.close();
    app._socket = undefined;
  }

  app._activeGameId = undefined;
  app._activeGamePath = undefined;
  app.gameConnectionStatus = "disconnected";
  resetPendingGameAction(app);
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

  if (data.type === "actionResult") {
    resolvePendingGameAction(app, data.actionId);
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
      isHistoryRouteForTableId(app.path, app._activeGameId)
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

  if (data.type === "playerMoved") {
    app.toast = {
      message: `Moved to ${data.tableName}`,
      variant: "info",
    };
    navigateApp(app, getTablePath("mtt", data.tableId, data.tournamentId), {
      replace: true,
    });
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
  app.game = undefined;
  app.socialAction = undefined;
  app.gameConnectionStatus = "connecting";
  resetPendingGameAction(app);
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
      if (app._pendingGameActionId) {
        resolvePendingGameAction(app, data.actionId);
      }
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
      Boolean(app._intentionalSocketCloses.has(socket)) ||
      app._socket !== socket;
    app._intentionalSocketCloses.delete(socket);

    if (app._socket !== socket) {
      return;
    }

    clearSocketHealthCheck(app, socket);
    app._socket = undefined;
    app.gameConnectionStatus = "disconnected";
    resetPendingGameAction(app);
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
    app._activeGameId = undefined;
    app._activeGamePath = undefined;
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
    app._socket = undefined;
  }
  app._activeGameId = undefined;
  app._activeGamePath = undefined;
  app._socketHealthCheck = undefined;
  app.game = undefined;
  app.socialAction = undefined;
  app.gameConnectionStatus = "disconnected";
  resetPendingGameAction(app);
}

/**
 * Sends a message to the game via WebSocket
 * @param {any} app
 * @param {object} message
 */
export function sendToGame(app, message) {
  if (app._socket?.readyState !== WebSocket.OPEN) return;

  const correlated = !UNCORRELATED_ACTIONS.has(message.action);
  if (correlated && app._pendingGameActionId) {
    app.toast = {
      message: "Waiting for the previous game action",
      variant: "info",
    };
    return;
  }

  const actionId = correlated ? crypto.randomUUID() : undefined;
  if (actionId) {
    app._pendingGameActionId = actionId;
    app.gameActionPending = true;
  }
  app._socket.send(
    JSON.stringify({ ...message, ...(actionId && { actionId }) }),
  );
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
  navigateApp(app, "/", { replace: true });
}

/**
 * Manages WebSocket connection based on current path
 * @param {any} app
 * @param {string|undefined} path
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
