import * as HandHistory from "./poker/hand-history/index.js";
import { HttpError } from "./http-error.js";
import { getOrCreateUser } from "./http-route-utils.js";

/**
 * @typedef {import('./http-route-utils.js').UserType} UserType
 * @typedef {import('./id.js').Id} Id
 */

/**
 * Creates hand history API routes
 * @param {Record<string, UserType>} users
 * @returns {import('./http-routes.js').Route[]}
 */
export function createHistoryRoutes(users) {
  return [
    {
      method: "GET",
      path: /^\/api\/(?:cash|sitngo)\/([a-z0-9]+)\/history$/,
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
      path: /^\/api\/(?:cash|sitngo)\/([a-z0-9]+)\/history\/(\d+)$/,
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
      path: /^\/api\/mtt\/([a-z0-9]+)\/tables\/([a-z0-9]+)\/history$/,
      handler: async ({ req, res, match, log }) => {
        const m = /** @type {RegExpMatchArray} */ (match);
        const tableId = /** @type {string} */ (m[2]);
        const user = getOrCreateUser(req, res, users, log);

        const hands = await HandHistory.getAllHands(tableId);
        const summaries = hands.map((hand) =>
          HandHistory.getHandSummary(hand, user.id),
        );
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ hands: summaries, playerId: user.id }));
      },
    },
    {
      method: "GET",
      path: /^\/api\/mtt\/([a-z0-9]+)\/tables\/([a-z0-9]+)\/history\/(\d+)$/,
      handler: async ({ req, res, match, log }) => {
        const m = /** @type {RegExpMatchArray} */ (match);
        const tableId = /** @type {string} */ (m[2]);
        const handNumber = parseInt(/** @type {string} */ (m[3]), 10);
        const user = getOrCreateUser(req, res, users, log);

        const hand = await HandHistory.getHand(tableId, handNumber);
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
  ];
}
