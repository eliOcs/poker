import { describe, it } from "node:test";
import assert from "node:assert";
import * as PokerGame from "../../src/backend/poker/game.js";
import { createBotRoutes } from "../../src/backend/bot-routes.js";
import { findActiveGamePath } from "../../src/backend/game-routes.js";
import { HttpError } from "../../src/backend/http-error.js";

const USER = { id: "learner1", name: "Alex", settings: {} };

/**
 * Opens a bot table as the user, the way the browser does.
 * @param {Map<string, any>} games
 * @param {{ isReady: () => boolean }} engine
 */
function openBotTable(games, engine) {
  const [route] = createBotRoutes({ [USER.id]: USER }, games, engine);
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
    req: { headers: { cookie: `phg=${USER.id}` } },
    res,
    log: { context: {} },
  });
  return response;
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
