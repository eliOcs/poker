import { fixture, expect, html, waitUntil } from "@open-wc/testing";
import { OriginalFetch, MockWebSocket, createMockGameState } from "./setup.js";
import { createMockTournamentView } from "./app-test-helpers.js";
import "../../src/frontend/app.js";

describe("phg-app", () => {
  afterEach(() => {
    globalThis.fetch = OriginalFetch;
  });

  describe("SPA routes", () => {
    it("renders release notes on the app route", async () => {
      globalThis.fetch = async (url) => {
        if (url.match(/\/api\/users\/me$/)) {
          return { ok: true, json: async () => ({ id: "u1", name: "Test" }) };
        }
        return { ok: false };
      };

      const element = await fixture(html`<phg-app></phg-app>`);
      element.path = "/release-notes";
      await element.updateComplete;

      const releaseNotes =
        element.shadowRoot?.querySelector("phg-release-notes");
      expect(releaseNotes).to.exist;
    });

    it("renders the MTT lobby on tournament routes", async () => {
      MockWebSocket.instances = [];
      const fetchedUrls = [];
      globalThis.fetch = async (url) => {
        fetchedUrls.push(url);
        if (url === "/api/users/me") {
          return { ok: true, json: async () => ({ id: "u1", name: "Test" }) };
        }
        return { ok: false, json: async () => ({ error: "not found" }) };
      };

      const element = await fixture(html`<phg-app></phg-app>`);
      element.path = "/mtt/mtt123";
      await waitUntil(() => MockWebSocket.instances.length === 1, {
        timeout: 2000,
      });
      await waitUntil(() => element._mttTournamentId === "mtt123", {
        timeout: 2000,
      });
      const ws = MockWebSocket.instances.at(-1);
      ws.simulateMessage({
        type: "tournamentState",
        tournament: createMockTournamentView(),
      });
      await waitUntil(
        () => element.shadowRoot?.querySelector("phg-mtt-lobby"),
        { timeout: 2000 },
      );

      expect(element.shadowRoot?.querySelector("phg-mtt-lobby")).to.exist;
      expect(ws.url).to.include("/mtt/mtt123");
      expect(fetchedUrls).to.not.include("/api/mtt/mtt123");
    });
  });

  describe("MTT routing", () => {
    it("redirects from the lobby into the assigned table", async () => {
      MockWebSocket.instances = [];
      globalThis.fetch = async (url) => {
        if (url === "/api/users/me") {
          return { ok: true, json: async () => ({ id: "u1", name: "Test" }) };
        }
        return { ok: false, json: async () => ({ error: "not found" }) };
      };

      const element = await fixture(html`<phg-app></phg-app>`);
      element.path = "/mtt/mtt123";
      await waitUntil(() => MockWebSocket.instances.length === 1, {
        timeout: 2000,
      });
      await waitUntil(() => element._mttTournamentId === "mtt123", {
        timeout: 2000,
      });
      MockWebSocket.instances.at(-1).simulateMessage({
        type: "tournamentState",
        tournament: createMockTournamentView({
          status: "running",
          startedAt: "2026-03-14T10:05:00.000Z",
          tables: [
            {
              tableId: "table9",
              tableName: "Table 9",
              playerCount: 4,
              handNumber: 0,
              waiting: true,
              closed: false,
            },
          ],
          currentPlayer: {
            status: "seated",
            tableId: "table9",
            seatIndex: 2,
          },
          actions: {
            canUnregister: false,
            canStart: false,
          },
        }),
      });
      await waitUntil(() => element.path === "/mtt/mtt123/tables/table9", {
        timeout: 2000,
      });

      expect(element.path).to.equal("/mtt/mtt123/tables/table9");
    });

    it("keeps the user on the lobby after an explicit lobby navigation", async () => {
      globalThis.fetch = async (url) => {
        if (url === "/api/users/me") {
          return { ok: true, json: async () => ({ id: "u1", name: "Test" }) };
        }
        return { ok: false, json: async () => ({ error: "not found" }) };
      };

      const element = await fixture(html`<phg-app></phg-app>`);
      element.path = "/mtt/mtt123/tables/table1";
      await waitUntil(() => element._mttTournamentId === "mtt123", {
        timeout: 2000,
      });
      element._mttView = createMockTournamentView({
        status: "running",
        startedAt: "2026-03-14T10:05:00.000Z",
        tables: [
          {
            tableId: "table1",
            tableName: "Table 1",
            playerCount: 5,
            handNumber: 7,
            waiting: false,
            closed: false,
          },
        ],
        currentPlayer: {
          isOwner: false,
          status: "seated",
          tableId: "table1",
          seatIndex: 2,
        },
        actions: {
          canRegister: false,
          canUnregister: false,
          canStart: false,
        },
      });

      element.dispatchEvent(
        new CustomEvent("navigate", {
          detail: { path: "/mtt/mtt123", allowMttLobby: true },
          bubbles: true,
          composed: true,
        }),
      );
      await element.updateComplete;
      element._maybeRedirectMttRoute();

      expect(element.path).to.equal("/mtt/mtt123");
    });

    it("redirects to a new table when the player is reseated", async () => {
      globalThis.fetch = async (url) => {
        if (url === "/api/users/me") {
          return { ok: true, json: async () => ({ id: "u1", name: "Test" }) };
        }
        return { ok: false, json: async () => ({ error: "not found" }) };
      };

      const element = await fixture(html`<phg-app></phg-app>`);
      element.path = "/mtt/mtt123/tables/table1";
      await waitUntil(() => element._mttTournamentId === "mtt123", {
        timeout: 2000,
      });
      element._mttView = createMockTournamentView({
        status: "running",
        level: 2,
        timeToNextLevel: 200,
        startedAt: "2026-03-14T10:05:00.000Z",
        tables: [
          {
            tableId: "table2",
            tableName: "Table 2",
            playerCount: 5,
            handNumber: 8,
            waiting: true,
            closed: false,
          },
        ],
        currentPlayer: {
          isOwner: false,
          status: "seated",
          tableId: "table2",
          seatIndex: 1,
        },
        actions: {
          canRegister: false,
          canUnregister: false,
          canStart: false,
        },
      });
      element._maybeRedirectMttRoute();
      await waitUntil(() => element.path === "/mtt/mtt123/tables/table2", {
        timeout: 2000,
      });

      expect(element.path).to.equal("/mtt/mtt123/tables/table2");
      expect(element.toast?.message).to.equal("Moved to Table 2");
    });
  });

  describe("WebSocket reconnection", () => {
    let element;

    beforeEach(async () => {
      MockWebSocket.instances = [];
      history.replaceState({}, "", "/");
      globalThis.fetch = async (url) => {
        if (url.match(/\/api\/users\/me$/))
          return { ok: true, json: async () => ({ id: "u1", name: "Test" }) };
        return { ok: false };
      };
      element = await fixture(html`<phg-app></phg-app>`);
      element.path = "/cash/testgame";
      await element.updateComplete;
    });

    afterEach(async () => {
      element.path = "/";
      await element.updateComplete;
    });

    it("reconnects after an unexpected close", async () => {
      const first = MockWebSocket.instances.at(-1);
      first.simulateClose(1001);

      await waitUntil(() => MockWebSocket.instances.length >= 2, {
        timeout: 3000,
      });

      expect(MockWebSocket.instances.length).to.equal(2);
      expect(MockWebSocket.instances[1].url).to.include("testgame");
    });

    it("reconnects when page becomes visible with a closed socket", async () => {
      const first = MockWebSocket.instances.at(-1);
      first.simulateClose(1001);

      MockWebSocket.instances = [first];
      Object.defineProperty(document, "visibilityState", {
        value: "visible",
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));

      await waitUntil(() => MockWebSocket.instances.length >= 2, {
        timeout: 3000,
      });

      expect(MockWebSocket.instances.length).to.be.at.least(2);
      expect(MockWebSocket.instances.at(-1).url).to.include("testgame");
    });

    it("does not reconnect after navigating away", async () => {
      const ws = MockWebSocket.instances.at(-1);
      ws.simulateClose(1001);

      element.path = "/";
      await element.updateComplete;

      const countAfterNav = MockWebSocket.instances.length;
      await new Promise((r) => setTimeout(r, 1500));

      expect(MockWebSocket.instances.length).to.equal(countAfterNav);
    });

    it("ignores a stale lobby close after redirecting into an MTT table", async () => {
      MockWebSocket.instances = [];
      globalThis.fetch = async (url) => {
        if (url.match(/\/api\/users\/me$/)) {
          return { ok: true, json: async () => ({ id: "u1", name: "Test" }) };
        }
        return { ok: false };
      };

      const app = await fixture(html`<phg-app></phg-app>`);
      app.path = "/mtt/mtt123";
      await waitUntil(() => MockWebSocket.instances.length === 1, {
        timeout: 2000,
      });

      const lobbySocket = MockWebSocket.instances[0];
      lobbySocket.simulateMessage({
        type: "tournamentState",
        tournament: createMockTournamentView({
          status: "running",
          startedAt: "2026-03-14T10:05:00.000Z",
          tables: [
            {
              tableId: "table9",
              tableName: "Table 9",
              playerCount: 4,
              handNumber: 0,
              waiting: true,
              closed: false,
            },
          ],
          currentPlayer: {
            status: "seated",
            tableId: "table9",
            seatIndex: 2,
          },
          actions: {
            canUnregister: false,
            canStart: false,
          },
        }),
      });

      await waitUntil(() => app.path === "/mtt/mtt123/tables/table9", {
        timeout: 2000,
      });
      await waitUntil(() => MockWebSocket.instances.length === 2, {
        timeout: 2000,
      });

      lobbySocket.simulateClose(1000);
      await new Promise((resolve) => setTimeout(resolve, 1200));

      expect(MockWebSocket.instances.length).to.equal(2);
      expect(MockWebSocket.instances.at(-1).url).to.include(
        "/mtt/mtt123/tables/table9",
      );
    });
  });

  describe("WebSocket message routing", () => {
    it("does not overwrite game state with history events on game route", async () => {
      MockWebSocket.instances = [];
      globalThis.fetch = async (url) => {
        if (url.match(/\/api\/users\/me$/))
          return { ok: true, json: async () => ({ id: "u1", name: "Test" }) };
        return { ok: false };
      };

      const element = await fixture(html`<phg-app></phg-app>`);
      element.path = "/cash/testgame";
      await element.updateComplete;

      const ws = MockWebSocket.instances.at(-1);
      const initialGame = createMockGameState();
      ws.simulateMessage(initialGame);
      await element.updateComplete;

      expect(element.game).to.deep.equal(initialGame);

      ws.simulateMessage({
        type: "history",
        event: "handRecorded",
        handNumber: 1,
      });
      await element.updateComplete;

      expect(element.game).to.deep.equal(initialGame);
      expect(element.game?.type).to.equal(undefined);
    });
  });

  describe("frontend error reporting", () => {
    it("reports uncaught window errors with route and game context", async () => {
      /** @type {Array<{url: string, options: RequestInit|undefined}>} */
      const requests = [];
      globalThis.fetch = async (url, options) => {
        requests.push({ url, options });
        if (url === "/api/users/me") {
          return { ok: true, json: async () => ({ id: "u1", name: "Test" }) };
        }
        if (url === "/api/client-errors") {
          return { ok: true, json: async () => ({}) };
        }
        return { ok: false };
      };

      const element = await fixture(html`<phg-app></phg-app>`);
      history.pushState({}, "", "/cash/testgame");
      element.path = window.location.pathname;
      element._activeGameId = "testgame";
      element.gameConnectionStatus = "connected";

      element._handleWindowError({
        error: new Error("boom"),
        message: "boom",
        filename: "/src/frontend/index.js",
        lineno: 10,
        colno: 20,
      });
      await Promise.resolve();

      const report = requests.find(
        (request) => request.url === "/api/client-errors",
      );
      expect(report).to.exist;
      const payload = JSON.parse(String(report.options?.body));
      expect(payload.message).to.equal("boom");
      expect(payload.route).to.equal("/cash/testgame");
      expect(payload.gameId).to.equal("testgame");
      expect(payload.connectionStatus).to.equal("connected");
    });

    it("reports unhandled rejections", async () => {
      /** @type {Array<{url: string, options: RequestInit|undefined}>} */
      const requests = [];
      globalThis.fetch = async (url, options) => {
        requests.push({ url, options });
        if (url === "/api/users/me") {
          return { ok: true, json: async () => ({ id: "u1", name: "Test" }) };
        }
        if (url === "/api/client-errors") {
          return { ok: true, json: async () => ({}) };
        }
        return { ok: false };
      };

      const element = await fixture(html`<phg-app></phg-app>`);
      element._handleUnhandledRejection({
        reason: new Error("async boom"),
      });
      await Promise.resolve();

      const report = requests.find(
        (request) => request.url === "/api/client-errors",
      );
      expect(report).to.exist;
      const payload = JSON.parse(String(report.options?.body));
      expect(payload.type).to.equal("unhandledrejection");
      expect(payload.message).to.equal("async boom");
      expect(payload.source).to.equal("window.unhandledrejection");
    });
  });
});
