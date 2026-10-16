import * as PokerGame from "./poker/game.js";
import * as Store from "./store.js";
import { getPlayerProfile } from "./player-profile.js";
import { HttpError } from "./http-error.js";
import {
  parseBlinds,
  parseBuyIn,
  parseSeats,
  parseTournamentSpeed,
} from "./game-route-parsers.js";
import { logFrontendErrorReport } from "./client-error-reporting.js";
import { getTablePath } from "../shared/routes.js";
import { canonicalizeAvatar } from "../shared/avatar.js";
import { getAvatarRevision } from "./avatar.js";
import {
  getOrCreateUser,
  parseBody,
  respondWithJson,
  routeParam,
  syncUserToGames,
  rethrowTournamentError,
} from "./http-route-utils.js";

/**
 * @typedef {import('./http-route-utils.js').UserType} UserType
 * @typedef {import('./http-route-utils.js').Game} Game
 * @typedef {import('./id.js').Id} Id
 */

/**
 * @param {Map<Id, Game>} games
 * @param {Id} userId
 * @returns {string|void}
 */
export function findActiveGamePath(games, userId) {
  const liveGames = [...games.values()];
  for (let i = liveGames.length - 1; i >= 0; i -= 1) {
    const game = liveGames[i];
    if (!game || !isActiveGameForUser(game, userId)) continue;

    if (game.kind === "mtt") {
      return getTablePath("mtt", game.id, game.tournamentId);
    }

    return getTablePath(game.kind, game.id);
  }

  return;
}

/**
 * @param {Game} game
 * @param {Id} userId
 * @returns {boolean}
 */
function isActiveGameForUser(game, userId) {
  const seat = findOccupiedSeatForUser(game, userId);
  return game.running && !!seat;
}

/**
 * @param {Game} game
 * @param {Id} userId
 * @returns {import('./poker/seat.js').OccupiedSeat|void}
 */
function findOccupiedSeatForUser(game, userId) {
  for (const seat of game.seats) {
    if (!seat.empty && seat.player.id === userId) return seat;
  }
  return;
}

/**
 * @param {unknown} data
 * @returns {string|undefined}
 */
function parseTournamentName(data) {
  if (!data || typeof data !== "object" || !("name" in data)) {
    return undefined;
  }

  const { name } = /** @type {{ name?: unknown }} */ (data);
  return typeof name === "string" ? name : undefined;
}

/**
 * @param {import('./mtt.js').ManagedTournament|undefined} tournament
 * @param {UserType} user
 * @returns {Record<string, unknown>}
 */
function buildRegistrationLog(tournament, user) {
  return {
    tournamentId: tournament?.id,
    playerId: user.id,
    mode: tournament?.status === "running" ? "late" : "pre-start",
    level: tournament?.level,
    entryPeriodLevels: tournament?.entryPeriodLevels,
    result: "rejected",
  };
}

/** @param {import('./mtt.js').ManagedTournamentView} tournament */
function getRegistrationSeating(tournament) {
  if (tournament.status === "registration") return "pre-start";
  return tournament.currentPlayer.tableId ? "immediate" : "queued";
}

/**
 * @param {() => void} action
 * @param {(err: unknown) => void} [onError]
 */
function withTournamentErrors(action, onError) {
  try {
    action();
  } catch (err) {
    onError?.(err);
    rethrowTournamentError(err);
  }
}

function parseUserSettings(settings, updates) {
  if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
    throw new HttpError(400, "Invalid user settings");
  }
  const nextSettings = { ...settings, ...updates };
  if (
    "amountDisplay" in updates &&
    !["default", "currency", "bb"].includes(updates.amountDisplay)
  ) {
    throw new HttpError(400, "Invalid amount display preference");
  }
  if (!("avatar" in updates)) return nextSettings;

  // JSON requires null to distinguish removal from an omitted setting.
  // eslint-disable-next-line no-restricted-syntax
  if (updates.avatar === null) {
    delete nextSettings.avatar;
    return nextSettings;
  }

  try {
    nextSettings.avatar = canonicalizeAvatar(updates.avatar);
  } catch (error) {
    throw new HttpError(400, "Invalid avatar configuration", {
      body: {
        error: "Invalid avatar configuration",
        status: 400,
        detail: error instanceof Error ? error.message : undefined,
      },
    });
  }
  return nextSettings;
}

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {import('../shared/avatar.js').AvatarConfiguration} avatar
 */
function respondWithAvatar(req, res, avatar) {
  const revision = getAvatarRevision(avatar);
  const etag = `"${revision}"`;
  const headers = {
    "cache-control": "public, max-age=0, must-revalidate",
    etag,
  };
  if (req.headers["if-none-match"] === etag) {
    res.writeHead(304, headers);
    res.end();
    return;
  }
  res.writeHead(200, {
    ...headers,
    "content-type": "application/json",
  });
  res.end(JSON.stringify({ revision, avatar }));
}

/**
 * Creates game-related routes (user, cash, sitngo, mtt, player profiles)
 * @param {Record<string, UserType>} users
 * @param {Map<Id, Game>} games
 * @param {(gameId: Id) => void} broadcast
 * @param {{ mttManager: ReturnType<typeof import('./mtt.js').createMttManager> }} services
 * @returns {import('./http-routes.js').Route[]}
 */
