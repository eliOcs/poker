import * as PokerGame from "./poker/game.js";
import * as Player from "./poker/player.js";
import * as HandHistory from "./poker/hand-history/index.js";
import { HttpError } from "./http-error.js";
import { getOrCreateUser, respondWithJson } from "./http-route-utils.js";
import { createBotTable, isBotTableLearner } from "./bot-table.js";

/**
 * @typedef {import('./http-route-utils.js').UserType} UserType
 * @typedef {import('./http-route-utils.js').Game} Game
 * @typedef {import('./id.js').Id} Id
 */

/**
 * A learner keeps one bot table: opening a new one ends the previous one.
 * @param {Map<Id, Game>} games
 * @param {Id} userId
 */
function endBotTables(games, userId) {
  for (const [gameId, game] of games) {
    if (game.kind !== "bots" || !isBotTableLearner(game, userId)) continue;
    PokerGame.stopGameTick(game);
    games.delete(gameId);
    HandHistory.clearRecorder(gameId);
  }
}

/**
 * @param {Record<string, UserType>} users
 * @param {Map<Id, Game>} games
 * @param {{ isReady: () => boolean }} engine
 * @returns {import('./http-routes.js').Route[]}
 */
export function createBotRoutes(users, games, engine) {
  return [
    {
      method: "POST",
      path: "/api/learn/bots",
      handler: ({ req, res, log }) => {
        const user = getOrCreateUser(req, res, users, log);
        if (!engine.isReady()) {
          throw new HttpError(503, "The bots are not available right now");
        }
        endBotTables(games, user.id);
        const game = createBotTable(Player.fromUser(user));
        games.set(game.id, game);
        log.context.game = { type: "bots", id: game.id };
        respondWithJson(res, { id: game.id, type: "bots" });
      },
    },
  ];
}
