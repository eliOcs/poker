import { fixture, expect, html, waitUntil } from "@open-wc/testing";
import { createMockHandList, mockOhhHand, mockOhhHandView } from "./setup.js";
import "../../src/frontend/app.js";

describe("phg-app", () => {
  let element;
  let fetchCallCount;
  let originalFetch;

  beforeEach(() => {
    fetchCallCount = 0;
    originalFetch = globalThis.fetch;

    // Mock fetch to track calls and return mock data
    globalThis.fetch = async (url) => {
      fetchCallCount++;

      if (url.match(/\/api\/users\/me$/)) {
        return { ok: true, json: async () => ({ id: "user1", name: "Test" }) };
      }
      if (url.match(/\/api\/history\/[^/]+$/)) {
        return {
          ok: true,
          json: async () => ({
            hands: createMockHandList(),
            playerId: "player1",
          }),
        };
      }
      if (url.match(/\/api\/history\/[^/]+\/\d+$/)) {
        return {
          ok: true,
          json: async () => ({
            hand: mockOhhHand,
            view: mockOhhHandView,
          }),
        };
      }
      return { ok: false };
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("history data fetching", () => {
    it("shows empty state when no hands exist, then shows hands after playing", async () => {
      let handsToReturn = [];

      globalThis.fetch = async (url) => {
        fetchCallCount++;
        if (url.match(/\/api\/users\/me$/)) {
          return { ok: true, json: async () => ({ id: "user1", name: "Test" }) };
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

      element = await fixture(html`<phg-app></phg-app>`);
      await waitUntil(() => fetchCallCount >= 1, { timeout: 2000 });
      const afterUserFetch = fetchCallCount;

      // Enter history with no hands
      element.path = "/history/testgame123";
      await element.updateComplete;
      await waitUntil(() => fetchCallCount >= afterUserFetch + 1, {
        timeout: 2000,
      });

      // Should have fetched list (empty)
      expect(element.historyHandList).to.deep.equal([]);
      const afterEmptyFetch = fetchCallCount;

      // Navigate away
      element.path = "/games/testgame123";
      await element.updateComplete;

      // Simulate hands being played - update mock to return hands
      handsToReturn = createMockHandList();

      // Re-enter history
      element.path = "/history/testgame123";
      await element.updateComplete;
      await waitUntil(() => fetchCallCount >= afterEmptyFetch + 2, {
        timeout: 2000,
      });

      // Should now have hands
      expect(element.historyHandList.length).to.be.greaterThan(0);
    });

    it("refetches hand list when reopening history", async () => {
      element = await fixture(html`<phg-app></phg-app>`);

      // Wait for initial user fetch
      await waitUntil(() => fetchCallCount >= 1, { timeout: 2000 });
      const initialFetchCount = fetchCallCount;

      // Navigate to history (first time)
      element.path = "/history/testgame123";
      await element.updateComplete;

      // Wait for history data to be fetched (list + hand)
      await waitUntil(() => fetchCallCount >= initialFetchCount + 2, {
        timeout: 2000,
      });
      const afterFirstHistoryFetch = fetchCallCount;

      // Navigate away from history
      element.path = "/games/testgame123";
      await element.updateComplete;

      // Navigate back to history (should refetch)
      element.path = "/history/testgame123";
      await element.updateComplete;

      // Wait for history data to be fetched again
      await waitUntil(() => fetchCallCount >= afterFirstHistoryFetch + 2, {
        timeout: 2000,
      });

      // Verify that fetch was called again for the hand list
      // Initial: 1 (user), First history: 2 (list + hand), Second history: 2 (list + hand)
      expect(fetchCallCount).to.be.greaterThanOrEqual(initialFetchCount + 4);
    });

    it("refetches when re-entering history that was previously empty", async () => {
      element = await fixture(html`<phg-app></phg-app>`);

      // Wait for initial user fetch
      await waitUntil(() => fetchCallCount >= 1, { timeout: 2000 });

      // Simulate first visit with empty history
      element._historyGameId = "testgame123";
      element._historyHandNumber = null;
      element.historyHandList = [];
      element.historyLoading = false;

      // Navigate away
      element.path = "/games/testgame123";
      await element.updateComplete;

      const fetchCountBefore = fetchCallCount;

      // Navigate back to history (should refetch because handNumber is null)
      element.path = "/history/testgame123";
      await element.updateComplete;

      // Wait for refetch
      await waitUntil(() => fetchCallCount > fetchCountBefore, {
        timeout: 2000,
      });

      // Verify a new fetch was triggered
      expect(fetchCallCount).to.be.greaterThan(fetchCountBefore);
    });

    it("does not refetch list when navigating between hands", async () => {
      element = await fixture(html`<phg-app></phg-app>`);

      // Wait for initial user fetch
      await waitUntil(() => fetchCallCount >= 1, { timeout: 2000 });
      const initialFetchCount = fetchCallCount;

      // Navigate to history without hand number (triggers list fetch)
      element.path = "/history/testgame123";
      await element.updateComplete;

      // Wait for history data to be fetched (list + default hand)
      await waitUntil(() => fetchCallCount >= initialFetchCount + 2, {
        timeout: 2000,
      });
      const afterListFetch = fetchCallCount;

      // Navigate to specific hand via URL (simulates clicking a hand in the sidebar)
      element.path = "/history/testgame123/2";
      await element.updateComplete;

      // Wait for hand fetch
      await waitUntil(() => fetchCallCount >= afterListFetch + 1, {
        timeout: 2000,
      });

      // Should only fetch the specific hand, not the list again
      expect(fetchCallCount).to.equal(afterListFetch + 1);
    });
  });
});
