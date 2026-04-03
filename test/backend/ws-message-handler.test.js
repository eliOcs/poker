import { describe, it } from "node:test";
import assert from "node:assert";
import { createMessageHandler } from "../../src/backend/ws-message-handler.js";

function createWs() {
  return {
    sent: [],
    send(payload) {
      this.sent.push(JSON.parse(payload));
    },
  };
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
});
