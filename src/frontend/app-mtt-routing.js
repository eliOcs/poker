import { getTablePath } from "../shared/routes.js";
import { parseAppPath } from "./app-route-state.js";

/**
 * Syncs MTT route state when the live route changes
 * @param {any} app
 * @param {{ kind: string, tournamentId?: string }|null} liveRoute
 */
export function syncMttRoute(app, liveRoute) {
  const tournamentId =
    liveRoute?.kind === "mtt" || liveRoute?.kind === "mtt_table"
      ? liveRoute.tournamentId
      : null;
  if (tournamentId === app._mttTournamentId) return;

  app._mttTournamentId = tournamentId;
  app._mttView = null;
  app._mttLoading = tournamentId !== null;
  app._mttError = "";
  app._mttActionPending = false;
}

/**
 * Sets the MTT lobby override flag
 * @param {any} app
 * @param {boolean} allowMttLobby
 */
export function setMttLobbyOverride(app, allowMttLobby) {
  app._allowMttLobby = allowMttLobby;
}

/**
 * @param {any} app
 * @param {{ kind: string }|null} liveRoute
 * @returns {boolean}
 */
function shouldStayOnMttLobby(app, liveRoute) {
  return liveRoute?.kind === "mtt" && app._allowMttLobby;
}

/**
 * Returns true if the player should be redirected to the given next table.
 * @param {{ kind: string, tableId?: string }} liveRoute
 * @param {string} nextTableId
 * @returns {boolean}
 */
function shouldRedirectToTable(liveRoute, nextTableId) {
  if (liveRoute.kind === "mtt") return true;
  return liveRoute.kind === "mtt_table" && liveRoute.tableId !== nextTableId;
}

/**
 * Resolves the MTT redirect path if the player should be moved
 * @param {any} app
 * @param {{ kind: string, tableId?: string, tournamentId?: string }|null} liveRoute
 * @returns {string|null}
 */
export function resolveMttRedirectPath(app, liveRoute) {
  if (!liveRoute || !app._mttTournamentId || !app._mttView) {
    return null;
  }

  const nextTableId = app._mttView.currentPlayer?.tableId;
  if (app._mttView.status !== "running" || !nextTableId) {
    return null;
  }

  if (shouldStayOnMttLobby(app, liveRoute)) {
    return null;
  }

  if (shouldRedirectToTable(liveRoute, nextTableId)) {
    return getTablePath("mtt", nextTableId, app._mttTournamentId);
  }

  return null;
}

/**
 * Redirects the app to the correct MTT route if needed
 * @param {any} app
 */
export function maybeRedirectMttRoute(app) {
  const { liveRoute } = parseAppPath(app.path);
  const nextPath = resolveMttRedirectPath(app, liveRoute);
  if (!nextPath || nextPath === app.path) return;

  if (liveRoute?.kind === "mtt_table") {
    const tableName =
      app._mttView?.tables.find(
        (table) => table.tableId === app._mttView?.currentPlayer?.tableId,
      )?.tableName || "your new table";
    app.toast = {
      message: `Moved to ${tableName}`,
      variant: "info",
    };
  }

  history.replaceState({}, "", nextPath);
  setMttLobbyOverride(app, false);
  app.path = nextPath;
}

/**
 * Performs an MTT action (register, unregister, start, etc.)
 * @param {any} app
 * @param {string} action
 */
export async function performMttAction(app, action) {
  if (!app._mttTournamentId || app._mttActionPending) return;

  app._mttActionPending = true;
  try {
    const res = await fetch(`/api/mtt/${app._mttTournamentId}/${action}`, {
      method: "POST",
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error || `Failed to ${action}`);
    }
    app._mttView = data;
    app._mttError = "";
    maybeRedirectMttRoute(app);
  } catch (err) {
    const error = /** @type {Error} */ (err);
    app.toast = { message: error.message, variant: "error" };
  } finally {
    app._mttActionPending = false;
  }
}
