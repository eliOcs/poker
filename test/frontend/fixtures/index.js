/**
 * Mock game state fixtures for testing the phg-game component
 */

export const mockEmptySeat = {
  empty: true,
  actions: [{ action: "sit", seat: 0 }],
};

export const mockOccupiedSeat = {
  empty: false,
  player: { id: "test-player-123", name: null },
  stack: 100000, // $1,000 in cents
  bet: 5000, // $50 in cents
  totalBuyIn: 100000, // $1,000 in cents
  handsPlayed: 0,
  folded: false,
  allIn: false,
  sittingOut: false,
  disconnected: false,
  cards: ["As", "Kh"],
  actions: [{ action: "check" }],
  isCurrentPlayer: true,
  isActing: true,
  lastAction: null,
  handResult: null,
  handRank: "A High",
};

export const mockFoldedSeat = {
  ...mockOccupiedSeat,
  folded: true,
  cards: [],
  actions: [],
  isActing: false,
};

export const mockAllInSeat = {
  ...mockOccupiedSeat,
  allIn: true,
  stack: 0,
  actions: [],
  isActing: false,
};

export const mockOpponentSeat = {
  ...mockOccupiedSeat,
  player: { id: "opponent-456", name: null },
  cards: ["??", "??"],
  isCurrentPlayer: false,
  isActing: false,
  actions: [],
};

export const mockSittingOutSeat = {
  ...mockOccupiedSeat,
  sittingOut: true,
  cards: [],
  actions: [{ action: "sitIn", cost: 5000 }], // $50 in cents
  isActing: false,
};

export const mockDisconnectedSeat = {
  ...mockOccupiedSeat,
  disconnected: true,
  isActing: false,
};

export const mockBustedSeat = {
  ...mockOccupiedSeat,
  stack: 0,
  sittingOut: true,
  bustedPosition: 3,
  cards: [],
  actions: [],
  isActing: false,
};

export const mockOccupiedSeatWithName = {
  ...mockOccupiedSeat,
  player: { id: "test-player-123", name: "Alice" },
};

export function createMockGameState(overrides = {}) {
  return {
    running: true,
    button: 0,
    blinds: { ante: 500, small: 2500, big: 5000 }, // $5/$25/$50 in cents
    board: { cards: [] },
    hand: { phase: "waiting", pot: 0, currentBet: 0, actingSeat: -1 },
    seats: [
      { ...mockEmptySeat, actions: [{ action: "sit", seat: 0 }] },
      { ...mockEmptySeat, actions: [{ action: "sit", seat: 1 }] },
      { ...mockEmptySeat, actions: [{ action: "sit", seat: 2 }] },
      { ...mockEmptySeat, actions: [{ action: "sit", seat: 3 }] },
      { ...mockEmptySeat, actions: [{ action: "sit", seat: 4 }] },
      { ...mockEmptySeat, actions: [{ action: "sit", seat: 5 }] },
    ],
    rankings: [],
    ...overrides,
  };
}

export function createMockGameWithPlayers() {
  return createMockGameState({
    hand: { phase: "preflop", pot: 7500, currentBet: 5000, actingSeat: 0 }, // $75/$50 in cents
    board: { cards: [] },
    seats: [
      {
        ...mockOccupiedSeat,
        actions: [
          { action: "call", amount: 2500 }, // $25 in cents
          { action: "raise", min: 10000, max: 100000 }, // $100-$1,000 in cents
          { action: "allIn", amount: 100000 }, // $1,000 in cents
          { action: "fold" },
        ],
      },
      mockOpponentSeat,
      { ...mockEmptySeat, actions: [{ action: "sit", seat: 2 }] },
      { ...mockEmptySeat, actions: [{ action: "sit", seat: 3 }] },
      { ...mockEmptySeat, actions: [{ action: "sit", seat: 4 }] },
      { ...mockEmptySeat, actions: [{ action: "sit", seat: 5 }] },
    ],
  });
}

export function createMockGameAtFlop() {
  return createMockGameState({
    hand: { phase: "flop", pot: 20000, currentBet: 0, actingSeat: 0 }, // $200 in cents
    board: {
      cards: ["Ah", "Kd", "Qc"],
    },
    seats: [
      {
        ...mockOccupiedSeat,
        bet: 0,
        actions: [
          { action: "check" },
          { action: "bet", min: 5000, max: 100000 }, // $50-$1,000 in cents
          { action: "allIn", amount: 100000 }, // $1,000 in cents
        ],
      },
      { ...mockOpponentSeat, bet: 0 },
      { ...mockEmptySeat, actions: [{ action: "sit", seat: 2 }] },
      { ...mockEmptySeat, actions: [{ action: "sit", seat: 3 }] },
      { ...mockEmptySeat, actions: [{ action: "sit", seat: 4 }] },
      { ...mockEmptySeat, actions: [{ action: "sit", seat: 5 }] },
    ],
  });
}

