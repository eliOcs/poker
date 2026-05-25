import {
  getHistoryPath as getSharedHistoryPath,
  matchHistoryRoute,
  matchLiveRoute,
} from "../shared/routes.js";

const CONNECTABLE_LIVE_KINDS = new Set(["cash", "sitngo", "mtt", "mtt_table"]);
const TABLE_LIVE_KINDS = new Set(["cash", "sitngo", "mtt_table"]);
const PLAYER_PROFILE_ROUTE = /^\/players\/([a-z0-9]+)$/;
const STATIC_PAGE_BY_PATH = new Map([
  ["/mtt", "tournaments"],
  ["/release-notes", "release_notes"],
]);

function appRoute(page, overrides = {}) {
  return {
    page,
    ...overrides,
  };
}

/**
 * @param {{ kind: string }|undefined} liveRoute
 * @returns {boolean}
 */
export function isConnectableLiveRoute(liveRoute) {
  return !!liveRoute && CONNECTABLE_LIVE_KINDS.has(liveRoute.kind);
}

/**
 * @param {{ kind: string }|undefined} liveRoute
 * @returns {boolean}
 */
export function isTableLiveRoute(liveRoute) {
  return !!liveRoute && TABLE_LIVE_KINDS.has(liveRoute.kind);
}

/**
 * @param {string} path
 * @returns {{
 *   page: string,
 *   liveRoute?: NonNullable<ReturnType<typeof matchLiveRoute>>,
 *   historyRoute?: NonNullable<ReturnType<typeof matchHistoryRoute>>,
 *   playerProfileId?: string,
 *   resourcePath?: string,
 * }}
 */
export function parseAppPath(path) {
  const liveRoute = matchLiveRoute(path);
  if (liveRoute) {
    return appRoute(liveRoute.kind === "mtt" ? "mtt_lobby" : "game", {
      liveRoute,
      resourcePath: path,
    });
  }

  const historyRoute = matchHistoryRoute(path);
  if (historyRoute) {
    const normalizedHistoryRoute = {
      ...historyRoute,
      handNumber: historyRoute.handNumber ?? undefined,
    };
    return appRoute("history", {
      historyRoute: normalizedHistoryRoute,
    });
  }

  const playerProfileId = path.match(PLAYER_PROFILE_ROUTE)?.[1];
  if (playerProfileId) {
    return appRoute("player_profile", {
      playerProfileId,
    });
  }

  return appRoute(STATIC_PAGE_BY_PATH.get(path) ?? "home");
}

/**
 * @param {any} app
 * @param {ReturnType<typeof parseAppPath>} route
 */
export function syncAppRouteState(app, route) {
  if (!isConnectableLiveRoute(route.liveRoute)) {
    app.socialAction = undefined;
  }
  syncAppHistoryState(app, route.historyRoute);
  app._playerProfileId = route.playerProfileId;
}

/**
 * @param {any} app
 * @param {ReturnType<typeof parseAppPath>["historyRoute"]} historyRoute
 */
export function syncAppHistoryState(app, historyRoute) {
  if (!historyRoute) {
    app._clearHistoryState();
    return;
  }

  const tableId = historyRoute.tableId;

  if (tableId !== app._historyTableId) {
    app._historyTableId = tableId;
    app._historyHandNumber = undefined;
  }

  const handNumber = historyRoute.handNumber ?? undefined;
  if (handNumber !== undefined && handNumber !== app._historyHandNumber) {
    app._historyHandNumber = handNumber;
  }
}

/**
 * @param {string} historyTableId
 * @returns {string}
 */
export function getHistoryApiBase(historyTableId) {
  return `/api/history/${historyTableId}`;
}

/**
 * @param {string} historyTableId
 * @param {number|undefined} handNumber
 * @returns {string}
 */
export function getHistoryPath(historyTableId, handNumber) {
  return getSharedHistoryPath(historyTableId, handNumber);
}

/**
 * @param {string} currentPath
 * @param {string|undefined} tableId
 * @returns {boolean}
 */
export function isHistoryRouteForTableId(currentPath, tableId) {
  if (!tableId) return false;
  const historyRoute = matchHistoryRoute(currentPath);
  if (!historyRoute) return false;

  return historyRoute.tableId === tableId;
}
