import * as User from "./user.js";
import * as Store from "./store.js";
import {
  createRateLimiter,
  getClientIp,
  RateLimitError,
} from "./rate-limit.js";
import { HttpError } from "./http-error.js";
import { getSessionPlayerLogContext } from "./logger.js";

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
 * @param {Response} res
 * @param {unknown} data
 */
export function respondWithJson(res, data) {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify(data));
}

/**
 * Syncs user changes to all game seats where the user is seated
 * @param {UserType} user
 * @param {Map<Id, Game>} games
 * @param {(gameId: Id) => void} broadcast
 */
export function syncUserToGames(user, games, broadcast) {
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
 * @param {unknown} err
 * @throws {HttpError}
 */
export function rethrowTournamentError(err) {
  if (err instanceof HttpError) {
    throw err;
  }

  const message =
    err instanceof Error ? err.message : "Unable to process tournament request";
  if (message === "tournament not found") {
    throw new HttpError(404, message, {
      body: { error: message, status: 404 },
    });
  }

  throw new HttpError(400, message, {
    body: { error: message, status: 400 },
  });
}
