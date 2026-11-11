import { createLog, emitLog } from "./logger.js";
import * as Store from "./store.js";
import { getMttPath } from "../shared/routes.js";
import {
  buildEmailSignInUrl,
  createEmailSignInToken,
  getAppOrigin,
  getEmailSignInExpiry,
  saveUnrequestedEmailSignInToken,
} from "./sign-in.js";

/**
 * @typedef {import('./id.js').Id} Id
 * @typedef {import('./user.js').User} User
 * @typedef {typeof import('./email.js').sendTournamentStartEmail} SendTournamentStartEmail
 */

/**
 * @param {Record<string, User>} users
 * @param {Id[]} playerIds
 * @returns {{ id: Id, email: string }[]}
 */
function findEntrantEmails(users, playerIds) {
  return playerIds.map((id) => {
    const email = (users[id] ?? Store.loadUser(id))?.email;
    if (!email) throw new Error(`entrant ${id} has no email`);
    return { id, email };
  });
}

/**
 * @param {{ id: Id, email: string }[]} players
 * @param {PromiseSettledResult<unknown>[]} results
 */
function describeFailures(players, results) {
  return results.flatMap((result, index) =>
    result.status === "rejected"
      ? [
          {
            toEmail: players[index]?.email,
            message:
              result.reason instanceof Error
                ? result.reason.message
                : String(result.reason),
          },
        ]
      : [],
  );
}

/**
 * @param {import('./mtt.js').ManagedTournamentView} tournament
 * @param {Id} starterId
 * @param {Record<string, User>} users
 * @param {SendTournamentStartEmail} sendTournamentStartEmail
 * @returns {Promise<void>}
 */
export async function emailMttStart(
  tournament,
  starterId,
  users,
  sendTournamentStartEmail,
) {
  const log = createLog("tournament_start_emails");
  log.context.tournament = { id: tournament.id };
  const lobbyPath = getMttPath(tournament.id);
  try {
    const players = findEntrantEmails(
      users,
      tournament.entrants
        .map((entrant) => entrant.playerId)
        .filter((playerId) => playerId !== starterId),
    );
    const appOrigin = getAppOrigin();
    const { expiresAt, expiresInMinutes } = getEmailSignInExpiry();
    const results = await Promise.allSettled(
      players.map((player) => {
        const token = createEmailSignInToken();
        saveUnrequestedEmailSignInToken({
          token,
          userId: player.id,
          email: player.email,
          expiresAt,
          returnPath: lobbyPath,
        });
        return sendTournamentStartEmail({
          toEmail: player.email,
          appOrigin,
          tournamentName: tournament.name,
          signInUrl: buildEmailSignInUrl(appOrigin, token, {
            path: lobbyPath,
            email: player.email,
          }),
          expiresInMinutes,
        });
      }),
    );
    const failed = describeFailures(players, results);
    log.context.emails = { sent: results.length - failed.length, failed };
    if (failed.length > 0) log.level = "error";
  } catch (err) {
    log.level = "error";
    log.context.error = {
      message: err instanceof Error ? err.message : String(err),
    };
  } finally {
    emitLog(log);
  }
}
