import * as PokerGame from "./poker/game.js";
import * as Store from "./store.js";
import { getPlayerProfile } from "./player-profile.js";
import { HttpError } from "./http-error.js";
import { parseBlinds, parseBuyIn, parseSeats } from "./game-route-parsers.js";
import { logFrontendErrorReport } from "./client-error-reporting.js";
import {
  getOrCreateUser,
  parseBody,
  respondWithJson,
  syncUserToGames,
  rethrowTournamentError,
} from "./http-route-utils.js";

/**
 * @typedef {import('./http-route-utils.js').UserType} UserType
 * @typedef {import('./http-route-utils.js').Game} Game
 * @typedef {import('./id.js').Id} Id
 */

/**
 * Creates game-related routes (user, cash, sitngo, mtt, player profiles)
 * @param {Record<string, UserType>} users
 * @param {Map<Id, Game>} games
 * @param {(gameId: Id) => void} broadcast
 * @param {Record<string, any>} services
 * @returns {import('./http-routes.js').Route[]}
 */
export function createGameRoutes(users, games, broadcast, services) {
  return [
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
        services.mttManager?.syncUser(user);

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
    {
      method: "POST",
      path: "/cash",
      handler: async ({ req, res, log }) => {
        getOrCreateUser(req, res, users, log);
        const data = await parseBody(req);
        const seats = parseSeats(data, 9);
        const blinds = parseBlinds(data);
        const game = PokerGame.create({ blinds, seats, kind: "cash" });
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
      },
    },
    {
      method: "POST",
      path: "/sitngo",
      handler: async ({ req, res, log }) => {
        getOrCreateUser(req, res, users, log);
        const data = await parseBody(req);
        const seats = parseSeats(data, 6);
        const buyIn = parseBuyIn(data);
        const game = PokerGame.createTournament({ seats, buyIn });
        games.set(game.id, game);
        Object.assign(log.context, {
          game: {
            type: "sitngo",
            id: game.id,
            seats,
            buyIn,
            initialStack: game.tournament?.initialStack,
          },
        });
        respondWithJson(res, { id: game.id, type: "sitngo" });
      },
    },
    {
      method: "POST",
      path: "/mtt",
      handler: async ({ req, res, log }) => {
        const user = getOrCreateUser(req, res, users, log);
        const data = await parseBody(req);
        const tableSize = parseSeats(data, 6);
        const buyIn = parseBuyIn(data);
        try {
          const id = services.mttManager?.createTournament({
            owner: user,
            buyIn,
            tableSize,
          });
          if (!id) {
            throw new Error("tournament service unavailable");
          }
          Object.assign(log.context, {
            tournament: {
              type: "mtt",
              id,
              ownerId: user.id,
              buyIn,
              tableSize,
            },
          });
          respondWithJson(res, { id, type: "mtt" });
        } catch (err) {
          rethrowTournamentError(err);
        }
      },
    },
    {
      method: "GET",
      path: /^\/api\/mtt\/([a-z0-9]+)$/,
      handler: ({ req, res, match, log }) => {
        const user = getOrCreateUser(req, res, users, log);
        const tournamentId = /** @type {string} */ (
          /** @type {RegExpMatchArray} */ (match)[1]
        );
        try {
          const tournament = services.mttManager?.getTournamentView(
            tournamentId,
            user.id,
          );
          if (!tournament) {
            throw new Error("tournament service unavailable");
          }
          respondWithJson(res, tournament);
        } catch (err) {
          rethrowTournamentError(err);
        }
      },
    },
    {
      method: "POST",
      path: /^\/api\/mtt\/([a-z0-9]+)\/register$/,
      handler: ({ req, res, match, log }) => {
        const user = getOrCreateUser(req, res, users, log);
        const tournamentId = /** @type {string} */ (
          /** @type {RegExpMatchArray} */ (match)[1]
        );
        try {
          const tournament = services.mttManager?.registerPlayer(
            tournamentId,
            user,
          );
          if (!tournament) {
            throw new Error("tournament service unavailable");
          }
          respondWithJson(res, tournament);
        } catch (err) {
          rethrowTournamentError(err);
        }
      },
    },
    {
      method: "POST",
      path: /^\/api\/mtt\/([a-z0-9]+)\/unregister$/,
      handler: ({ req, res, match, log }) => {
        const user = getOrCreateUser(req, res, users, log);
        const tournamentId = /** @type {string} */ (
          /** @type {RegExpMatchArray} */ (match)[1]
        );
        try {
          const tournament = services.mttManager?.unregisterPlayer(
            tournamentId,
            user.id,
            user.id,
          );
          if (!tournament) {
            throw new Error("tournament service unavailable");
          }
          respondWithJson(res, tournament);
        } catch (err) {
          rethrowTournamentError(err);
        }
      },
    },
    {
      method: "POST",
      path: /^\/api\/mtt\/([a-z0-9]+)\/start$/,
      handler: ({ req, res, match, log }) => {
        const user = getOrCreateUser(req, res, users, log);
        const tournamentId = /** @type {string} */ (
          /** @type {RegExpMatchArray} */ (match)[1]
        );
        try {
          const tournament = services.mttManager?.startTournament(
            tournamentId,
            user.id,
          );
          if (!tournament) {
            throw new Error("tournament service unavailable");
          }
          respondWithJson(res, tournament);
        } catch (err) {
          rethrowTournamentError(err);
        }
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
