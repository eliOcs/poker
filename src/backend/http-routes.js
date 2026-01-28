import crypto from "crypto";
import { getFilePath, respondWithFile } from "./static-files.js";
import * as PokerGame from "./poker/game.js";
import * as Player from "./poker/player.js";
import * as Stakes from "./poker/stakes.js";
import * as HandHistory from "./poker/hand-history/index.js";
import * as logger from "./logger.js";
import * as PlayerStore from "./player-store.js";

/**
 * @typedef {import('./poker/seat.js').Player} PlayerType
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
 * @param {Record<string, PlayerType>} players
 * @returns {PlayerType}
 */
export function getOrCreatePlayer(req, res, players) {
  const cookies = parseCookies(req.headers.cookie ?? "");
  let player = players[cookies.phg];

  if (!player) {
    // Check database for returning visitor
    const loadedPlayer = PlayerStore.load(cookies.phg);

    if (loadedPlayer) {
      // Returning player - add to memory cache
      player = loadedPlayer;
      players[player.id] = player;
    } else {
      // New player - create and persist
      player = Player.create();
      players[player.id] = player;
      PlayerStore.save(player);
      res.setHeader(
        "Set-Cookie",
        `phg=${player.id}; Domain=${process.env.DOMAIN}; HttpOnly; Path=/`,
      );
    }
  }

  return player;
}

/** @returns {string} */
export function generateGameId() {
  return crypto.randomBytes(4).toString("hex");
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
 * @typedef {object} RouteContext
 * @property {Request} req
 * @property {Response} res
 * @property {RegExpMatchArray|null} match
 * @property {Record<string, PlayerType>} players
 * @property {Map<string, Game>} games
 */

/**
 * @typedef {object} Route
 * @property {string} method
 * @property {RegExp|string} path
 * @property {(ctx: RouteContext) => Promise<void>|void} handler
 */

/**
 * Creates the routes array
 * @param {Record<string, PlayerType>} players
 * @param {Map<string, Game>} games
 * @returns {Route[]}
 */
export function createRoutes(players, games) {
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
        getOrCreatePlayer(req, res, players);
        respondWithFile("src/frontend/index.html", res);
      },
    },
    {
      method: "POST",
      path: "/games",
      handler: async ({ req, res }) => {
        getOrCreatePlayer(req, res, players);

        const data = await parseBody(req);
        const gameId = generateGameId();

        const isTournament =
          data !== null &&
          typeof data === "object" &&
          "type" in data &&
          data.type === "tournament";
        const seats = parseSeats(data, isTournament ? 6 : 9);

        if (isTournament) {
          const game = PokerGame.createTournament({ seats });
          games.set(gameId, game);
          logger.info("tournament created", {
            gameId,
            seats,
            initialStack: game.tournament?.initialStack,
          });
          respondWithJson(res, { id: gameId, type: "tournament" });
        } else {
          const blinds = parseBlinds(data);
          const game = PokerGame.create({ blinds, seats });
          games.set(gameId, game);
          logger.info("game created", {
            gameId,
            blinds: `${blinds.small}/${blinds.big}`,
            seats,
          });
          respondWithJson(res, { id: gameId, type: "cash" });
        }
      },
    },
    {
      method: "GET",
      path: /^\/games\/([a-z0-9]+)$/,
      handler: ({ req, res }) => {
        getOrCreatePlayer(req, res, players);
        respondWithFile("src/frontend/index.html", res);
      },
    },
    {
      method: "GET",
      path: /^\/history\/([a-z0-9]+)(\/\d+)?$/,
      handler: ({ req, res }) => {
        getOrCreatePlayer(req, res, players);
        respondWithFile("src/frontend/index.html", res);
      },
    },
    {
      method: "GET",
      path: /^\/api\/history\/([a-z0-9]+)$/,
      handler: async ({ req, res, match }) => {
        const gameId = /** @type {RegExpMatchArray} */ (match)[1];
        const player = getOrCreatePlayer(req, res, players);

        const hands = await HandHistory.getAllHands(gameId);
        const summaries = hands.map((hand) =>
          HandHistory.getHandSummary(hand, player.id),
        );
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ hands: summaries, playerId: player.id }));
      },
    },
    {
      method: "GET",
      path: /^\/api\/history\/([a-z0-9]+)\/(\d+)$/,
      handler: async ({ req, res, match }) => {
        const m = /** @type {RegExpMatchArray} */ (match);
        const gameId = m[1];
        const handNumber = parseInt(m[2], 10);
        const player = getOrCreatePlayer(req, res, players);

        const hand = await HandHistory.getHand(gameId, handNumber);
        if (!hand) {
          res.writeHead(404, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: "Hand not found" }));
          return;
        }

        const filteredHand = HandHistory.filterHandForPlayer(hand, player.id);
        const view = HandHistory.getHandView(filteredHand, player.id);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({ hand: filteredHand, view, playerId: player.id }),
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

    await route.handler({ req, res, match, players: {}, games: new Map() });
    return;
  }

  // Static file fallback
  const filePath = getFilePath(url);
  if (method === "GET" && filePath) {
    respondWithFile(filePath, res);
    return;
  }

  res.writeHead(404);
  res.end();
}