export function createMockGameWithBuyIn() {
  return createMockGameState({
    seats: [
      {
        empty: false,
        player: { id: "test-player-123" },
        stack: 0,
        bet: 0,
        folded: false,
        allIn: false,
        cards: [],
        actions: [{ action: "buyIn", min: 20, max: 100, bigBlind: 5000 }], // $50 big blind in cents
        isCurrentPlayer: true,
        isActing: false,
        lastAction: null,
        handResult: null,
        handRank: null,
      },
      { ...mockEmptySeat, actions: [{ action: "sit", seat: 1 }] },
      { ...mockEmptySeat, actions: [{ action: "sit", seat: 2 }] },
      { ...mockEmptySeat, actions: [{ action: "sit", seat: 3 }] },
      { ...mockEmptySeat, actions: [{ action: "sit", seat: 4 }] },
      { ...mockEmptySeat, actions: [{ action: "sit", seat: 5 }] },
    ],
  });
}

export function createMockGameWithWinner(winnerMessage) {
  return createMockGameState({
    hand: { phase: "showdown", pot: 0, currentBet: 0, actingSeat: -1 },
    board: {
      cards: ["Ah", "Kd", "Qc", "Js", "Th"],
    },
    winnerMessage,
    seats: [
      {
        ...mockOccupiedSeat,
        bet: 0,
        actions: [],
        handResult: winnerMessage?.amount || 0,
      },
      {
        ...mockOpponentSeat,
        bet: 0,
        handResult: -(winnerMessage?.amount || 0),
      },
      { ...mockEmptySeat, actions: [] },
      { ...mockEmptySeat, actions: [] },
      { ...mockEmptySeat, actions: [] },
      { ...mockEmptySeat, actions: [] },
    ],
  });
}

export function createMockGameWithRankings() {
  return createMockGameState({
    seats: [
      {
        ...mockOccupiedSeat,
        player: { id: "test-player-123", name: "Alice" },
        stack: 120000, // $1,200 in cents
        totalBuyIn: 100000, // $1,000 in cents
        handsPlayed: 50,
      },
      {
        ...mockOpponentSeat,
        player: { id: "opponent-456", name: null },
        stack: 80000, // $800 in cents
        totalBuyIn: 100000, // $1,000 in cents
        handsPlayed: 50,
      },
      { ...mockEmptySeat, actions: [{ action: "sit", seat: 2 }] },
      { ...mockEmptySeat, actions: [{ action: "sit", seat: 3 }] },
      { ...mockEmptySeat, actions: [{ action: "sit", seat: 4 }] },
      { ...mockEmptySeat, actions: [{ action: "sit", seat: 5 }] },
    ],
    rankings: [
      {
        seatIndex: 0,
        playerId: "test-player-123",
        playerName: "Alice",
        stack: 120000, // $1,200 in cents
        totalBuyIn: 100000, // $1,000 in cents
        netWinnings: 20000, // $200 in cents
        handsPlayed: 50,
        winRate: 8.0,
      },
      {
        seatIndex: 1,
        playerId: "opponent-456",
        playerName: null,
        stack: 80000, // $800 in cents
        totalBuyIn: 100000, // $1,000 in cents
        netWinnings: -20000, // -$200 in cents
        handsPlayed: 50,
        winRate: -8.0,
      },
    ],
  });
}

/**
 * Mock WebSocket class for testing
 */
export class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 1; // WebSocket.OPEN
    this.sent = [];
    this.onmessage = null;
    this.onopen = null;
    this.onclose = null;
    this.onerror = null;
  }

  send(data) {
    this.sent.push(JSON.parse(data));
  }

  close() {
    this.readyState = 3; // WebSocket.CLOSED
  }

  // Helper to simulate receiving a message
  simulateMessage(data) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }

  // Helper to simulate error
  simulateError(error) {
    if (this.onerror) {
      this.onerror(error);
    }
  }
}

// Re-export history fixtures for backward compatibility
export {
  mockHandSummary,
  mockHandSummaryLost,
  mockOhhHand,
  mockOhhHandWithShowdown,
  createMockHandList,
  createMockView,
  mockOhhHandView,
  mockOhhHandWithShowdownView,
} from "./history.js";
