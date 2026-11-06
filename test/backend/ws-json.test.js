import { describe, it } from "node:test";
import assert from "node:assert";
import {
  MAX_WEBSOCKET_BUFFERED_BYTES,
  sendWebSocketJson,
} from "../../src/backend/ws-json.js";

const conn = {
  user: { id: "player-1", name: "Player 1" },
  gameId: "table-1",
  tournamentId: "tournament-1",
};

function createWs() {
  return {
    bufferedAmount: 0,
    sent: [],
    terminated: false,
    send(payload) {
      this.sent.push(payload);
    },
    terminate() {
      this.terminated = true;
    },
  };
}

describe("ws-json", () => {
  it("sends compact JSON and returns payload bytes", () => {
    const ws = createWs();
    const message = { type: "pong", pingId: "ping-1" };

    const result = sendWebSocketJson(
      /** @type {import("ws").WebSocket} */ (ws),
      conn,
      message,
    );

    const payload = '{"type":"pong","pingId":"ping-1"}';
    assert.deepEqual(ws.sent, [payload]);
    assert.deepEqual(result, {
      sent: true,
      payloadBytes: Buffer.byteLength(payload),
    });
    assert.equal(ws.terminated, false);
  });

  it("terminates a connection before its send queue exceeds the limit", (t) => {
    const warn = t.mock.method(console, "warn", () => {});
    const ws = createWs();
    ws.bufferedAmount = MAX_WEBSOCKET_BUFFERED_BYTES - 1;

    const result = sendWebSocketJson(
      /** @type {import("ws").WebSocket} */ (ws),
      conn,
      { type: "gameState" },
    );

    assert.deepEqual(ws.sent, []);
    assert.equal(ws.terminated, true);
    assert.equal(result.sent, false);
    assert.equal(warn.mock.callCount(), 1);
    const output = String(warn.mock.calls[0]?.arguments[0]);
    assert.match(output, /ws send buffer exceeded/);
    assert.match(output, /"tableId":"table-1"/);
    assert.match(output, /"tournamentId":"tournament-1"/);
    assert.match(output, /"playerId":"player-1"/);
  });
});
