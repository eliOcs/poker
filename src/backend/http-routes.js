import { getFilePath, respondWithFile } from "./static-files.js";
import * as PokerGame from "./poker/game.js";
import * as User from "./user.js";
import * as HandHistory from "./poker/hand-history/index.js";
import * as Store from "./store.js";
import { getPlayerProfile } from "./player-profile.js";
import {
  createRateLimiter,
  getClientIp,
  RateLimitError,
} from "./rate-limit.js";
import { HttpError } from "./http-error.js";
import { getSessionPlayerLogContext } from "./logger.js";
import { createLog } from "./logger.js";
import { parseBlinds, parseBuyIn, parseSeats } from "./game-route-parsers.js";
import { logFrontendErrorReport } from "./client-error-reporting.js";
export { logFrontendErrorReport } from "./client-error-reporting.js";
import { createSignInRoutes } from "./sign-in-routes.js";

/**
 * @typedef {import('./user.js').User} UserType
 * @typedef {import('./poker/game.js').Game} Game
 * @typedef {import('./id.js').Id} Id
 * @typedef {import('http').IncomingMessage} Request
 * @typedef {import('http').ServerResponse} Response
 */

const USER_CREATION_LIMIT_MAX_ACTIONS = 10;
const USER_CREATION_BLOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const userCreationRateLimiter = createRateLimiter({
  maxActions: USER_CREATION_LIMIT_MAX_ACTIONS,
  blockDurationMs: USER_CREATION_BLOCK_DURATION_MS,
});

/**
 * @param {Request} req
 * @param {import('./logger.js').Log} log
 */
function throwIfUserCreateRateLimited(req, log) {
  const clientIp = getClientIp(req);
  try {
    const creationRateLimit = userCreationRateLimiter.check(`ip:${clientIp}`, {
      source: "user-create",
    });
    log.context.userCreateRateLimit = creationRateLimit.context;
  } catch (err) {
    if (err instanceof RateLimitError) {
      log.context.userCreateRateLimit = err.rateLimit;
    }
    throw new HttpError(429, "Too many requests", {
      body: { error: "Too many requests", status: 429 },
      headers: {
        "retry-after": String(
          err instanceof RateLimitError ? err.retryAfterSeconds : 1,
        ),
      },
    });
  }
}

/**
 * @param {Response} res
 * @param {Record<string, UserType>} users
 * @returns {UserType}
 */
function createAndPersistUser(res, users) {
  const user = User.create();
  users[user.id] = user;
  Store.saveUser(user);
  const cookieDomain = process.env.DOMAIN
    ? ` Domain=${process.env.DOMAIN};`
    : "";
  const secure = process.env.APP_ORIGIN?.startsWith("https") ? " Secure;" : "";
  res.setHeader(
    "Set-Cookie",
    `phg=${user.id};${cookieDomain} HttpOnly;${secure} SameSite=Strict; Path=/`,
  );
  return user;
}

/**
 * Parses the request body as JSON
 * @param {Request} req
 * @returns {Promise<unknown>}
 */
export function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      if (!body) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(
          new HttpError(400, "Invalid JSON payload", {
            body: { error: "Invalid JSON payload", status: 400 },
          }),
        );
      }
    });
    req.on("error", reject);
  });
}

/**
 * @param {string} rawCookies
 * @returns {Record<string, string>}
 */
export function parseCookies(rawCookies) {
  /** @type {Record<string, string>} */
  const cookies = {};
  for (const rawCookie of rawCookies.split("; ")) {
    const [key, value] = rawCookie.split("=");
    if (key !== undefined) cookies[key] = value ?? "";
  }
  return cookies;
}

/**
 * @param {Request} req
 * @param {Response} res
 * @param {Record<string, UserType>} users
 * @param {import('./logger.js').Log} log
 * @returns {UserType}
 */
export function getOrCreateUser(req, res, users, log) {
  const cookies = parseCookies(req.headers.cookie ?? "");
  const cookieId = cookies.phg ?? "";
  const existingUser = users[cookieId];
  if (existingUser) {
    Object.assign(log.context, getSessionPlayerLogContext(existingUser));
    return existingUser;
  }

  const loadedUser = Store.loadUser(cookieId);
  if (loadedUser) {
    users[loadedUser.id] = loadedUser;
    Object.assign(log.context, getSessionPlayerLogContext(loadedUser));
    return loadedUser;
  }

  throwIfUserCreateRateLimited(req, log);
  const user = createAndPersistUser(res, users);
  Object.assign(log.context, getSessionPlayerLogContext(user));
  return user;
}

/**
 * Sends a JSON response
 * @param {import('http').ServerResponse} res
 * @param {unknown} data
 */
function respondWithJson(res, data) {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify(data));
}

/**
 * @param {Request} req
 * @returns {string}
 */
/**
 * Syncs user changes to all game seats where the user is seated
 * @param {UserType} user
 * @param {Map<Id, Game>} games
 * @param {(gameId: Id) => void} broadcast
 */
