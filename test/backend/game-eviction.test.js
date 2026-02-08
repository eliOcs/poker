import { describe, it } from "node:test";
import assert from "node:assert";
import { createInactiveGameEvictor } from "../../src/backend/game-eviction.js";

/**
 * @returns {Map<import('ws').WebSocket, { user: { id: string }, gameId: string }>}
 */
function createClientConnections() {
  return new Map();
}

describe("game-eviction", () => {
  it("evicts a game after one hour with no movement and no clients", () => {
    const evictInactiveGames = createInactiveGameEvictor(60 * 60 * 1000);
    const game = { handNumber: 3, tickTimer: null };
    const games = new Map([["g1", game]]);
    const clientConnections = createClientConnections();
    const logs = [];

    assert.equal(
      evictInactiveGames({
        games,
        clientConnections,
        logInfo: (message, context) => logs.push({ message, context }),
        now: 0,
      }),
      0,
    );
    assert.equal(games.size, 1);

    assert.equal(
      evictInactiveGames({
        games,
        clientConnections,
        logInfo: (message, context) => logs.push({ message, context }),
        now: 3_599_999,
      }),
      0,
    );
    assert.equal(games.size, 1);

    assert.equal(
      evictInactiveGames({
        games,
        clientConnections,
        logInfo: (message, context) => logs.push({ message, context }),
        now: 3_600_001,
      }),
      1,
    );
    assert.equal(games.size, 0);
    assert.equal(logs.length, 1);
    assert.equal(logs[0].message, "inactive game evicted");
  });

  it("resets inactivity timer when hand number changes", () => {
    const evictInactiveGames = createInactiveGameEvictor(60 * 60 * 1000);
    const game = { handNumber: 10, tickTimer: null };
    const games = new Map([["g1", game]]);
    const clientConnections = createClientConnections();

    evictInactiveGames({
      games,
      clientConnections,
      logInfo: () => {},
      now: 0,
    });

    game.handNumber = 11;
    assert.equal(
      evictInactiveGames({
        games,
        clientConnections,
        logInfo: () => {},
        now: 3_500_000,
      }),
      0,
    );

    assert.equal(
      evictInactiveGames({
        games,
        clientConnections,
        logInfo: () => {},
        now: 7_000_000,
      }),
      0,
    );
    assert.equal(games.size, 1);

    assert.equal(
      evictInactiveGames({
        games,
        clientConnections,
        logInfo: () => {},
        now: 7_100_001,
      }),
      1,
    );
    assert.equal(games.size, 0);
  });

  it("does not evict connected games and starts timer after disconnect", () => {
    const evictInactiveGames = createInactiveGameEvictor(60 * 60 * 1000);
    const game = { handNumber: 1, tickTimer: null };
    const games = new Map([["g1", game]]);
    const ws = /** @type {import('ws').WebSocket} */ ({});
    const clientConnections = createClientConnections();
    clientConnections.set(ws, { user: { id: "u1" }, gameId: "g1" });

    assert.equal(
      evictInactiveGames({
        games,
        clientConnections,
        logInfo: () => {},
        now: 0,
      }),
      0,
    );

    assert.equal(
      evictInactiveGames({
        games,
        clientConnections,
        logInfo: () => {},
        now: 10 * 60 * 60 * 1000,
      }),
      0,
    );
    assert.equal(games.size, 1);

    clientConnections.delete(ws);

    assert.equal(
      evictInactiveGames({
        games,
        clientConnections,
        logInfo: () => {},
        now: 10 * 60 * 60 * 1000 + 1_000,
      }),
      0,
    );

    assert.equal(
      evictInactiveGames({
        games,
        clientConnections,
        logInfo: () => {},
        now: 10 * 60 * 60 * 1000 + 3_600_001,
      }),
      1,
    );
    assert.equal(games.size, 0);
  });

  it("clears running tick timer before evicting", () => {
    const evictInactiveGames = createInactiveGameEvictor(60 * 60 * 1000);
    const game = { handNumber: 2, tickTimer: setInterval(() => {}, 1000) };
    const games = new Map([["g1", game]]);
    const clientConnections = createClientConnections();

    evictInactiveGames({
      games,
      clientConnections,
      logInfo: () => {},
      now: 0,
    });

    assert.equal(
      evictInactiveGames({
        games,
        clientConnections,
        logInfo: () => {},
        now: 3_600_001,
      }),
      1,
    );
    assert.equal(game.tickTimer, null);
  });
});
