import { getTablePath } from "../shared/routes.js";
import { navigateApp } from "./app-navigation.js";
import { parseAppPath } from "./app-route-state.js";

/**
 * Syncs MTT route state when the live route changes
 * @param {any} app
 * @param {{ kind: string, tournamentId?: string }|undefined} liveRoute
 */
export function syncMttRoute(app, liveRoute) {
  const tournamentId =
    liveRoute?.kind === "mtt" || liveRoute?.kind === "mtt_table"
      ? liveRoute.tournamentId
      : undefined;
  if (tournamentId === app._mttTournamentId) return;

  app._mttTournamentId = tournamentId;
  app._mttView = undefined;
  app._mttLoading = tournamentId !== undefined;
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
 * @param {{ kind: string }} liveRoute
 * @returns {boolean}
 */
function shouldStayOnMttLobby(app, liveRoute) {
  return liveRoute.kind === "mtt" && app._allowMttLobby;
}

/**
 * Returns true if the player should be redirected to the given next table.
 * @param {{ kind: string, tableId?: string }} liveRoute
 * @returns {boolean}
 */
function shouldRedirectToTable(liveRoute) {
  return liveRoute.kind === "mtt";
}

/**
 * @param {ReturnType<typeof parseAppPath>["liveRoute"]} liveRoute
 * @returns {liveRoute is { kind: "mtt", tournamentId: string, tableId?: undefined } | { kind: "mtt_table", tournamentId: string, tableId: string }}
 */
function isMttLiveRoute(liveRoute) {
  return liveRoute?.kind === "mtt" || liveRoute?.kind === "mtt_table";
}

/**
 * @param {any} app
 * @returns {boolean}
 */
function hasLoadedMttRouteState(app) {
  return !!app._mttTournamentId && !!app._mttView;
}

function isQueuedRegistration(action, tournament) {
  return (
    action === "register" &&
    tournament.currentPlayer?.status === "registered" &&
    !tournament.currentPlayer.tableId
  );
}

/**
 * Resolves the MTT redirect path if the player should be moved
 * @param {any} app
 * @param {{ kind: "mtt", tournamentId: string, tableId?: undefined } | { kind: "mtt_table", tournamentId: string, tableId: string }} liveRoute
 * @returns {string|undefined}
 */
export function resolveMttRedirectPath(app, liveRoute) {
  const nextTableId = app._mttView.currentPlayer?.tableId;
  if (app._mttView.status !== "running" || !nextTableId) {
    return;
  }

  if (shouldStayOnMttLobby(app, liveRoute)) {
    return;
  }

  if (shouldRedirectToTable(liveRoute)) {
    return getTablePath("mtt", nextTableId, app._mttTournamentId);
  }

  return;
}

/**
 * Redirects the app to the correct MTT route if needed
 * @param {any} app
 */
export function maybeRedirectMttRoute(app) {
  const { liveRoute } = parseAppPath(app.path);
  if (!isMttLiveRoute(liveRoute) || !hasLoadedMttRouteState(app)) return;

  const nextPath = resolveMttRedirectPath(app, liveRoute);
  if (!nextPath || nextPath === app.path) return;

  navigateApp(app, nextPath, { replace: true });
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
    const data = await res.json().catch(() => undefined);
    if (!res.ok) {
      throw new Error(data?.error ?? `Failed to `);
    }
    app._mttView = data;
    app._mttError = "";
    if (isQueuedRegistration(action, data)) {
      app.toast = {
        message: "Registered. Waiting for a table.",
        variant: "info",
      };
    }
    maybeRedirectMttRoute(app);
  } catch (err) {
    const error = /** @type {Error} */ (err);
    app.toast = { message: error.message, variant: "error" };
  } finally {
    app._mttActionPending = false;
  }
}

/**
 * Renames the current MTT.
 * @param {any} app
 * @param {string} name
 */
export async function renameMttTournament(app, name) {
  if (!app._mttTournamentId || app._mttActionPending) return;

  app._mttActionPending = true;
  try {
    const res = await fetch(`/api/mtt/${app._mttTournamentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => undefined);
    if (!res.ok) {
      throw new Error(data?.error ?? "Failed to rename tournament");
    }
    app._mttView = data;
    app._mttError = "";
  } catch (err) {
    const error = /** @type {Error} */ (err);
    app.toast = { message: error.message, variant: "error" };
  } finally {
    app._mttActionPending = false;
  }
}
