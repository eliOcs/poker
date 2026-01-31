import { fixture, expect, html, waitUntil } from "@open-wc/testing";
import {
  OriginalFetch,
  createMockHandList,
  mockOhhHand,
  mockOhhHandView,
} from "./setup.js";
import "../../src/frontend/app.js";

/**
 * Creates a mock fetch function that returns predefined responses
 * @param {object} options
 * @param {Array} options.hands - Hand list to return from /api/history/:gameId
 * @param {Function} options.onFetch - Callback invoked with URL on each fetch
 * @param {boolean} options.debug - Log each fetch request to console
 */
function createMockFetch(options = {}) {
  const { hands = createMockHandList(), onFetch, debug = false } = options;
  return async (url) => {
    if (debug) console.log("[createMockFetch]", url);
    onFetch?.(url);
    if (url.match(/\/api\/users\/me$/)) {
      return { ok: true, json: async () => ({ id: "user1", name: "Test" }) };
    }
    if (url.match(/\/api\/history\/[^/]+$/)) {
      return {
        ok: true,
        json: async () => ({ hands, playerId: "player1" }),
      };
    }
    if (url.match(/\/api\/history\/[^/]+\/\d+$/)) {
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
        if (url.match(/\/api\/history\/[^/]+$/)) {
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
      element.path = "/history/testgame123";
      await element.updateComplete;

      // Wait for list task to complete
      await waitUntil(() => element.historyHandList !== null, {
        timeout: 2000,
      });

      // Should have fetched list (empty)
      expect(element.historyHandList).to.deep.equal([]);

      // Navigate away
      element.path = "/games/testgame123";
      await element.updateComplete;

      // Simulate hands being played
      handsToReturn = createMockHandList();

      // Re-enter history
      element.path = "/history/testgame123";
      await element.updateComplete;

      // Wait for refetch and redirect
      await waitUntil(
        () => fetchedUrls.some((u) => u.includes("/api/history/testgame123/3")),
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
      element.path = "/history/testgame123";

      // Wait for list + hand fetch
      await waitUntil(
        () => fetchedUrls.some((u) => u.includes("/api/history/testgame123/3")),
        { timeout: 2000 },
      );

      expect(fetchedUrls).to.include("/api/history/testgame123");
      expect(fetchedUrls).to.include("/api/history/testgame123/3");
      const afterFirstFetch = fetchedUrls.length;

      // Navigate away
      element.path = "/games/testgame123";
      await element.updateComplete;

      // Navigate back (should refetch)
      element.path = "/history/testgame123";

      // Wait for another list fetch
      await waitUntil(
        () =>
          fetchedUrls.filter((u) => u === "/api/history/testgame123").length >=
          2,
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
        if (url.match(/\/api\/history\/[^/]+$/)) {
          return {
            ok: true,
            json: async () => ({ hands: handsToReturn, playerId: "player1" }),
          };
        }
        if (url.match(/\/api\/history\/[^/]+\/\d+$/)) {
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
      element.path = "/history/testgame123";
      await element.updateComplete;

      // Wait for list task to complete
      await waitUntil(() => element.historyHandList !== null, {
        timeout: 2000,
      });

      // Should have empty list
      expect(element.historyHandList).to.deep.equal([]);

      // Navigate away
      element.path = "/games/testgame123";
      await element.updateComplete;

      // Simulate hands being played
      handsToReturn = createMockHandList();

      // Navigate back to history (should refetch)
      element.path = "/history/testgame123";
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
      element.path = "/history/testgame123";

      // Wait for list + hand fetch
      await waitUntil(
        () => fetchedUrls.some((u) => u.includes("/api/history/testgame123/3")),
        { timeout: 2000 },
      );

      // Navigate to different hand
      element.path = "/history/testgame123/2";
      await element.updateComplete;

      // Wait for hand 2 fetch
      await waitUntil(
        () => fetchedUrls.some((u) => u.includes("/api/history/testgame123/2")),
        { timeout: 2000 },
      );

      // Should have fetched hand 2 without refetching list
      const listFetches = fetchedUrls.filter(
        (u) => u === "/api/history/testgame123",
      ).length;
      expect(listFetches).to.equal(1);
    });
  });
});
