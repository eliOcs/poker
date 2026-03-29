import { fixture, expect, html, waitUntil } from "@open-wc/testing";
import {
  OriginalFetch,
  MockWebSocket,
  createMockHandList,
  mockOhhHand,
  mockOhhHandView,
} from "./setup.js";
import { createMockFetch } from "./app-test-helpers.js";
import "../../src/frontend/app.js";

describe("phg-app history data fetching", () => {
  afterEach(() => {
    globalThis.fetch = OriginalFetch;
  });

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

    element.path = "/cash/testgame123/history";
    await element.updateComplete;

    await waitUntil(() => element.historyHandList !== null, {
      timeout: 2000,
    });

    expect(element.historyHandList).to.deep.equal([]);

    element.path = "/cash/testgame123";
    await element.updateComplete;

    handsToReturn = createMockHandList();

    element.path = "/cash/testgame123/history";
    await element.updateComplete;

    await waitUntil(
      () =>
        fetchedUrls.some((u) => u.includes("/api/cash/testgame123/history/3")),
      { timeout: 2000 },
    );

    expect(element.historyHandList.length).to.be.greaterThan(0);
  });

  it("refetches hand list when reopening history", async () => {
    const fetchedUrls = [];
    globalThis.fetch = createMockFetch({
      onFetch: (url) => fetchedUrls.push(url),
    });

    const element = await fixture(html`<phg-app></phg-app>`);
    await waitUntil(() => fetchedUrls.length >= 1, { timeout: 2000 });

    element.path = "/cash/testgame123/history";

    await waitUntil(
      () =>
        fetchedUrls.some((u) => u.includes("/api/cash/testgame123/history/3")),
      { timeout: 2000 },
    );

    expect(fetchedUrls).to.include("/api/cash/testgame123/history");
    expect(fetchedUrls).to.include("/api/cash/testgame123/history/3");
    const afterFirstFetch = fetchedUrls.length;

    element.path = "/cash/testgame123";
    await element.updateComplete;

    element.path = "/cash/testgame123/history";

    await waitUntil(
      () =>
        fetchedUrls.filter((u) => u === "/api/cash/testgame123/history")
          .length >= 2,
      { timeout: 2000 },
    );

    expect(fetchedUrls.length).to.be.greaterThan(afterFirstFetch);
  });

  it("refetches when re-entering history that was previously empty", async () => {
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

    element.path = "/cash/testgame123/history";
    await element.updateComplete;

    await waitUntil(() => element.historyHandList !== null, {
      timeout: 2000,
    });

    expect(element.historyHandList).to.deep.equal([]);

    element.path = "/cash/testgame123";
    await element.updateComplete;

    handsToReturn = createMockHandList();

    element.path = "/cash/testgame123/history";
    await element.updateComplete;

    await waitUntil(
      () =>
        element.historyHandList !== null && element.historyHandList.length > 0,
      { timeout: 2000 },
    );

    expect(element.historyHandList.length).to.be.greaterThan(0);
  });

  it("does not refetch list when navigating between hands", async () => {
    history.replaceState({}, "", "/");

    const fetchedUrls = [];
    globalThis.fetch = createMockFetch({
      onFetch: (url) => fetchedUrls.push(url),
    });

    const element = await fixture(html`<phg-app></phg-app>`);
    await waitUntil(() => fetchedUrls.length >= 1, { timeout: 2000 });

    element.path = "/cash/testgame123/history";

    await waitUntil(
      () =>
        fetchedUrls.some((u) => u.includes("/api/cash/testgame123/history/3")),
      { timeout: 2000 },
    );

    element.path = "/cash/testgame123/history/2";
    await element.updateComplete;

    await waitUntil(
      () =>
        fetchedUrls.some((u) => u.includes("/api/cash/testgame123/history/2")),
      { timeout: 2000 },
    );

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
        fetchedUrls.some((u) => u.includes("/api/cash/testgame123/history/2")),
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