export function createGameRoutes(users, games, broadcast, services) {
  return [
    {
      method: "GET",
      path: "/api/users/me",
      handler: ({ req, res, log }) => {
        const user = getOrCreateUser(req, res, users, log);
        const activeGamePath = findActiveGamePath(games, user.id);
        respondWithJson(res, {
          id: user.id,
          name: user.name,
          email: user.email,
          settings: user.settings,
          activeGamePath,
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
          const settings =
            "settings" in data
              ? parseUserSettings(user.settings, data.settings)
              : user.settings;
          if ("name" in data) {
            user.name = /** @type {string|null|undefined} */ (data.name)
              ?.trim()
              .substring(0, 20);
            if (user.name === "") user.name = undefined;
          }
          user.settings = settings;
        }

        Store.saveUser(user);
        syncUserToGames(user, games, broadcast);
        services.mttManager.syncUser(user);
        const activeGamePath = findActiveGamePath(games, user.id);

        respondWithJson(res, {
          id: user.id,
          name: user.name,
          email: user.email,
          settings: user.settings,
          activeGamePath,
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
        const speed = parseTournamentSpeed(data);
        const game = PokerGame.createTournament({
          seats,
          buyIn,
          speed,
        });
        games.set(game.id, game);
        Object.assign(log.context, {
          game: {
            type: "sitngo",
            id: game.id,
            seats,
            buyIn,
            speed,
            durationMinutes: game.tournament?.durationMinutes,
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
        const speed = parseTournamentSpeed(data);
        withTournamentErrors(() => {
          const id = services.mttManager.createTournament({
            owner: user,
            buyIn,
            tableSize,
            speed,
          });
          Object.assign(log.context, {
            tournament: {
              type: "mtt",
              id,
              ownerId: user.id,
              buyIn,
              tableSize,
              speed,
            },
          });
          respondWithJson(res, { id, type: "mtt" });
        });
      },
    },
    {
      method: "PUT",
      path: /^\/api\/mtt\/([a-z0-9]+)$/,
      handler: async ({ req, res, match, log }) => {
        const user = getOrCreateUser(req, res, users, log);
        const tournamentId = routeParam(match);
        const data = await parseBody(req);
        const name = parseTournamentName(data);
        withTournamentErrors(() => {
          const tournament = services.mttManager.renameTournament(
            tournamentId,
            name,
            user.id,
          );
          Object.assign(log.context, {
            tournament: { id: tournamentId, name: tournament.name },
          });
          respondWithJson(res, tournament);
        });
      },
    },
    {
      method: "GET",
      path: /^\/api\/players\/([a-z0-9]+)\/avatar$/,
      handler: ({ req, res, match, log }) => {
        getOrCreateUser(req, res, users, log);
        const playerId = routeParam(match);
        const avatar = Store.loadUserProfile(playerId)?.settings.avatar;
        if (!avatar) {
          throw new HttpError(404, "Avatar not found");
        }
        respondWithAvatar(req, res, avatar);
      },
    },
    {
      method: "GET",
      path: /^\/api\/mtt\/([a-z0-9]+)$/,
      handler: ({ req, res, match, log }) => {
        const user = getOrCreateUser(req, res, users, log);
        const tournamentId = routeParam(match);
        withTournamentErrors(() => {
          const tournament = services.mttManager.getTournamentView(
            tournamentId,
            user.id,
          );
          respondWithJson(res, tournament);
        });
      },
    },
    {
      method: "POST",
      path: /^\/api\/mtt\/([a-z0-9]+)\/register$/,
      handler: ({ req, res, match, log }) => {
        const user = getOrCreateUser(req, res, users, log);
        const tournamentId = routeParam(match);
        const tournamentState = services.mttManager.getTournament(tournamentId);
        const registrationLog = buildRegistrationLog(tournamentState, user);
        registrationLog.tournamentId = tournamentId;
        log.context.mttRegistration = registrationLog;
        withTournamentErrors(
          () => {
            const tournament = services.mttManager.registerPlayer(
              tournamentId,
              user,
            );
            registrationLog.result = "accepted";
            registrationLog.seating = getRegistrationSeating(tournament);
            respondWithJson(res, tournament);
          },
          (err) => {
            registrationLog.error =
              err instanceof Error ? err.message : String(err);
          },
        );
      },
    },
    {
      method: "POST",
      path: /^\/api\/mtt\/([a-z0-9]+)\/unregister$/,
      handler: ({ req, res, match, log }) => {
        const user = getOrCreateUser(req, res, users, log);
        const tournamentId = routeParam(match);
        withTournamentErrors(() => {
          const tournament = services.mttManager.unregisterPlayer(
            tournamentId,
            user.id,
            user.id,
          );
          respondWithJson(res, tournament);
        });
      },
    },
    {
      method: "POST",
      path: /^\/api\/mtt\/([a-z0-9]+)\/start$/,
      handler: ({ req, res, match, log }) => {
        const user = getOrCreateUser(req, res, users, log);
        const tournamentId = routeParam(match);
        withTournamentErrors(() => {
          const tournament = services.mttManager.startTournament(
            tournamentId,
            user.id,
          );
          respondWithJson(res, tournament);
        });
      },
    },
    {
      method: "GET",
      path: /^\/api\/players\/([a-z0-9]+)$/,
      handler: async ({ req, res, match, log }) => {
        getOrCreateUser(req, res, users, log);
        const playerId = routeParam(match);
        const profile = await getPlayerProfile(games, playerId);

        if (!profile) {
          throw new HttpError(404, "Player not found");
        }

        respondWithJson(res, profile);
      },
    },
  ];
}
