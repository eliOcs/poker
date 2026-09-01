import { expect } from "@open-wc/testing";
import { MockWebSocket } from "./fixtures/index.js";
import {
  connectToGame,
  resumeConnectionIfNeeded,
  sendToGame,
} from "../../src/frontend/app-websocket.js";

function createApp(path = "/cash/testgame") {
  return {
    path,
    toast: null,
    game: null,
    socialAction: null,
    gameConnectionStatus: "disconnected",
    gameActionPending: false,
    _pendingGameActionId: null,
    _pendingGameActionTimeoutId: undefined,
    _activeGameId: null,
    _activeGamePath: null,
    _socket: null,
    _socketHealthCheck: null,
    _mttView: null,
    _historyListRefreshNonce: 0,
    _intentionalSocketCloses: new WeakSet(),
    _setMttLobbyOverride(allowMttLobby) {
      this._allowMttLobby = allowMttLobby;
    },
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

      expect(first.sent).to.have.length(1);
      expect(first.sent[0]).to.include({ action: "ping" });
      expect(first.sent[0].pingId).to.be.a("string");
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
      first.simulateMessage({
        type: "pong",
        pingId: first.sent[0].pingId,
      });

      expect(MockWebSocket.instances).to.have.length(1);
      expect(app._socket).to.equal(first);
      expect(clearedTimeouts).to.deep.equal([456]);
    } finally {
      globalThis.setTimeout = originalSetTimeout;
      globalThis.clearTimeout = originalClearTimeout;
    }
  });

  it("does not treat an unrelated message as a health-check response", () => {
    const app = createApp();
    const originalSetTimeout = globalThis.setTimeout;
    const originalClearTimeout = globalThis.clearTimeout;
    const scheduledCallbacks = [];
    const clearedTimeouts = [];

    globalThis.setTimeout = (callback) => {
      scheduledCallbacks.push(callback);
      return scheduledCallbacks.length;
    };
    globalThis.clearTimeout = (timeoutId) => {
      clearedTimeouts.push(timeoutId);
    };

    try {
      connectToGame(app, app.path);
      const first = MockWebSocket.instances.at(-1);
      resumeConnectionIfNeeded(app);

      first.simulateMessage({ seats: [] });
      expect(clearedTimeouts).to.deep.equal([]);

      scheduledCallbacks[0]();
      expect(MockWebSocket.instances).to.have.length(2);
    } finally {
      globalThis.setTimeout = originalSetTimeout;
      globalThis.clearTimeout = originalClearTimeout;
    }
  });

  it("blocks another game action until the server acknowledges the first", () => {
    const app = createApp();
    connectToGame(app, app.path);
    const socket = MockWebSocket.instances.at(-1);

    sendToGame(app, { action: "call", seat: 0 });
    sendToGame(app, { action: "fold", seat: 0 });

    expect(socket.sent).to.have.length(1);
    expect(socket.sent[0]).to.include({ action: "call", seat: 0 });
    expect(socket.sent[0].actionId).to.be.a("string");
    expect(app.gameActionPending).to.equal(true);
    expect(app.toast).to.deep.equal({
      message: "Waiting for the previous game action",
      variant: "info",
    });

    socket.simulateMessage({
      type: "actionResult",
      actionId: socket.sent[0].actionId,
      accepted: true,
    });

    expect(app.gameActionPending).to.equal(false);
  });

  it("reconnects visibly when an action result does not match", () => {
    const app = createApp();
    connectToGame(app, app.path);
    const socket = MockWebSocket.instances.at(-1);

    sendToGame(app, { action: "call", seat: 0 });
    socket.simulateMessage({
      type: "actionResult",
      actionId: "unexpected-action",
      accepted: true,
    });

    expect(MockWebSocket.instances).to.have.length(2);
    expect(app._socket).to.equal(MockWebSocket.instances[1]);
    expect(app.toast).to.deep.equal({
      message: "Game connection was out of sync",
      variant: "error",
    });
  });

  it("reconnects visibly when an action acknowledgement times out", () => {
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

      sendToGame(app, { action: "call", seat: 0 });
      expect(scheduledCallbacks).to.have.length(1);

      scheduledCallbacks[0]();

      expect(MockWebSocket.instances).to.have.length(2);
      expect(app._socket).to.equal(MockWebSocket.instances[1]);
      expect(app.gameActionPending).to.equal(false);
      expect(app.toast).to.deep.equal({
        message: "Reconnecting to sync the game",
        variant: "error",
      });
      expect(first.readyState).to.equal(MockWebSocket.CLOSED);
    } finally {
      globalThis.setTimeout = originalSetTimeout;
      globalThis.clearTimeout = originalClearTimeout;
    }
  });

  it("redirects to the new tournament table when the backend sends a player move event", () => {
    const app = createApp("/mtt/mtt123/tables/table1");
    connectToGame(app, app.path);

    MockWebSocket.instances.at(-1).simulateMessage({
      type: "playerMoved",
      tournamentId: "mtt123",
      tableId: "table2",
      tableName: "Table 2",
    });

    expect(app.path).to.equal("/mtt/mtt123/tables/table2");
    expect(app.toast).to.deep.equal({
      message: "Moved to Table 2",
      variant: "info",
    });
  });
});
