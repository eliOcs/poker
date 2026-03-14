import { fixture, expect, html, waitUntil } from "@open-wc/testing";
import {
  OriginalFetch,
  MockWebSocket,
  createMockGameState,
  createMockHandList,
  mockOhhHand,
  mockOhhHandView,
} from "./setup.js";
import "../../src/frontend/app.js";

/**
 * Creates a mock fetch function that returns predefined responses
 * @param {object} options
 * @param {Array} options.hands - Hand list to return from /api/<kind>/:tableId/history
 * @param {(url: string) => void} [options.onFetch] - Callback invoked with URL on each fetch
 * @param {boolean} options.debug - Log each fetch request to console
 */
function createMockFetch(options = {}) {
  const { hands = createMockHandList(), onFetch, debug = false } = options;
  return async (url) => {
    if (debug) console.log("[createMockFetch]", url);
    if (onFetch) onFetch(url);
    if (url.match(/\/api\/users\/me$/)) {
      return { ok: true, json: async () => ({ id: "user1", name: "Test" }) };
    }
    if (url.match(/\/api\/(?:cash|sitngo)\/[^/]+\/history$/)) {
      return {
        ok: true,
        json: async () => ({ hands, playerId: "player1" }),
      };
    }
    if (url.match(/\/api\/(?:cash|sitngo)\/[^/]+\/history\/\d+$/)) {
      return {
        ok: true,
        json: async () => ({ hand: mockOhhHand, view: mockOhhHandView }),
      };
    }
    return { ok: false };
  };
}

