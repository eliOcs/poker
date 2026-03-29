import { createMockHandList, mockOhhHand, mockOhhHandView } from "./setup.js";

/**
 * Creates a mock fetch function that returns predefined responses
 * @param {object} options
 * @param {Array} [options.hands] - Hand list to return from /api/<kind>/:tableId/history
 * @param {(url: string) => void} [options.onFetch] - Callback invoked with URL on each fetch
 * @param {boolean} [options.debug] - Log each fetch request to console
 */
export function createMockFetch(options = {}) {
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

export function createMockTournamentView(overrides = {}) {
  const base = {
    id: "mtt123",
    status: "registration",
    ownerId: "u1",
    buyIn: 500,
    tableSize: 6,
    level: 1,
    timeToNextLevel: 300,
    onBreak: false,
    pendingBreak: false,
    createdAt: "2026-03-14T10:00:00.000Z",
    startedAt: null,
    endedAt: null,
    entrants: [],
    standings: [],
    tables: [],
    currentPlayer: {
      isOwner: true,
      status: "registered",
      tableId: null,
      seatIndex: null,
    },
    actions: {
      canRegister: false,
      canUnregister: true,
      canStart: false,
    },
  };

  return {
    ...base,
    ...overrides,
    currentPlayer: {
      ...base.currentPlayer,
      ...(overrides.currentPlayer || {}),
    },
    actions: {
      ...base.actions,
      ...(overrides.actions || {}),
    },
    tables: overrides.tables || base.tables,
    entrants: overrides.entrants || base.entrants,
    standings: overrides.standings || base.standings,
  };
}
