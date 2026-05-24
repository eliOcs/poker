import { describe, it } from "node:test";
import assert from "node:assert";
import { sendWebSocketJson } from "../../src/backend/ws-json.js";

function createWs() {
  return {
    sent: [],
    send(payload) {
      this.sent.push(payload);
    },
  };
}

describe("ws-json", () => {
  it("sends formatted JSON and returns payload bytes", () => {
    const ws = createWs();
    const message = { type: "pong" };

    const payloadBytes = sendWebSocketJson(
      /** @type {import("ws").WebSocket} */ (ws),
      message,
    );

    const payload = JSON.stringify(message, null, 2);
    assert.deepEqual(ws.sent, [payload]);
    assert.equal(payloadBytes, Buffer.byteLength(payload));
  });
});
