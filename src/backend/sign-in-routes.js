import { HttpError } from "./http-error.js";
import * as Store from "./store.js";
import { sendSignInEmail as sendEmail } from "./email.js";
import { rewritePlayerIdInHandHistory } from "./poker/hand-history/io.js";
import {
  buildEmailSignInUrl,
  consumeEmailSignInToken,
  createEmailSignInToken,
  getEmailSignInExpiry,
  isValidEmail,
  normalizeEmail,
  normalizeReturnPath,
  saveEmailSignInToken,
} from "./sign-in.js";
import { DEFAULT_SETTINGS } from "./user.js";

/**
 * @typedef {import('./id.js').Id} Id
 */

/** @returns {string} */
function getAppOrigin() {
  const appOrigin = process.env.APP_ORIGIN?.replace(/\/$/, "");
  if (!appOrigin) {
    throw new Error("APP_ORIGIN is required for email sign-in links");
  }
  return appOrigin;
}

/**
 * @param {import('./http-routes.js').Response} res
 * @param {Id} userId
 */
function setSessionCookie(res, userId) {
  const cookieDomain = process.env.DOMAIN
    ? ` Domain=${process.env.DOMAIN};`
    : "";
  const secure = process.env.APP_ORIGIN?.startsWith("https") ? " Secure;" : "";
  res.setHeader(
    "Set-Cookie",
    `phg=${userId};${cookieDomain} HttpOnly;${secure} SameSite=Strict; Path=/`,
  );
}

/**
 * @param {Map<Id, import('./poker/game.js').Game>} games
 * @param {Id} guestUserId
 * @param {import('./user.js').User} targetUser
 * @returns {Set<Id>}
 */
function migrateGuestSeatsToRegisteredUser(games, guestUserId, targetUser) {
  /** @type {Set<Id>} */
  const changedGameIds = new Set();
  for (const [gameId, game] of games) {
    let changed = false;
    for (const seat of game.seats) {
      if (!seat.empty && seat.player.id === guestUserId) {
        seat.player.id = targetUser.id;
        seat.player.name = targetUser.name;
        seat.disconnected = false;
        changed = true;
      }
    }
    if (changed) {
      changedGameIds.add(gameId);
    }
  }

  return changedGameIds;
}

/**
 * @param {Map<import('ws').WebSocket, { user: import('./user.js').User, gameId: Id|null, tournamentId: Id|null }>} clientConnections
 * @param {Id} guestUserId
 * @param {import('./user.js').User} targetUser
 * @param {Set<Id>} changedGameIds
 */
function migrateGuestConnectionsToRegisteredUser(
  clientConnections,
  guestUserId,
  targetUser,
  changedGameIds,
) {
  for (const [, connection] of clientConnections) {
    if (connection.user.id === guestUserId) {
      connection.user = targetUser;
      if (connection.gameId) {
        changedGameIds.add(connection.gameId);
      }
    }
  }
}

/**
 * @param {Map<Id, import('./poker/game.js').Game>} games
 * @param {Map<import('ws').WebSocket, { user: import('./user.js').User, gameId: Id|null, tournamentId: Id|null }>} clientConnections
 * @param {(gameId: Id) => void} broadcast
 * @param {Id} guestUserId
 * @param {import('./user.js').User} targetUser
 */
function migrateGuestSessionToRegisteredUser(
  games,
  clientConnections,
  broadcast,
  guestUserId,
  targetUser,
) {
  const changedGameIds = migrateGuestSeatsToRegisteredUser(
    games,
    guestUserId,
    targetUser,
  );
  migrateGuestConnectionsToRegisteredUser(
    clientConnections,
    guestUserId,
    targetUser,
    changedGameIds,
  );

  for (const gameId of changedGameIds) {
    broadcast(gameId);
  }
}

/**
 * @param {import('./logger.js').Log} log
 * @param {{ kind: string, provider?: string, toEmail: string, sinkFileName?: string }} delivery
 */
function setEmailDeliveryLogContext(log, delivery) {
  log.context.email = delivery;
}

/**
 * @param {Record<string, any>} users
 * @param {Map<Id, import('./poker/game.js').Game>} games
 * @param {Map<import('ws').WebSocket, { user: import('./user.js').User, gameId: Id|null, tournamentId: Id|null }>} clientConnections
 * @param {(gameId: Id) => void} broadcast
 * @param {import('./http-routes.js').Response} res
 * @param {{ userId: Id, email: string, returnPath: string }} signIn
 * @returns {Promise<string>}
 */
