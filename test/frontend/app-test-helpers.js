import { createMockHandList, mockOhhHand, mockOhhHandView } from "./setup.js";

export function createMockUser(overrides = {}) {
  const { settings: overrideSettings = {}, ...restOverrides } = overrides;
  const settings = {
    volume: 0.75,
    vibration: true,
    ...overrideSettings,
  };

  return {
    id: "user1",
    name: "Test",
    email: undefined,
    activeGamePath: null,
    ...restOverrides,
    settings,
  };
}

/**
 * Creates a mock fetch function that returns predefined responses
 * @param {object} options
 * @param {Array} [options.hands] - Hand list to return from /api/history/:tableId
 * @param {(url: string) => void} [options.onFetch] - Callback invoked with URL on each fetch
 * @param {boolean} [options.debug] - Log each fetch request to console
 */
export function createMockFetch(options = {}) {
  const { hands = createMockHandList(), onFetch, debug = false } = options;
  return async (url) => {
    if (debug) console.log("[createMockFetch]", url);
    if (onFetch) onFetch(url);
    if (url.match(/\/api\/users\/me$/)) {
      return { ok: true, json: async () => createMockUser() };
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

export function createMockTournamentView(overrides = {}) {
  const base = {
    id: "mtt123",
    name: "Friday Deepstack",
    status: "registration",
    ownerId: "u1",
    buyIn: 500,
    prizePool: 0,
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
      canRename: true,
    },
  };

  const entrants = overrides.entrants || base.entrants;
  const buyIn = overrides.buyIn ?? base.buyIn;

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
    entrants,
    prizePool: overrides.prizePool ?? entrants.length * buyIn,
    standings: overrides.standings || base.standings,
  };
}
