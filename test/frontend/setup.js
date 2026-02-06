import {
  MockWebSocket,
  createMockGameState,
  createMockGameWithPlayers,
  createMockGameAtFlop,
  createMockGameWithBuyIn,
  createMockGameWithWinner,
  createMockTournamentGameState,
  mockOccupiedSeat,
  mockFoldedSeat,
  mockAllInSeat,
  mockOpponentSeat,
  mockEmptySeat,
  mockSittingOutSeat,
  mockDisconnectedSeat,
  mockBustedSeat,
  mockOccupiedSeatWithName,
  mockHandSummary,
  mockHandSummaryLost,
  mockOhhHand,
  mockOhhHandWithShowdown,
  createMockHandList,
  createMockView,
  mockOhhHandView,
  mockOhhHandWithShowdownView,
} from "./fixtures/index.js";

// Mock WebSocket before importing components
const OriginalWebSocket = globalThis.WebSocket;
globalThis.WebSocket = MockWebSocket;

// Mock fetch to prevent 404 warnings in tests
// Tests that need specific responses can override globalThis.fetch
const OriginalFetch = globalThis.fetch;
globalThis.fetch = async (url) => {
  // Return empty/default responses for history API calls
  if (url.match(/\/api\/history\/[^/]+$/)) {
    return { ok: true, json: async () => [] };
  }
  if (url.match(/\/api\/history\/[^/]+\/\d+$/)) {
    return { ok: true, json: async () => ({ hand: null }) };
  }
  // Fall back to original fetch for other URLs
  return OriginalFetch(url);
};

// Mock process.env for components
globalThis.process = {
  env: {
    DOMAIN: "localhost",
    PORT: "8443",
  },
};

// Import all components after mocking
import "../../src/frontend/index.js";
import "../../src/frontend/history.js";

export {
  OriginalWebSocket,
  OriginalFetch,
  MockWebSocket,
  createMockGameState,
  createMockGameWithPlayers,
  createMockGameAtFlop,
  createMockGameWithBuyIn,
  createMockGameWithWinner,
  createMockTournamentGameState,
  mockOccupiedSeat,
  mockFoldedSeat,
  mockAllInSeat,
  mockOpponentSeat,
  mockEmptySeat,
  mockSittingOutSeat,
  mockDisconnectedSeat,
  mockBustedSeat,
  mockOccupiedSeatWithName,
  mockHandSummary,
  mockHandSummaryLost,
  mockOhhHand,
  mockOhhHandWithShowdown,
  createMockHandList,
  createMockView,
  mockOhhHandView,
  mockOhhHandWithShowdownView,
};
