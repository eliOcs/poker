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
  stack: 1000,
  bet: 50,
  totalBuyIn: 1000,
  handsPlayed: 0,
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
  player: { id: "opponent-456", name: null },
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

export const mockOccupiedSeatWithName = {
  ...mockOccupiedSeat,
  player: { id: "test-player-123", name: "Alice" },
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
    rankings: [],
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

export function createMockGameWithRankings() {
  return createMockGameState({
    seats: [
      {
        ...mockOccupiedSeat,
        player: { id: "test-player-123", name: "Alice" },
        stack: 1200,
        totalBuyIn: 1000,
        handsPlayed: 50,
      },
      {
        ...mockOpponentSeat,
        player: { id: "opponent-456", name: null },
        stack: 800,
        totalBuyIn: 1000,
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
        stack: 1200,
        totalBuyIn: 1000,
        netWinnings: 200,
        handsPlayed: 50,
        winRate: 8.0,
      },
      {
        seatIndex: 1,
        playerId: "opponent-456",
        playerName: null,
        stack: 800,
        totalBuyIn: 1000,
        netWinnings: -200,
        handsPlayed: 50,
        winRate: -8.0,
      },
    ],
  });
}

/**
 * Mock hand history fixtures for testing the phg-history component
 */
export const mockHandSummary = {
  game_number: "test123-1",
  hand_number: 1,
  hole_cards: ["Ah", "Kh"],
  winner_name: "Alice",
  winner_id: "player1",
  pot: 200,
  is_winner: true,
};

export const mockHandSummaryLost = {
  game_number: "test123-2",
  hand_number: 2,
  hole_cards: ["7s", "2d"],
  winner_name: "Bob",
  winner_id: "player2",
  pot: 150,
  is_winner: false,
};

export const mockOhhHand = {
  spec_version: "1.4.6",
  site_name: "Pluton Poker",
  game_number: "test123-1",
  start_date_utc: "2024-01-15T20:30:00Z",
  game_type: "Holdem",
  bet_limit: { bet_type: "NL" },
  table_size: 6,
  dealer_seat: 3,
  small_blind_amount: 25,
  big_blind_amount: 50,
  ante_amount: 0,
  players: [
    { id: "player1", seat: 3, name: "Alice", starting_stack: 1000 },
    { id: "player2", seat: 5, name: "Bob", starting_stack: 1000 },
  ],
  rounds: [
    {
      id: 0,
      street: "Preflop",
      actions: [
        {
          action_number: 1,
          player_id: "player1",
          action: "Post SB",
          amount: 25,
        },
        {
          action_number: 2,
          player_id: "player2",
          action: "Post BB",
          amount: 50,
        },
        {
          action_number: 3,
          player_id: "player1",
          action: "Dealt Cards",
          cards: ["Ah", "Kh"],
        },
        {
          action_number: 4,
          player_id: "player2",
          action: "Dealt Cards",
          cards: ["Qc", "Jc"],
        },
        {
          action_number: 5,
          player_id: "player1",
          action: "Raise",
          amount: 150,
        },
        { action_number: 6, player_id: "player2", action: "Call", amount: 150 },
      ],
    },
    {
      id: 1,
      street: "Flop",
      cards: ["Qh", "Jd", "2s"],
      actions: [
        { action_number: 7, player_id: "player2", action: "Check" },
        { action_number: 8, player_id: "player1", action: "Bet", amount: 100 },
        { action_number: 9, player_id: "player2", action: "Fold" },
      ],
    },
  ],
  pots: [
    {
      number: 0,
      amount: 400,
      player_wins: [
        { player_id: "player1", win_amount: 400, contributed_rake: 0 },
      ],
    },
  ],
};

export const mockOhhHandWithShowdown = {
  ...mockOhhHand,
  game_number: "test123-2",
  rounds: [
    ...mockOhhHand.rounds,
    {
      id: 2,
      street: "Turn",
      cards: ["5c"],
      actions: [
        { action_number: 10, player_id: "player2", action: "Check" },
        { action_number: 11, player_id: "player1", action: "Check" },
      ],
    },
    {
      id: 3,
      street: "River",
      cards: ["8h"],
      actions: [
        { action_number: 12, player_id: "player2", action: "Bet", amount: 100 },
        {
          action_number: 13,
          player_id: "player1",
          action: "Call",
          amount: 100,
        },
      ],
    },
    {
      id: 4,
      street: "Showdown",
      actions: [
        {
          action_number: 14,
          player_id: "player1",
          action: "Shows Cards",
          cards: ["Ah", "Kh"],
        },
        {
          action_number: 15,
          player_id: "player2",
          action: "Shows Cards",
          cards: ["Qc", "Jc"],
        },
      ],
    },
  ],
};

export function createMockHandList() {
  return [
    mockHandSummary,
    mockHandSummaryLost,
    { ...mockHandSummary, game_number: "test123-3", hand_number: 3, pot: 300 },
  ];
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