async function completeSignIn(
  users,
  games,
  clientConnections,
  broadcast,
  res,
  signIn,
) {
  const guestUser = Store.loadUser(signIn.userId) ?? users[signIn.userId];
  const existingUser = Store.loadUserByEmail(signIn.email);

  if (existingUser && existingUser.id !== signIn.userId) {
    const mergedUser = {
      ...existingUser,
      email: signIn.email,
      name: existingUser.name ?? guestUser?.name,
    };
    Store.saveUser(mergedUser);
    users[mergedUser.id] = mergedUser;

    const guestTableIds = Store.listPlayerTables(signIn.userId).map(
      (link) => link.tableId,
    );
    for (const tableId of guestTableIds) {
      await rewritePlayerIdInHandHistory(tableId, signIn.userId, mergedUser.id);
    }
    Store.migratePlayerData(signIn.userId, mergedUser.id);
    migrateGuestSessionToRegisteredUser(
      games,
      clientConnections,
      broadcast,
      signIn.userId,
      mergedUser,
    );

    delete users[signIn.userId];
    Store.deleteUser(signIn.userId);

    setSessionCookie(res, mergedUser.id);
    return signIn.returnPath;
  }

  const resolvedUser = guestUser
    ? {
        ...guestUser,
        email: signIn.email,
      }
    : {
        id: signIn.userId,
        name: undefined,
        email: signIn.email,
        settings: { ...DEFAULT_SETTINGS },
      };
  Store.saveUser(resolvedUser);
  users[resolvedUser.id] = resolvedUser;

  setSessionCookie(res, resolvedUser.id);
  return signIn.returnPath;
}

/**
 * @param {{
 *   sendSignInEmail?: typeof sendEmail,
 *   clientConnections?: Map<import('ws').WebSocket, { user: import('./user.js').User, gameId: Id|null, tournamentId: Id|null }>
 * }} [services]
 */
export function createSignInRoutes(services = {}) {
  const sendSignInEmail = services.sendSignInEmail || sendEmail;
  const clientConnections = services.clientConnections || new Map();

  return [
    {
      method: "POST",
      path: "/api/sign-in-links",
      handler: async ({ req, res, users, getOrCreateUser, parseBody, log }) => {
        const user = getOrCreateUser(req, res, users, log);
        const data = await parseBody(req);
        const email =
          data &&
          typeof data === "object" &&
          "email" in data &&
          typeof data.email === "string"
            ? normalizeEmail(data.email)
            : "";
        const returnPath =
          data && typeof data === "object" && "returnPath" in data
            ? normalizeReturnPath(data.returnPath)
            : "/";

        if (!email || !isValidEmail(email)) {
          throw new HttpError(400, "Valid email is required", {
            body: { error: "Valid email is required", status: 400 },
          });
        }

        const token = createEmailSignInToken();
        const { expiresAt, expiresInMinutes } = getEmailSignInExpiry();
        const appOrigin = getAppOrigin();

        saveEmailSignInToken({
          token,
          userId: user.id,
          email,
          expiresAt,
          returnPath,
        });

        const delivery = await sendSignInEmail({
          toEmail: email,
          appOrigin,
          signInUrl: buildEmailSignInUrl(appOrigin, token),
          expiresInMinutes,
        });
        setEmailDeliveryLogContext(log, delivery);

        res.writeHead(204);
        res.end();
      },
    },
    {
      method: "POST",
      path: "/api/sign-in-links/verify",
      handler: async ({ req, res, users, games, broadcast, parseBody }) => {
        const data = await parseBody(req);
        const token =
          data &&
          typeof data === "object" &&
          "token" in data &&
          typeof data.token === "string"
            ? data.token
            : "";

        const signIn = consumeEmailSignInToken(token);
        if (!signIn) {
          throw new HttpError(400, "Invalid or expired sign-in link", {
            body: { error: "Invalid or expired sign-in link", status: 400 },
          });
        }

        const returnPath = await completeSignIn(
          users,
          games,
          clientConnections,
          broadcast,
          res,
          signIn,
        );
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ returnPath }));
      },
    },
  ];
}
