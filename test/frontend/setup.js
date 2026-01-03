import {
  MockWebSocket,
  createMockGameState,
  createMockGameWithPlayers,
  createMockGameAtFlop,
  createMockGameWithBuyIn,
  createMockGameWithWinner,
  mockOccupiedSeat,
  mockFoldedSeat,
  mockAllInSeat,
  mockOpponentSeat,
  mockEmptySeat,
  mockSittingOutSeat,
  mockDisconnectedSeat,
  mockOccupiedSeatWithName,
} from "./fixtures.js";

// Mock WebSocket before importing components
const OriginalWebSocket = globalThis.WebSocket;
globalThis.WebSocket = MockWebSocket;

// Mock process.env for components
globalThis.process = {
  env: {
    DOMAIN: "localhost",
    PORT: "8443",
  },
};

// Import all components after mocking
import "../../src/frontend/index.js";

export {
  OriginalWebSocket,
  MockWebSocket,
  createMockGameState,
  createMockGameWithPlayers,
  createMockGameAtFlop,
  createMockGameWithBuyIn,
  createMockGameWithWinner,
  mockOccupiedSeat,
  mockFoldedSeat,
  mockAllInSeat,
  mockOpponentSeat,
  mockEmptySeat,
  mockSittingOutSeat,
  mockDisconnectedSeat,
  mockOccupiedSeatWithName,
};
