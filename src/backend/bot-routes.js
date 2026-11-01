import * as PokerGame from "./poker/game.js";
import * as Player from "./poker/player.js";
import * as HandHistory from "./poker/hand-history/index.js";
import { finalizePendingHandHistory } from "./poker/game-hand-lifecycle.js";
import { HttpError } from "./http-error.js";
import { getOrCreateUser, respondWithJson } from "./http-route-utils.js";
import { createBotTable, isBotTableLearner } from "./bot-table.js";

/**
 * @typedef {import('./http-route-utils.js').UserType} UserType
 * @typedef {import('./http-route-utils.js').Game} Game
 * @typedef {import('./id.js').Id} Id
 * @typedef {import('./poker/game.js').BroadcastHandler} BroadcastHandler
 */

/** @type {BroadcastHandler} */
const NO_BROADCAST = () => ({ recipients: 0, maxPayloadBytes: 0 });

/**
 * A learner keeps one bot table: opening a new one ends the previous one, and
 * leaving ends it. A hand is recorded only when the next one is about to
 * start, so a hand that just ended is recorded first.
 * @param {Map<Id, Game>} games
 * @param {Id} userId
 * @param {BroadcastHandler} broadcast
 */
function endBotTables(games, userId, broadcast) {
  for (const [gameId, game] of games) {
    if (game.kind !== "bots" || !isBotTableLearner(game, userId)) continue;
    PokerGame.stopGameTick(game);
    if (game.pendingHandHistory) {
      broadcast({
        type: "handEnded",
        gameId,
        ...finalizePendingHandHistory(game),
      });
    }
    games.delete(gameId);
    HandHistory.clearRecorder(gameId);
  }
}

/**
 * @param {Record<string, UserType>} users
 * @param {Map<Id, Game>} games
 * @param {{ isReady: () => boolean }} engine
 * @param {BroadcastHandler} [broadcast] - Receives the hands that ending a table records
 * @returns {import('./http-routes.js').Route[]}
 */
export function createBotRoutes(
  users,
  games,
  engine,
  broadcast = NO_BROADCAST,
) {
  return [
    {
      method: "POST",
      path: "/api/learn/bots",
      handler: ({ req, res, log }) => {
        const user = getOrCreateUser(req, res, users, log);
        if (!engine.isReady()) {
          throw new HttpError(503, "The bots are not available right now");
        }
        endBotTables(games, user.id, broadcast);
        const game = createBotTable(Player.fromUser(user));
        games.set(game.id, game);
        log.context.game = { type: "bots", id: game.id };
        respondWithJson(res, { id: game.id, type: "bots" });
      },
    },
    {
      method: "DELETE",
      path: "/api/learn/bots",
      handler: ({ req, res, log }) => {
        const user = getOrCreateUser(req, res, users, log);
        endBotTables(games, user.id, broadcast);
        respondWithJson(res, {});
      },
    },
  ];
}
