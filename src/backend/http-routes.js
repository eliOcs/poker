import { getFilePath, respondWithFile } from "./static-files.js";
import * as PokerGame from "./poker/game.js";
import * as User from "./user.js";
import * as Stakes from "./poker/stakes.js";
import * as HandHistory from "./poker/hand-history/index.js";
import * as logger from "./logger.js";
import * as Store from "./store.js";

/**
 * @typedef {import('./user.js').User} UserType
 * @typedef {import('./poker/game.js').Game} Game
 * @typedef {import('http').IncomingMessage} Request
 * @typedef {import('http').ServerResponse} Response
 */

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
      } catch (err) {
        reject(err);
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
    cookies[key] = value;
  }
  return cookies;
}

/**
 * @param {Request} req
 * @param {Response} res
 * @param {Record<string, UserType>} users
 * @returns {UserType}
 */
export function getOrCreateUser(req, res, users) {
  const cookies = parseCookies(req.headers.cookie ?? "");
  let user = users[cookies.phg];

  if (!user) {
    // Check database for returning visitor
    const loadedUser = Store.loadUser(cookies.phg);

    if (loadedUser) {
      // Returning user - add to memory cache
      user = loadedUser;
      users[user.id] = user;
    } else {
      // New user - create and persist
      user = User.create();
      users[user.id] = user;
      Store.saveUser(user);
      res.setHeader(
        "Set-Cookie",
        `phg=${user.id}; Domain=${process.env.DOMAIN}; HttpOnly; Path=/`,
      );
    }
  }

  return user;
}

/**
 * Parses seat count from request data
 * @param {unknown} data
 * @param {number} defaultSeats
 * @returns {number}
 */
function parseSeats(data, defaultSeats) {
  if (
    data &&
    typeof data === "object" &&
    "seats" in data &&
    [2, 6, 9].includes(/** @type {number} */ (data.seats))
  ) {
    return /** @type {number} */ (data.seats);
  }
  return defaultSeats;
}

/**
 * Parses blinds from request data
 * @param {unknown} data
 * @returns {{ ante: number, small: number, big: number }}
 */
function parseBlinds(data) {
  if (
    data &&
    typeof data === "object" &&
    "small" in data &&
    "big" in data &&
    Stakes.isValidPreset({
      small: /** @type {number} */ (data.small),
      big: /** @type {number} */ (data.big),
    })
  ) {
    return {
      ante: 0,
      small: /** @type {number} */ (data.small),
      big: /** @type {number} */ (data.big),
    };
  }
  return { ante: 0, small: Stakes.DEFAULT.small, big: Stakes.DEFAULT.big };
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
 * Syncs user changes to all game seats where the user is seated
 * @param {UserType} user
 * @param {Map<string, Game>} games
 * @param {(gameId: string) => void} broadcast
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
 * @property {Map<string, Game>} games
 * @property {(gameId: string) => void} broadcast
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
 * @param {Map<string, Game>} games
 * @param {(gameId: string) => void} broadcast
 * @returns {Route[]}
 */
export function createRoutes(users, games, broadcast) {
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
      handler: ({ req, res }) => {
        getOrCreateUser(req, res, users);
        respondWithFile(req, res, "src/frontend/index.html");
      },
    },
    {
      method: "GET",
      path: "/api/users/me",
      handler: ({ req, res }) => {
        const user = getOrCreateUser(req, res, users);
        respondWithJson(res, {
          id: user.id,
          name: user.name,
          settings: user.settings,
        });
      },
    },
    {
      method: "PUT",
      path: "/api/users/me",
      handler: async ({ req, res }) => {
        const user = getOrCreateUser(req, res, users);
        const data = await parseBody(req);

        if (data && typeof data === "object") {
          if ("name" in data) {
            const name = /** @type {string|null} */ (data.name);
            user.name = name?.trim().substring(0, 20) || null;
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
          settings: user.settings,
        });
      },
    },
    {
      method: "POST",
      path: "/games",
      handler: async ({ req, res }) => {
        getOrCreateUser(req, res, users);

        const data = await parseBody(req);

        const isTournament =
          data !== null &&
          typeof data === "object" &&
          "type" in data &&
          data.type === "tournament";
        const seats = parseSeats(data, isTournament ? 6 : 9);

        if (isTournament) {
          const game = PokerGame.createTournament({ seats });
          games.set(game.id, game);
          logger.info("tournament created", {
            gameId: game.id,
            seats,
            initialStack: game.tournament?.initialStack,
          });
          respondWithJson(res, { id: game.id, type: "tournament" });
        } else {
          const blinds = parseBlinds(data);
          const game = PokerGame.create({ blinds, seats });
          games.set(game.id, game);
          logger.info("game created", {
            gameId: game.id,
            blinds: `${blinds.small}/${blinds.big}`,
            seats,
          });
          respondWithJson(res, { id: game.id, type: "cash" });
        }
      },
    },
    {
      method: "GET",
      path: /^\/games\/([a-z0-9]+)$/,
      handler: ({ req, res }) => {
        getOrCreateUser(req, res, users);
        respondWithFile(req, res, "src/frontend/index.html");
      },
    },
    {
      method: "GET",
      path: /^\/history\/([a-z0-9]+)(\/\d+)?$/,
      handler: ({ req, res }) => {
        getOrCreateUser(req, res, users);
        respondWithFile(req, res, "src/frontend/index.html");
      },
    },
    {
      method: "GET",
      path: /^\/api\/history\/([a-z0-9]+)$/,
      handler: async ({ req, res, match }) => {
        const gameId = /** @type {RegExpMatchArray} */ (match)[1];
        const user = getOrCreateUser(req, res, users);

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
      handler: async ({ req, res, match }) => {
        const m = /** @type {RegExpMatchArray} */ (match);
        const gameId = m[1];
        const handNumber = parseInt(m[2], 10);
        const user = getOrCreateUser(req, res, users);

        const hand = await HandHistory.getHand(gameId, handNumber);
        if (!hand) {
          res.writeHead(404, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: "Hand not found" }));
          return;
        }

        const filteredHand = HandHistory.filterHandForPlayer(hand, user.id);
        const view = HandHistory.getHandView(filteredHand, user.id);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({ hand: filteredHand, view, playerId: user.id }),
        );
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