describe("phg-app", () => {
  afterEach(() => {
    // Always restore original fetch after each test
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
  });

  describe("WebSocket reconnection", () => {
    let element;

    beforeEach(async () => {
      MockWebSocket.instances = [];
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
      // Navigate away so the re-render from cleanup doesn't trigger a reconnect
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

      // Simulate returning to the tab immediately (before the 1s timer)
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
      // Simulate an unexpected close that would normally schedule a reconnect
      const ws = MockWebSocket.instances.at(-1);
      ws.simulateClose(1001);

      // Navigate away before the 1s timer fires — this is an intentional disconnect
      element.path = "/";
      await element.updateComplete;

      const countAfterNav = MockWebSocket.instances.length;
      await new Promise((r) => setTimeout(r, 1500));

      // The reconnect timer fired but _activeGameId is null, so no new connection
      expect(MockWebSocket.instances.length).to.equal(countAfterNav);
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

  describe("history data fetching", () => {
    it("shows empty state when no hands exist, then shows hands after playing", async () => {
      let handsToReturn = [];
      const fetchedUrls = [];

      globalThis.fetch = createMockFetch({
        hands: handsToReturn,
        onFetch: (url) => fetchedUrls.push(url),
      });

      // Dynamically update the hands for subsequent fetches
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url) => {
        fetchedUrls.push(url);
        if (url.match(/\/api\/cash\/[^/]+\/history$/)) {
          return {
            ok: true,
            json: async () => ({ hands: handsToReturn, playerId: "player1" }),
          };
        }
        return originalFetch(url);
      };

      const element = await fixture(html`<phg-app></phg-app>`);
      await waitUntil(() => fetchedUrls.length >= 1, { timeout: 2000 });

      // Enter history with no hands
      element.path = "/cash/testgame123/history";
      await element.updateComplete;

      // Wait for list task to complete
      await waitUntil(() => element.historyHandList !== null, {
        timeout: 2000,
      });

      // Should have fetched list (empty)
      expect(element.historyHandList).to.deep.equal([]);

      // Navigate away
      element.path = "/cash/testgame123";
      await element.updateComplete;

      // Simulate hands being played
      handsToReturn = createMockHandList();

      // Re-enter history
      element.path = "/cash/testgame123/history";
      await element.updateComplete;

      // Wait for refetch and redirect
      await waitUntil(
        () =>
          fetchedUrls.some((u) =>
            u.includes("/api/cash/testgame123/history/3"),
          ),
        { timeout: 2000 },
      );

      // Should now have hands
      expect(element.historyHandList.length).to.be.greaterThan(0);
    });

    it("refetches hand list when reopening history", async () => {
      const fetchedUrls = [];
      globalThis.fetch = createMockFetch({
        onFetch: (url) => fetchedUrls.push(url),
      });

      const element = await fixture(html`<phg-app></phg-app>`);
      await waitUntil(() => fetchedUrls.length >= 1, { timeout: 2000 });

      // Navigate to history (first time)
      element.path = "/cash/testgame123/history";

      // Wait for list + hand fetch
      await waitUntil(
        () =>
          fetchedUrls.some((u) =>
            u.includes("/api/cash/testgame123/history/3"),
          ),
        { timeout: 2000 },
      );

      expect(fetchedUrls).to.include("/api/cash/testgame123/history");
      expect(fetchedUrls).to.include("/api/cash/testgame123/history/3");
      const afterFirstFetch = fetchedUrls.length;

      // Navigate away
      element.path = "/cash/testgame123";
      await element.updateComplete;

      // Navigate back (should refetch)
      element.path = "/cash/testgame123/history";

      // Wait for another list fetch
      await waitUntil(
        () =>
          fetchedUrls.filter((u) => u === "/api/cash/testgame123/history")
            .length >= 2,
        { timeout: 2000 },
      );

      expect(fetchedUrls.length).to.be.greaterThan(afterFirstFetch);
    });

    it("refetches when re-entering history that was previously empty", async () => {
      // Start with empty hands, then add hands for second visit
      let handsToReturn = [];
      const fetchedUrls = [];

      globalThis.fetch = async (url) => {
        fetchedUrls.push(url);
        if (url.match(/\/api\/users\/me$/)) {
          return {
            ok: true,
            json: async () => ({ id: "user1", name: "Test" }),
          };
        }
        if (url.match(/\/api\/cash\/[^/]+\/history$/)) {
          return {
            ok: true,
            json: async () => ({ hands: handsToReturn, playerId: "player1" }),
          };
        }
        if (url.match(/\/api\/cash\/[^/]+\/history\/\d+$/)) {
          return {
            ok: true,
            json: async () => ({ hand: mockOhhHand, view: mockOhhHandView }),
          };
        }
        return { ok: false };
      };

      const element = await fixture(html`<phg-app></phg-app>`);
      await waitUntil(() => fetchedUrls.length >= 1, { timeout: 2000 });

      // First visit - empty history
      element.path = "/cash/testgame123/history";
      await element.updateComplete;

      // Wait for list task to complete
      await waitUntil(() => element.historyHandList !== null, {
        timeout: 2000,
      });

      // Should have empty list
      expect(element.historyHandList).to.deep.equal([]);

      // Navigate away
      element.path = "/cash/testgame123";
      await element.updateComplete;

      // Simulate hands being played
      handsToReturn = createMockHandList();

      // Navigate back to history (should refetch)
      element.path = "/cash/testgame123/history";
      await element.updateComplete;

      // Wait for refetch and list to be populated
      await waitUntil(
        () =>
          element.historyHandList !== null &&
          element.historyHandList.length > 0,
        { timeout: 2000 },
      );

      // Should now have hands
      expect(element.historyHandList.length).to.be.greaterThan(0);
    });

    it("does not refetch list when navigating between hands", async () => {
      // Reset browser location to avoid inheriting from previous tests
      history.replaceState({}, "", "/");

      const fetchedUrls = [];
      globalThis.fetch = createMockFetch({
        onFetch: (url) => fetchedUrls.push(url),
      });

      const element = await fixture(html`<phg-app></phg-app>`);
      await waitUntil(() => fetchedUrls.length >= 1, { timeout: 2000 });

      // Navigate to history (will redirect to /3)
      element.path = "/cash/testgame123/history";

      // Wait for list + hand fetch
      await waitUntil(
        () =>
          fetchedUrls.some((u) =>
            u.includes("/api/cash/testgame123/history/3"),
          ),
        { timeout: 2000 },
      );

      // Navigate to different hand
      element.path = "/cash/testgame123/history/2";
      await element.updateComplete;

      // Wait for hand 2 fetch
      await waitUntil(
        () =>
          fetchedUrls.some((u) =>
            u.includes("/api/cash/testgame123/history/2"),
          ),
        { timeout: 2000 },
      );

      // Should have fetched hand 2 without refetching list
      const listFetches = fetchedUrls.filter(
        (u) => u === "/api/cash/testgame123/history",
      ).length;
      expect(listFetches).to.equal(1);
    });

    it("refetches history list on handRecorded websocket event without changing selected hand", async () => {
      history.replaceState({}, "", "/");

      let handsToReturn = createMockHandList();
      const fetchedUrls = [];

      globalThis.fetch = async (url) => {
        fetchedUrls.push(url);
        if (url.match(/\/api\/users\/me$/)) {
          return {
            ok: true,
            json: async () => ({ id: "user1", name: "Test" }),
          };
        }
        if (url.match(/\/api\/cash\/[^/]+\/history$/)) {
          return {
            ok: true,
            json: async () => ({ hands: handsToReturn, playerId: "player1" }),
          };
        }
        if (url.match(/\/api\/cash\/[^/]+\/history\/\d+$/)) {
          return {
            ok: true,
            json: async () => ({ hand: mockOhhHand, view: mockOhhHandView }),
          };
        }
        return { ok: false };
      };

      const element = await fixture(html`<phg-app></phg-app>`);
      await waitUntil(() => fetchedUrls.length >= 1, { timeout: 2000 });

      element.path = "/cash/testgame123/history/2";
      await element.updateComplete;

      await waitUntil(
        () =>
          fetchedUrls.some((u) =>
            u.includes("/api/cash/testgame123/history/2"),
          ),
        { timeout: 2000 },
      );

      const initialListFetches = fetchedUrls.filter(
        (u) => u === "/api/cash/testgame123/history",
      ).length;

      handsToReturn = [
        ...handsToReturn,
        {
          ...handsToReturn[handsToReturn.length - 1],
          game_number: "testgame123-4",
          hand_number: 4,
        },
      ];

      const ws = MockWebSocket.instances.at(-1);
      ws.simulateMessage({
        type: "history",
        event: "handRecorded",
        handNumber: 4,
      });

      await waitUntil(
        () =>
          fetchedUrls.filter((u) => u === "/api/cash/testgame123/history")
            .length > initialListFetches,
        { timeout: 2000 },
      );

      expect(element.path).to.equal("/cash/testgame123/history/2");
      expect(element.historyHandList.map((h) => h.hand_number)).to.include(4);
    });
  });
});
