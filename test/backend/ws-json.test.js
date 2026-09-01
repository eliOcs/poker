import { describe, it } from "node:test";
import assert from "node:assert";
import {
  MAX_WEBSOCKET_BUFFERED_BYTES,
  sendWebSocketJson,
} from "../../src/backend/ws-json.js";

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
  it("sends formatted JSON and returns payload bytes", () => {
    const ws = createWs();
    const message = { type: "pong" };

    const result = sendWebSocketJson(
      /** @type {import("ws").WebSocket} */ (ws),
      message,
    );

    const payload = JSON.stringify(message, null, 2);
    assert.deepEqual(ws.sent, [payload]);
    assert.deepEqual(result, {
      sent: true,
      payloadBytes: Buffer.byteLength(payload),
    });
    assert.equal(ws.terminated, false);
  });

  it("terminates a connection before its send queue exceeds the limit", () => {
    const ws = createWs();
    ws.bufferedAmount = MAX_WEBSOCKET_BUFFERED_BYTES - 1;

    const result = sendWebSocketJson(
      /** @type {import("ws").WebSocket} */ (ws),
      { type: "gameState" },
    );

    assert.deepEqual(ws.sent, []);
    assert.equal(ws.terminated, true);
    assert.equal(result.sent, false);
  });
});
