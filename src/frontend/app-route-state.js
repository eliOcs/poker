import {
  getTableHistoryPath,
  getTablePath,
  matchHistoryRoute,
  matchLiveRoute,
} from "../shared/routes.js";

/**
 * @param {{ kind: string }|null} liveRoute
 * @returns {boolean}
 */
export function isConnectableLiveRoute(liveRoute) {
  return !!(
    liveRoute &&
    (liveRoute.kind === "cash" ||
      liveRoute.kind === "sitngo" ||
      liveRoute.kind === "mtt_table")
  );
}

/**
 * @param {string} path
 * @returns {{
 *   liveRoute: ReturnType<typeof matchLiveRoute>,
 *   historyRoute: ReturnType<typeof matchHistoryRoute>,
 *   playerProfileId: string|null,
 *   resourcePath: string|null,
 * }}
 */
export function parseAppPath(path) {
  const liveRoute = matchLiveRoute(path);
  const historyRoute = matchHistoryRoute(path);
  const playerProfileId = path.match(/^\/players\/([a-z0-9]+)$/)?.[1] || null;

  return {
    liveRoute,
    historyRoute,
    playerProfileId,
    resourcePath: isConnectableLiveRoute(liveRoute)
      ? path
      : historyRoute
        ? getLivePathFromHistory(
            historyRoute.kind,
            historyRoute.tableId,
            historyRoute.kind === "mtt_table"
              ? historyRoute.tournamentId
              : null,
          )
        : null,
  };
}

/**
 * @param {any} app
 * @param {ReturnType<typeof matchHistoryRoute>} historyRoute
 */
export function syncAppHistoryState(app, historyRoute) {
  if (!historyRoute) {
    app._clearHistoryState();
    return;
  }

  const tableId = historyRoute.tableId;
  const historyKind = historyRoute.kind;
  const tournamentId =
    historyRoute.kind === "mtt_table" ? historyRoute.tournamentId : null;

  if (
    tableId !== app._historyTableId ||
    historyKind !== app._historyKind ||
    tournamentId !== app._historyTournamentId
  ) {
    app._historyKind = historyKind;
    app._historyTableId = tableId;
    app._historyTournamentId = tournamentId;
    app._historyHandNumber = null;
  }

  if (
    historyRoute.handNumber !== null &&
    historyRoute.handNumber !== app._historyHandNumber
  ) {
    app._historyHandNumber = historyRoute.handNumber;
  }
}

/**
 * @param {string|null} historyKind
 * @param {string|null} historyTableId
 * @param {string|null} historyTournamentId
 * @returns {string|null}
 */
export function getHistoryApiBase(
  historyKind,
  historyTableId,
  historyTournamentId,
) {
  if (!historyKind || !historyTableId) return null;
  if (historyKind === "mtt_table" && historyTournamentId) {
    return `/api/mtt/${historyTournamentId}/tables/${historyTableId}/history`;
  }
  return `/api/${historyKind}/${historyTableId}/history`;
}

/**
 * @param {string|null} historyKind
 * @param {string|null} historyTableId
 * @param {number|null|undefined} handNumber
 * @param {string|null} historyTournamentId
 * @returns {string}
 */
export function getHistoryPath(
  historyKind,
  historyTableId,
  handNumber,
  historyTournamentId,
) {
  if (!historyKind || !historyTableId) return "/";
  const kind = /** @type {"cash"|"sitngo"|"mtt"} */ (
    historyKind === "mtt_table" ? "mtt" : historyKind
  );
  return getTableHistoryPath(
    kind,
    historyTableId,
    handNumber,
    historyTournamentId,
  );
}

/**
 * @param {string|null} historyKind
 * @param {string|null} historyTableId
 * @param {string|null} historyTournamentId
 * @returns {string}
 */
export function getLivePathFromHistory(
  historyKind,
  historyTableId,
  historyTournamentId,
) {
  if (!historyKind || !historyTableId) return "/";
  const kind = /** @type {"cash"|"sitngo"|"mtt"} */ (
    historyKind === "mtt_table" ? "mtt" : historyKind
  );
  return getTablePath(kind, historyTableId, historyTournamentId);
}

/**
 * @param {string} currentPath
 * @param {string|null} livePath
 * @returns {boolean}
 */
export function isHistoryRouteForLivePath(currentPath, livePath) {
  if (!livePath) return false;
  const historyRoute = matchHistoryRoute(currentPath);
  if (!historyRoute) return false;
  const liveRoute = matchLiveRoute(livePath);
  if (!liveRoute) return false;

  if (
    (liveRoute.kind === "cash" || liveRoute.kind === "sitngo") &&
    historyRoute.kind === liveRoute.kind
  ) {
    return historyRoute.tableId === liveRoute.tableId;
  }

  return (
    liveRoute.kind === "mtt_table" &&
    historyRoute.kind === "mtt_table" &&
    historyRoute.tableId === liveRoute.tableId &&
    historyRoute.tournamentId === liveRoute.tournamentId
  );
}
