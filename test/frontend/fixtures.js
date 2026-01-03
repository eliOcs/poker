/**
 * Mock game state fixtures for testing the phg-game component
 */

export const mockEmptySeat = {
  empty: true,
  actions: [{ action: "sit", seat: 0 }],
};

export const mockOccupiedSeat = {
  empty: false,
  player: { id: "test-player-123" },
  stack: 1000,
  bet: 50,
  folded: false,
  allIn: false,
  sittingOut: false,
  disconnected: false,
  cards: [
    { rank: "ace", suit: "spades" },
    { rank: "king", suit: "hearts" },
  ],
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
  player: { id: "opponent-456" },
  cards: [{ hidden: true }, { hidden: true }],
  isCurrentPlayer: false,
  isActing: false,
  actions: [],
};

export const mockSittingOutSeat = {
  ...mockOccupiedSeat,
  sittingOut: true,
  cards: [],
  actions: [{ action: "sitIn", cost: 50 }],
  isActing: false,
};

export const mockDisconnectedSeat = {
  ...mockOccupiedSeat,
  disconnected: true,
  isActing: false,
};

export function createMockGameState(overrides = {}) {
  return {
    running: true,
    button: 0,
    blinds: { ante: 5, small: 25, big: 50 },
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
    ...overrides,
  };
}

export function createMockGameWithPlayers() {
  return createMockGameState({
    hand: { phase: "preflop", pot: 75, currentBet: 50, actingSeat: 0 },
    board: { cards: [] },
    seats: [
      {
        ...mockOccupiedSeat,
        actions: [
          { action: "call", amount: 25 },
          { action: "raise", min: 100, max: 1000 },
          { action: "allIn", amount: 1000 },
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
    hand: { phase: "flop", pot: 200, currentBet: 0, actingSeat: 0 },
    board: {
      cards: [
        { rank: "ace", suit: "hearts" },
        { rank: "king", suit: "diamonds" },
        { rank: "queen", suit: "clubs" },
      ],
    },
    seats: [
      {
        ...mockOccupiedSeat,
        bet: 0,
        actions: [
          { action: "check" },
          { action: "bet", min: 50, max: 1000 },
          { action: "allIn", amount: 1000 },
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
        actions: [{ action: "buyIn", min: 20, max: 100, bigBlind: 50 }],
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
      cards: [
        { rank: "ace", suit: "hearts" },
        { rank: "king", suit: "diamonds" },
        { rank: "queen", suit: "clubs" },
        { rank: "jack", suit: "spades" },
        { rank: "10", suit: "hearts" },
      ],
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
