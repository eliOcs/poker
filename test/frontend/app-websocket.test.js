import { expect } from "@open-wc/testing";
import { MockWebSocket } from "./fixtures/index.js";
import {
  connectToGame,
  resumeConnectionIfNeeded,
} from "../../src/frontend/app-websocket.js";

function createApp(path = "/cash/testgame") {
  return {
    path,
    toast: null,
    game: null,
    socialAction: null,
    gameConnectionStatus: "disconnected",
    _activeGameId: null,
    _activeGamePath: null,
    _socket: null,
    _socketHealthCheck: null,
    _mttView: null,
    _historyListRefreshNonce: 0,
    _intentionalSocketCloses: new WeakSet(),
  };
}

describe("app-websocket", () => {
  const OriginalWebSocket = globalThis.WebSocket;

  beforeEach(() => {
    MockWebSocket.instances = [];
    globalThis.WebSocket = MockWebSocket;
  });

  afterEach(() => {
    globalThis.WebSocket = OriginalWebSocket;
  });

  it("reconnects when resume health check times out", () => {
    const app = createApp();
    const originalSetTimeout = globalThis.setTimeout;
    const originalClearTimeout = globalThis.clearTimeout;
    const scheduledCallbacks = [];

    globalThis.setTimeout = (callback) => {
      scheduledCallbacks.push(callback);
      return scheduledCallbacks.length;
    };
    globalThis.clearTimeout = () => {};

    try {
      connectToGame(app, app.path);

      const first = MockWebSocket.instances.at(-1);
      resumeConnectionIfNeeded(app);

      expect(first.sent).to.deep.equal([{ action: "ping" }]);
      expect(scheduledCallbacks).to.have.length(1);

      scheduledCallbacks[0]();

      expect(MockWebSocket.instances).to.have.length(2);
      expect(app._socket).to.equal(MockWebSocket.instances[1]);
      expect(MockWebSocket.instances[1].url).to.include("testgame");
    } finally {
      globalThis.setTimeout = originalSetTimeout;
      globalThis.clearTimeout = originalClearTimeout;
    }
  });

  it("keeps the socket when the resume health check receives a pong", () => {
    const app = createApp();
    const originalSetTimeout = globalThis.setTimeout;
    const originalClearTimeout = globalThis.clearTimeout;
    const clearedTimeouts = [];

    globalThis.setTimeout = () => 456;
    globalThis.clearTimeout = (timeoutId) => {
      clearedTimeouts.push(timeoutId);
    };

    try {
      connectToGame(app, app.path);

      const first = MockWebSocket.instances.at(-1);
      resumeConnectionIfNeeded(app);
      first.simulateMessage({ type: "pong" });

      expect(MockWebSocket.instances).to.have.length(1);
      expect(app._socket).to.equal(first);
      expect(clearedTimeouts).to.deep.equal([456]);
    } finally {
      globalThis.setTimeout = originalSetTimeout;
      globalThis.clearTimeout = originalClearTimeout;
    }
  });
});