function syncUserToGames(user, games, broadcast) {
  for (const [gameId, game] of games) {
    let changed = false;
    for (const seat of game.seats) {
      if (!seat.empty && seat.player.id === user.id) {
        seat.player.name = user.name;
        changed = true;
      }
    }
    if (changed) broadcast(gameId);
  }
}

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
    {
      method: "GET",
      path: "/",
      handler: ({ req, res, log }) => {
        getOrCreateUser(req, res, users, log);
        respondWithFile(req, res, "src/frontend/index.html");
      },
    },
    {
      method: "GET",
      path: "/api/users/me",
      handler: ({ req, res, log }) => {
        const user = getOrCreateUser(req, res, users, log);
        respondWithJson(res, {
          id: user.id,
          name: user.name,
          email: user.email,
          settings: user.settings,
        });
      },
    },
    {
      method: "PUT",
      path: "/api/users/me",
      handler: async ({ req, res, log }) => {
        const user = getOrCreateUser(req, res, users, log);
        const data = await parseBody(req);

        if (data && typeof data === "object") {
          if ("name" in data) {
            user.name = /** @type {string|null|undefined} */ (data.name)
              ?.trim()
              .substring(0, 20);
            if (user.name === "") user.name = undefined;
          }
          if (
            "settings" in data &&
            typeof data.settings === "object" &&
            data.settings !== null
          ) {
            user.settings = { ...user.settings, ...data.settings };
          }
        }

        Store.saveUser(user);
        syncUserToGames(user, games, broadcast);

        respondWithJson(res, {
          id: user.id,
          name: user.name,
          email: user.email,
          settings: user.settings,
        });
      },
    },
    {
      method: "POST",
      path: "/api/client-errors",
      handler: async ({ req, res, log }) => {
        const user = getOrCreateUser(req, res, users, log);
        const data = await parseBody(req);
        logFrontendErrorReport(req, user, data);
        res.writeHead(204);
        res.end();
      },
    },
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
    {
      method: "POST",
      path: "/games",
      handler: async ({ req, res, log }) => {
        getOrCreateUser(req, res, users, log);

        const data = await parseBody(req);

        const isTournament =
          data !== null &&
          typeof data === "object" &&
          "type" in data &&
          data.type === "tournament";
        const seats = parseSeats(data, isTournament ? 6 : 9);

        if (isTournament) {
          const buyIn = parseBuyIn(data);
          const game = PokerGame.createTournament({ seats, buyIn });
          games.set(game.id, game);
          Object.assign(log.context, {
            game: {
              type: "tournament",
              id: game.id,
              seats,
              buyIn,
              initialStack: game.tournament?.initialStack,
            },
          });
          respondWithJson(res, { id: game.id, type: "tournament" });
        } else {
          const blinds = parseBlinds(data);
          const game = PokerGame.create({ blinds, seats });
          games.set(game.id, game);
          Object.assign(log.context, {
            game: {
              type: "cash",
              id: game.id,
              blinds: `${blinds.small}/${blinds.big}`,
              seats,
            },
          });
          respondWithJson(res, { id: game.id, type: "cash" });
        }
      },
    },
    {
      method: "GET",
      path: /^\/games\/([a-z0-9]+)$/,
      handler: ({ req, res, log }) => {
        getOrCreateUser(req, res, users, log);
        respondWithFile(req, res, "src/frontend/index.html");
      },
    },
    {
      method: "GET",
      path: /^\/history\/([a-z0-9]+)(\/\d+)?$/,
      handler: ({ req, res, log }) => {
        getOrCreateUser(req, res, users, log);
        respondWithFile(req, res, "src/frontend/index.html");
      },
    },
    {
      method: "GET",
      path: /^\/players\/([a-z0-9]+)$/,
      handler: ({ req, res, log }) => {
        getOrCreateUser(req, res, users, log);
        respondWithFile(req, res, "src/frontend/index.html");
      },
    },
    {
      method: "GET",
      path: "/release-notes",
      handler: ({ req, res, log }) => {
        getOrCreateUser(req, res, users, log);
        respondWithFile(req, res, "src/frontend/index.html");
      },
    },
    {
      method: "GET",
      path: /^\/auth\/email-sign-in\/callback(?:\?.*)?$/,
      handler: ({ req, res, log }) => {
        getOrCreateUser(req, res, users, log);
        respondWithFile(req, res, "src/frontend/index.html");
      },
    },
    {
      method: "GET",
      path: /^\/api\/history\/([a-z0-9]+)$/,
      handler: async ({ req, res, match, log }) => {
        const gameId = /** @type {string} */ (
          /** @type {RegExpMatchArray} */ (match)[1]
        );
        const user = getOrCreateUser(req, res, users, log);

        const hands = await HandHistory.getAllHands(gameId);
        const summaries = hands.map((hand) =>
          HandHistory.getHandSummary(hand, user.id),
        );
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ hands: summaries, playerId: user.id }));
      },
    },
    {
      method: "GET",
      path: /^\/api\/history\/([a-z0-9]+)\/(\d+)$/,
      handler: async ({ req, res, match, log }) => {
        const m = /** @type {RegExpMatchArray} */ (match);
        const gameId = /** @type {string} */ (m[1]);
        const handNumber = parseInt(/** @type {string} */ (m[2]), 10);
        const user = getOrCreateUser(req, res, users, log);

        const hand = await HandHistory.getHand(gameId, handNumber);
        if (!hand) {
          throw new HttpError(404, "Hand not found", {
            body: { error: "Hand not found", status: 404 },
          });
        }

        const filteredHand = HandHistory.filterHandForPlayer(hand, user.id);
        const view = HandHistory.getHandView(filteredHand, user.id);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({ hand: filteredHand, view, playerId: user.id }),
        );
      },
    },
    {
      method: "GET",
      path: /^\/api\/players\/([a-z0-9]+)$/,
      handler: async ({ req, res, match, log }) => {
        getOrCreateUser(req, res, users, log);
        const playerId = /** @type {string} */ (
          /** @type {RegExpMatchArray} */ (match)[1]
        );
        const profile = await getPlayerProfile(games, playerId);

        if (!profile) {
          throw new HttpError(404, "Player not found", {
            body: { error: "Player not found", status: 404 },
          });
        }

        respondWithJson(res, profile);
      },
    },
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
