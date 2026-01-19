/**
 * Mock hand history fixtures for testing the phg-history component
 */

export const mockHandSummary = {
  game_number: "test123-1",
  hand_number: 1,
  hole_cards: ["Ah", "Kh"],
  winner_name: "Alice",
  winner_id: "player1",
  pot: 20000, // $200 in cents
  is_winner: true,
};

export const mockHandSummaryLost = {
  game_number: "test123-2",
  hand_number: 2,
  hole_cards: ["7s", "2d"],
  winner_name: "Bob",
  winner_id: "player2",
  pot: 15000, // $150 in cents
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
      winning_hand: "A High",
      winning_cards: null,
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
  pots: [
    {
      number: 0,
      amount: 500,
      winning_hand: "Two Pair, Qs and Js",
      winning_cards: ["Qc", "Qh", "Jc", "Jd", "8h"],
      player_wins: [
        { player_id: "player2", win_amount: 500, contributed_rake: 0 },
      ],
    },
  ],
};

export function createMockHandList() {
  return [
    mockHandSummary,
    mockHandSummaryLost,
    {
      ...mockHandSummary,
      game_number: "test123-3",
      hand_number: 3,
      pot: 30000,
    }, // $300 in cents
  ];
}

/**
 * Convert OHH dollars to cents for frontend display
 * @param {number} dollars
 * @returns {number}
 */
function toCents(dollars) {
  return Math.round(dollars * 100);
}

/**
 * Builds player cards map from dealt cards actions
 */
function buildMockPlayerCardsMap(hand) {
  const playerCards = new Map();
  for (const round of hand.rounds) {
    for (const action of round.actions) {
      if (action.action === "Dealt Cards" && action.cards) {
        playerCards.set(action.player_id, action.cards);
      }
    }
  }
  return playerCards;
}

/**
 * Builds win amounts map from pots
 */
function buildMockWinAmountsMap(hand) {
  const winAmounts = new Map();
  for (const pot of hand.pots) {
    for (const win of pot.player_wins) {
      const current = winAmounts.get(win.player_id) || 0;
      winAmounts.set(win.player_id, current + toCents(win.win_amount));
    }
  }
  return winAmounts;
}

/**
 * Builds a mock occupied seat
 */
function buildMockOccupiedSeat(
  player,
  playerCards,
  winAmounts,
  winningHand,
  winningCards,
  playerId,
  seatIndex,
) {
  const isCurrentPlayer = player.id === playerId;
  const isWinner = winAmounts.has(player.id);
  const winAmount = winAmounts.get(player.id) || 0;
  const displayName = isCurrentPlayer ? `${player.name} (you)` : player.name;

  return {
    empty: false,
    player: { id: player.id, name: displayName || `Seat ${seatIndex + 1}` },
    stack: toCents(player.starting_stack),
    cards: playerCards.get(player.id) || [],
    handResult: winAmount > 0 ? winAmount : null,
    handRank: isWinner ? winningHand : null,
    winningCards: isWinner ? winningCards : null,
    isCurrentPlayer,
    folded: false,
    allIn: false,
    sittingOut: false,
    disconnected: false,
    isActing: false,
  };
}

/**
 * Extracts board info from hand rounds
 */
function extractMockBoardInfo(hand) {
  const boardCards = [];
  let lastStreet = "Preflop";
  for (const round of hand.rounds) {
    if (round.cards) boardCards.push(...round.cards);
    if (round.street) lastStreet = round.street;
  }
  return { boardCards, lastStreet };
}

/**
 * Calculates total pot from hand pots
 */
function calculateMockTotalPot(hand) {
  return hand.pots.reduce((sum, pot) => sum + toCents(pot.amount || 0), 0);
}

/**
 * Builds winner message from main pot
 */
function buildMockWinnerMessage(mainPot, players, winningHand) {
  if (!mainPot?.player_wins?.length) return null;
  const winnerId = mainPot.player_wins[0].player_id;
  const winner = players.find((p) => p.id === winnerId);
  return {
    playerName: winner?.name || `Seat ${winner?.seat || "??"}`,
    handRank: winningHand,
    amount: toCents(mainPot.player_wins[0].win_amount),
  };
}

/**
 * Creates a mock view object from an OHH hand (mirrors backend getHandView)
 * @param {object} hand - OHH hand data (in dollars)
 * @param {string} playerId - The requesting player's ID
 * @returns {object} View object for rendering (in cents)
 */
export function createMockView(hand, playerId) {
  const playerCards = buildMockPlayerCardsMap(hand);
  const winAmounts = buildMockWinAmountsMap(hand);
  const mainPot = hand.pots[0];
  const winningHand = mainPot?.winning_hand || null;
  const winningCards = mainPot?.winning_cards || null;

  const seats = [];
  for (let i = 0; i < hand.table_size; i++) {
    const player = hand.players.find((p) => p.seat === i);
    if (!player) {
      seats.push({ empty: true });
    } else {
      seats.push(
        buildMockOccupiedSeat(
          player,
          playerCards,
          winAmounts,
          winningHand,
          winningCards,
          playerId,
          i,
        ),
      );
    }
  }

  const { boardCards, lastStreet } = extractMockBoardInfo(hand);

  return {
    seats,
    board: { cards: boardCards, phase: lastStreet },
    pot: calculateMockTotalPot(hand),
    winnerMessage: buildMockWinnerMessage(mainPot, hand.players, winningHand),
    winningCards,
    button: hand.dealer_seat,
  };
}

// Pre-built mock views for common test scenarios
export const mockOhhHandView = createMockView(mockOhhHand, "player1");
export const mockOhhHandWithShowdownView = createMockView(
  mockOhhHandWithShowdown,
  "player1",
);
