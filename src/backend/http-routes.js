import { getFilePath, respondWithFile } from "./static-files.js";
import { createLog } from "./logger.js";
import { createSignInRoutes } from "./sign-in-routes.js";
import { createGameRoutes } from "./game-routes.js";
import { createHistoryRoutes } from "./history-routes.js";
import { getOrCreateUser, parseBody } from "./http-route-utils.js";
import {
  LIVE_CASH_ROUTE,
  LIVE_SITNGO_ROUTE,
  HISTORY_CASH_ROUTE,
  HISTORY_SITNGO_ROUTE,
  HISTORY_MTT_TABLE_ROUTE,
  LIVE_MTT_ROUTE,
  LIVE_MTT_TABLE_ROUTE,
} from "../shared/routes.js";

export {
  parseBody,
  parseCookies,
  getOrCreateUser,
} from "./http-route-utils.js";
export { logFrontendErrorReport } from "./client-error-reporting.js";

/**
 * @typedef {import('./http-route-utils.js').UserType} UserType
 * @typedef {import('./http-route-utils.js').Game} Game
 * @typedef {import('./http-route-utils.js').Id} Id
 * @typedef {import('http').IncomingMessage} Request
 * @typedef {import('http').ServerResponse} Response
 */

/**
 * @typedef {object} RouteContext
 * @property {Request} req
 * @property {Response} res
 * @property {RegExpMatchArray|null} match
 * @property {Record<string, UserType>} users
 * @property {Map<Id, Game>} games
 * @property {(gameId: Id) => void} broadcast
 * @property {import('./logger.js').Log} log
 */

/**
 * @typedef {object} Route
 * @property {string} method
 * @property {RegExp|string} path
 * @property {(ctx: RouteContext) => Promise<void>|void} handler
 */

/**
 * Creates a SPA page route that serves index.html
 * @param {string|RegExp} path
 * @param {Record<string, UserType>} users
 * @returns {Route}
 */
function spaPageRoute(path, users) {
  return {
    method: "GET",
    path,
    handler: ({ req, res, log }) => {
      getOrCreateUser(req, res, users, log);
      respondWithFile(req, res, "src/frontend/index.html");
    },
  };
}

/**
 * Creates the routes array
 * @param {Record<string, UserType>} users
 * @param {Map<Id, Game>} games
 * @param {(gameId: Id) => void} broadcast
 * @returns {Route[]}
 */
export function createRoutes(users, games, broadcast, services = {}) {
  return [
    {
      method: "GET",
      path: "/up",
      handler: ({ res }) => {
        res.writeHead(200, { "content-type": "text/plain" });
        res.end("OK");
      },
    },
    spaPageRoute("/", users),
    ...createGameRoutes(users, games, broadcast, services),
    ...createSignInRoutes({
      sendSignInEmail: services.sendSignInEmail,
      clientConnections: services.clientConnections,
    }).map((route) => ({
      ...route,
      handler: (ctx) =>
        route.handler({
          ...ctx,
          getOrCreateUser,
          parseBody,
        }),
    })),
    spaPageRoute(LIVE_CASH_ROUTE, users),
    spaPageRoute(LIVE_SITNGO_ROUTE, users),
    spaPageRoute(LIVE_MTT_ROUTE, users),
    spaPageRoute(LIVE_MTT_TABLE_ROUTE, users),
    spaPageRoute(HISTORY_CASH_ROUTE, users),
    spaPageRoute(HISTORY_SITNGO_ROUTE, users),
    spaPageRoute(HISTORY_MTT_TABLE_ROUTE, users),
    spaPageRoute(/^\/players\/([a-z0-9]+)$/, users),
    spaPageRoute("/release-notes", users),
    spaPageRoute(/^\/auth\/email-sign-in\/callback(?:\?.*)?$/, users),
    ...createHistoryRoutes(users),
  ];
}

/**
 * @param {Request} req
 * @param {Response} res
 * @param {Route[]} routes
 */
export async function handleRequest(req, res, routes) {
  const url = req.url ?? "";
  const method = req.method ?? "GET";

  for (const route of routes) {
    if (route.method !== method) continue;

    /** @type {RegExpMatchArray|null} */
    let match = null;
    if (typeof route.path === "string") {
      if (route.path !== url) continue;
    } else {
      match = url.match(route.path);
      if (!match) continue;
    }

    await route.handler({
      req,
      res,
      match,
      users: {},
      games: new Map(),
      broadcast: () => {},
      log: createLog("http_request"),
    });
    return;
  }

  // Static file fallback
  const filePath = getFilePath(url);
  if (method === "GET" && filePath) {
    respondWithFile(req, res, filePath);
    return;
  }

  res.writeHead(404);
  res.end();
}
