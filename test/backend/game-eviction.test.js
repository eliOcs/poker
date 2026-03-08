import { describe, it } from "node:test";
import assert from "node:assert";
import { createInactiveGameEvictor } from "../../src/backend/game-eviction.js";

/**
 * @returns {Map<import('ws').WebSocket, { user: { id: string }, gameId: string }>}
 */
function createClientConnections() {
  return new Map();
}

/**
 * Creates mock createLog/emitLog pair that records emitted logs.
 * @param {Array<{message: string, context: Record<string, unknown>}>} [emitted]
 */
function mockLogFns(emitted = []) {
  return {
    createLog(message) {
      return { level: "info", message, timestamp: Date.now(), context: {} };
    },
    emitLog(log) {
      emitted.push({
        message: log.message,
        context: { ...log.context },
      });
    },
  };
}

describe("game-eviction", () => {
  it("evicts a game after one hour with no movement and no clients", () => {
    const evictInactiveGames = createInactiveGameEvictor(60 * 60 * 1000);
    const game = { handNumber: 3, tickTimer: null };
    const games = new Map([["g1", game]]);
    const clientConnections = createClientConnections();
    const emitted = [];

    assert.equal(
      evictInactiveGames({
        games,
        clientConnections,
        ...mockLogFns(emitted),
        now: 0,
      }),
      0,
    );
    assert.equal(games.size, 1);

    assert.equal(
      evictInactiveGames({
        games,
        clientConnections,
        ...mockLogFns(emitted),
        now: 3_599_999,
      }),
      0,
    );
    assert.equal(games.size, 1);

    assert.equal(
      evictInactiveGames({
        games,
        clientConnections,
        ...mockLogFns(emitted),
        now: 3_600_001,
      }),
      1,
    );
    assert.equal(games.size, 0);
    assert.equal(emitted.length, 3);
    assert.equal(emitted[2].message, "eviction_sweep");
    assert.equal(emitted[2].context.games.evictedCount, 1);
    assert.deepStrictEqual(emitted[2].context.games.evictedIds, ["g1"]);
  });

  it("resets inactivity timer when hand number changes", () => {
    const evictInactiveGames = createInactiveGameEvictor(60 * 60 * 1000);
    const game = { handNumber: 10, tickTimer: null };
    const games = new Map([["g1", game]]);
    const clientConnections = createClientConnections();

    evictInactiveGames({
      games,
      clientConnections,
      ...mockLogFns(),
      now: 0,
    });

    game.handNumber = 11;
    assert.equal(
      evictInactiveGames({
        games,
        clientConnections,
        ...mockLogFns(),
        now: 3_500_000,
      }),
      0,
    );

    assert.equal(
      evictInactiveGames({
        games,
        clientConnections,
        ...mockLogFns(),
        now: 7_000_000,
      }),
      0,
    );
    assert.equal(games.size, 1);

    assert.equal(
      evictInactiveGames({
        games,
        clientConnections,
        ...mockLogFns(),
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
        ...mockLogFns(),
        now: 0,
      }),
      0,
    );

    assert.equal(
      evictInactiveGames({
        games,
        clientConnections,
        ...mockLogFns(),
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
        ...mockLogFns(),
        now: 10 * 60 * 60 * 1000 + 1_000,
      }),
      0,
    );

    assert.equal(
      evictInactiveGames({
        games,
        clientConnections,
        ...mockLogFns(),
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
      ...mockLogFns(),
      now: 0,
    });

    assert.equal(
      evictInactiveGames({
        games,
        clientConnections,
        ...mockLogFns(),
        now: 3_600_001,
      }),
      1,
    );
    assert.equal(game.tickTimer, null);
  });
});
