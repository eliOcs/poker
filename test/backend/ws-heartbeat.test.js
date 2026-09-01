import { EventEmitter } from "node:events";
import { describe, it } from "node:test";
import assert from "node:assert";
import {
  startWebSocketHeartbeat,
  WEBSOCKET_HEARTBEAT_INTERVAL_MS,
} from "../../src/backend/ws-heartbeat.js";

function createSocket() {
  const socket = new EventEmitter();
  socket.pingCount = 0;
  socket.terminateCount = 0;
  socket.ping = () => {
    socket.pingCount += 1;
  };
  socket.terminate = () => {
    socket.terminateCount += 1;
  };
  return socket;
}

function createHeartbeat() {
  const wss = new EventEmitter();
  wss.clients = new Set();
  let heartbeat;
  let intervalDelay;
  let clearedTimer;
  const timer = {
    unrefCalled: false,
    unref() {
      this.unrefCalled = true;
    },
  };
  const timedOutSockets = [];

  startWebSocketHeartbeat(wss, {
    setIntervalFn(callback, delay) {
      heartbeat = callback;
      intervalDelay = delay;
      return timer;
    },
    clearIntervalFn(value) {
      clearedTimer = value;
    },
    onTimeout(socket) {
      timedOutSockets.push(socket);
    },
  });

  return {
    wss,
    timer,
    timedOutSockets,
    runHeartbeat: () => heartbeat(),
    getIntervalDelay: () => intervalDelay,
    getClearedTimer: () => clearedTimer,
  };
}

describe("ws-heartbeat", () => {
  it("pings a new connection and terminates it after a missed heartbeat", () => {
    const context = createHeartbeat();
    const socket = createSocket();
    context.wss.clients.add(socket);
    context.wss.emit("connection", socket);

    context.runHeartbeat();
    assert.equal(socket.pingCount, 1);
    assert.equal(socket.terminateCount, 0);

    context.runHeartbeat();
    assert.equal(socket.pingCount, 1);
    assert.equal(socket.terminateCount, 1);
    assert.deepEqual(context.timedOutSockets, [socket]);
  });

  it("keeps connections that answer with pong", () => {
    const context = createHeartbeat();
    const socket = createSocket();
    context.wss.clients.add(socket);
    context.wss.emit("connection", socket);

    context.runHeartbeat();
    socket.emit("pong");
    context.runHeartbeat();

    assert.equal(socket.pingCount, 2);
    assert.equal(socket.terminateCount, 0);
  });

  it("uses an unrefed interval and clears it when the server closes", () => {
    const context = createHeartbeat();

    assert.equal(context.getIntervalDelay(), WEBSOCKET_HEARTBEAT_INTERVAL_MS);
    assert.equal(context.timer.unrefCalled, true);

    context.wss.emit("close");
    assert.equal(context.getClearedTimer(), context.timer);
  });
});
