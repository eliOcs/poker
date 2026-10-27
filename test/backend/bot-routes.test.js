import { describe, it } from "node:test";
import assert from "node:assert";
import * as PokerGame from "../../src/backend/poker/game.js";
import { createBotRoutes } from "../../src/backend/bot-routes.js";
import { findActiveGamePath } from "../../src/backend/game-routes.js";
import { HttpError } from "../../src/backend/http-error.js";

const USER = { id: "learner1", name: "Alex", settings: {} };
const OTHER = { id: "learner2", name: "Sam", settings: {} };
const USERS = { [USER.id]: USER, [OTHER.id]: OTHER };

/**
 * Calls the bot table route as a user, the way the browser does.
 * @param {"POST"|"DELETE"} method
 * @param {Map<string, any>} games
 * @param {{ isReady: () => boolean }} engine
 * @param {{ id: string }} [user]
 */
function callBotRoute(method, games, engine, user = USER) {
  const route = createBotRoutes(USERS, games, engine).find(
    (candidate) => candidate.method === method,
  );
  /** @type {{ status?: number, body?: any }} */
  const response = {};
  const res = {
    setHeader() {},
    writeHead(status) {
      response.status = status;
    },
    end(body) {
      response.body = JSON.parse(body);
    },
  };
  route.handler({
    req: { headers: { cookie: `phg=${user.id}` } },
    res,
    log: { context: {} },
  });
  return response;
}

/**
 * @param {Map<string, any>} games
 * @param {{ isReady: () => boolean }} engine
 * @param {{ id: string }} [user]
 */
function openBotTable(games, engine, user) {
  return callBotRoute("POST", games, engine, user);
}

describe("bot routes", () => {
  it("opens a private table for the learner", () => {
    const games = new Map();

    const response = openBotTable(games, { isReady: () => true });

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.type, "bots");
    const game = games.get(response.body.id);
    assert.strictEqual(game.kind, "bots");
    assert.deepStrictEqual(game.seats[0].player, { id: USER.id, name: "Alex" });
    PokerGame.stopGameTick(game);
  });

  it("keeps one table per learner", () => {
    const games = new Map();
    const engine = { isReady: () => true };

    const first = openBotTable(games, engine).body.id;
    const second = openBotTable(games, engine).body.id;

    assert.deepStrictEqual([...games.keys()], [second]);
    assert.notStrictEqual(first, second);
  });

  it("ends the learner's table when they leave, and nobody else's", () => {
    const games = new Map();
    const engine = { isReady: () => true };
    openBotTable(games, engine);
    const other = openBotTable(games, engine, OTHER).body.id;

    const response = callBotRoute("DELETE", games, engine);

    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual([...games.keys()], [other]);
    PokerGame.stopGameTick(games.get(other));
  });

  it("refuses while the engine is not ready", () => {
    const games = new Map();

    assert.throws(
      () => openBotTable(games, { isReady: () => false }),
      (err) => err instanceof HttpError && err.status === 503,
    );
    assert.strictEqual(games.size, 0);
  });

  it("never sends the learner back to a bot table", () => {
    const games = new Map();
    openBotTable(games, { isReady: () => true });

    assert.strictEqual(findActiveGamePath(games, USER.id), undefined);
  });
});
