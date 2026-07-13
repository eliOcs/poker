import { describe, it } from "node:test";
import assert from "node:assert";
import * as PokerGame from "../../src/backend/poker/game.js";
import * as Seat from "../../src/backend/poker/seat.js";
import { createMessageHandler } from "../../src/backend/ws-message-handler.js";

function createWs() {
  return {
    sent: [],
    send(payload) {
      this.sent.push(JSON.parse(payload));
    },
  };
}

function createHandlerContext({
  game = PokerGame.create(),
  handleManagedTableAction,
  actionRateLimiter,
} = {}) {
  const ws = createWs();
  const user = { id: "player-1", name: "Player 1" };
  const player = { id: user.id, name: user.name };
  const broadcasts = [];
  const rateLimitChecks = [];
  const handler = createMessageHandler({
    ws,
    user,
    game,
    gameId: game?.id,
    player,
    playerRateLimitKey: `player:${player.id}`,
    actionRateLimiter: actionRateLimiter ?? {
      check(key, options) {
        rateLimitChecks.push({ key, options });
        return { context: {} };
      },
    },
    broadcastGameMessage(message) {
      broadcasts.push(message);
      return { recipients: 1, maxPayloadBytes: 100 };
    },
    broadcastGameStateMessage: () => {},
    handleManagedTableAction,
  });

  return { broadcasts, game, handler, player, rateLimitChecks, user, ws };
}

describe("ws-message-handler", () => {
  it("responds to ping on tournament lobby connections", () => {
    const ws = createWs();
    const handler = createMessageHandler({
      ws,
      user: { id: "player-1", name: "Player 1" },
      game: null,
      gameId: null,
      player: { id: "player-1", name: "Player 1" },
      playerRateLimitKey: "player:player-1",
      actionRateLimiter: {
        check() {
          return { context: {} };
        },
      },
      broadcastGameMessage: () => ({ recipients: 0, maxPayloadBytes: 0 }),
      broadcastGameStateMessage: () => {},
    });

    handler(JSON.stringify({ action: "ping" }));

    assert.deepEqual(ws.sent, [{ type: "pong" }]);
  });

  it("keeps generic poker actions on their existing path", () => {
    const ctx = createHandlerContext();

    ctx.handler(JSON.stringify({ action: "sit", seat: 2 }));

    assert.equal(ctx.game.seats[2].empty, false);
    assert.deepEqual(ctx.broadcasts, [
      { type: "gameState", gameId: ctx.game.id },
    ]);
    assert.deepEqual(ctx.ws.sent, []);
  });

  it("keeps social actions on their existing path", () => {
    const ctx = createHandlerContext();
    ctx.game.seats[0] = Seat.occupied(ctx.player, 1_000);

    ctx.handler(JSON.stringify({ action: "chat", message: " Hello table " }));

    assert.deepEqual(ctx.broadcasts, [
      {
        type: "social",
        gameId: ctx.game.id,
        action: "chat",
        seat: 0,
        message: "Hello table",
      },
    ]);
    assert.deepEqual(ctx.ws.sent, []);
  });

  it("passes authenticated action context to a managed handler", () => {
    let received;
    const ctx = createHandlerContext({
      handleManagedTableAction(...args) {
        received = args;
        return true;
      },
    });

    ctx.handler(
      JSON.stringify({ action: "managedAction", confirmation: true }),
    );

    assert.deepEqual(received, [
      ctx.player,
      ctx.game,
      "managedAction",
      { confirmation: true },
    ]);
  });

  it("does not dispatch or broadcast a handled action again", () => {
    const managedBroadcasts = [];
    const ctx = createHandlerContext({
      handleManagedTableAction(_player, game) {
        managedBroadcasts.push(game.id);
        return true;
      },
    });

    ctx.handler(JSON.stringify({ action: "managedAction" }));

    assert.deepEqual(managedBroadcasts, [ctx.game.id]);
    assert.deepEqual(ctx.broadcasts, []);
    assert.deepEqual(ctx.ws.sent, []);
  });

  it("preserves generic errors when a managed handler does not handle an action", () => {
    const ctx = createHandlerContext({
      handleManagedTableAction: () => false,
    });

    ctx.handler(JSON.stringify({ action: "unknownAction" }));

    assert.equal(ctx.broadcasts.length, 0);
    assert.equal(ctx.ws.sent.length, 1);
    assert.match(ctx.ws.sent[0].error.message, /not a function/);
  });

  it("rate limits and canonically logs handled actions", (t) => {
    const calls = [];
    const consoleLog = t.mock.method(console, "log", () => {});
    const ctx = createHandlerContext({
      actionRateLimiter: {
        check(key, options) {
          calls.push({ type: "rateLimit", key, options });
          return { context: { remaining: 4 } };
        },
      },
      handleManagedTableAction(player, game, action, args) {
        calls.push({ type: "managed", player, game, action, args });
        return true;
      },
    });

    ctx.handler(JSON.stringify({ action: "managedAction", amount: 500 }));

    assert.deepEqual(
      calls.map((call) => call.type),
      ["rateLimit", "managed"],
    );
    assert.deepEqual(calls[0], {
      type: "rateLimit",
      key: "player:player-1",
      options: { source: "ws-action" },
    });
    assert.equal(consoleLog.mock.calls.length, 1);
    assert.match(consoleLog.mock.calls[0].arguments[0], /ws_action/);
  });
});
