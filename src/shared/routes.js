/**
 * Shared URL builders and matchers for live resources and history pages.
 */

/**
 * @typedef {"cash"|"sitngo"} TableKind
 * @typedef {"cash"|"sitngo"|"mtt"} LiveTableKind
 * @typedef {{ kind: "cash", tableId: string } | { kind: "sitngo", tableId: string } | { kind: "mtt", tournamentId: string, tableId?: undefined } | { kind: "mtt_table", tournamentId: string, tableId: string }} ResourceRoute
 */

const ID_RE = "[a-z0-9]+";

/** @type {RegExp} */
export const LIVE_CASH_ROUTE = new RegExp(`^/cash/(${ID_RE})$`);
/** @type {RegExp} */
export const LIVE_SITNGO_ROUTE = new RegExp(`^/sitngo/(${ID_RE})$`);
/** @type {RegExp} */
export const LIVE_MTT_ROUTE = new RegExp(`^/mtt/(${ID_RE})$`);
/** @type {RegExp} */
export const LIVE_MTT_TABLE_ROUTE = new RegExp(
  `^/mtt/(${ID_RE})/tables/(${ID_RE})$`,
);

/** @type {RegExp} */
export const HISTORY_CASH_ROUTE = new RegExp(
  `^/cash/(${ID_RE})/history(?:/(\\d+))?$`,
);
/** @type {RegExp} */
export const HISTORY_SITNGO_ROUTE = new RegExp(
  `^/sitngo/(${ID_RE})/history(?:/(\\d+))?$`,
);
/** @type {RegExp} */
export const HISTORY_MTT_TABLE_ROUTE = new RegExp(
  `^/mtt/(${ID_RE})/tables/(${ID_RE})/history(?:/(\\d+))?$`,
);

/**
 * @param {LiveTableKind} kind
 * @param {string} tableId
 * @param {string|null} [tournamentId]
 * @returns {string}
 */
export function getTablePath(kind, tableId, tournamentId = null) {
  if (kind === "cash") return `/cash/${tableId}`;
  if (kind === "sitngo") return `/sitngo/${tableId}`;
  if (!tournamentId) {
    throw new Error("tournamentId is required for MTT table routes");
  }
  return `/mtt/${tournamentId}/tables/${tableId}`;
}

/**
 * @param {string} tournamentId
 * @returns {string}
 */
export function getMttPath(tournamentId) {
  return `/mtt/${tournamentId}`;
}

/**
 * @param {LiveTableKind} kind
 * @param {string} tableId
 * @param {number|null|undefined} [handNumber]
 * @param {string|null} [tournamentId]
 * @returns {string}
 */
export function getTableHistoryPath(
  kind,
  tableId,
  handNumber = null,
  tournamentId = null,
) {
  const base = `${getTablePath(kind, tableId, tournamentId)}/history`;
  return handNumber == null ? base : `${base}/${handNumber}`;
}

/**
 * @param {string} path
 * @param {RegExp} route
 * @param {"cash"|"sitngo"} kind
 * @returns {{ kind: "cash"|"sitngo", tableId: string }|null}
 */
function matchSingleTableRoute(path, route, kind) {
  const match = path.match(route);
  const tableId = match?.[1];
  return tableId ? { kind, tableId } : null;
}

/**
 * @param {string} path
 * @param {RegExp} route
 * @param {"cash"|"sitngo"} kind
 * @returns {{ kind: "cash"|"sitngo", tableId: string, handNumber: number|null }|null}
 */
function matchSingleTableHistoryRoute(path, route, kind) {
  const match = path.match(route);
  const tableId = match?.[1];
  if (!tableId) return null;

  return {
    kind,
    tableId,
    handNumber: match[2] ? parseInt(match[2], 10) : null,
  };
}

/**
 * @param {string} path
 * @param {RegExp} route
 * @returns {{ kind: "mtt_table", tournamentId: string, tableId: string }|null}
 */
function matchTournamentTableRoute(path, route) {
  const match = path.match(route);
  const tournamentId = match?.[1];
  const tableId = match?.[2];
  if (!tournamentId || !tableId) return null;
  return { kind: "mtt_table", tournamentId, tableId };
}

/**
 * @param {string} path
 * @returns {{ kind: "mtt_table", tournamentId: string, tableId: string, handNumber: number|null }|null}
 */
function matchTournamentTableHistoryRoute(path) {
  const match = path.match(HISTORY_MTT_TABLE_ROUTE);
  const tournamentId = match?.[1];
  const tableId = match?.[2];
  if (!tournamentId || !tableId) return null;

  return {
    kind: "mtt_table",
    tournamentId,
    tableId,
    handNumber: match[3] ? parseInt(match[3], 10) : null,
  };
}

/**
 * @param {string} path
 * @returns {{ kind: "cash"|"sitngo", tableId: string } | { kind: "mtt", tournamentId: string, tableId?: undefined } | { kind: "mtt_table", tournamentId: string, tableId: string } | null}
 */
export function matchLiveRoute(path) {
  const cashRoute = matchSingleTableRoute(path, LIVE_CASH_ROUTE, "cash");
  if (cashRoute) return cashRoute;

  const sitngoRoute = matchSingleTableRoute(path, LIVE_SITNGO_ROUTE, "sitngo");
  if (sitngoRoute) return sitngoRoute;

  const mttTableRoute = matchTournamentTableRoute(path, LIVE_MTT_TABLE_ROUTE);
  if (mttTableRoute) return mttTableRoute;

  const mttMatch = path.match(LIVE_MTT_ROUTE);
  const tournamentId = mttMatch?.[1];
  if (tournamentId) {
    return { kind: "mtt", tournamentId };
  }

  return null;
}

/**
 * @param {string} path
 * @returns {{ kind: "cash"|"sitngo", tableId: string, handNumber: number|null } | { kind: "mtt_table", tournamentId: string, tableId: string, handNumber: number|null } | null}
 */
export function matchHistoryRoute(path) {
  const cashRoute = matchSingleTableHistoryRoute(
    path,
    HISTORY_CASH_ROUTE,
    "cash",
  );
  if (cashRoute) return cashRoute;

  const sitngoRoute = matchSingleTableHistoryRoute(
    path,
    HISTORY_SITNGO_ROUTE,
    "sitngo",
  );
  if (sitngoRoute) return sitngoRoute;

  const mttTableRoute = matchTournamentTableHistoryRoute(path);
  if (mttTableRoute) return mttTableRoute;

  return null;
}
