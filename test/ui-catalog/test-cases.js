/* global window, document */
/**
 * UI Catalog Test Cases - Full Game States
 *
 * Renders complete game views with mock data based on query params.
 * URL format: ?test=<test-id>
 */

import { html, render } from "lit";
import "/src/frontend/index.js";
import "/src/frontend/home.js";
import "/src/frontend/history.js";
import { mockEmptySeat } from "/fixtures.js";

// Helper to create a game component with mock data
function gameView(gameState, options = {}) {
  const { showRanking = false, notFound = false, error = null } = options;

  // Create a mock element that bypasses WebSocket connection
  return html`
    <div style="height: 100vh; width: 100%;">
      <phg-game
        .game=${notFound ? null : gameState}
        .socket=${{ readyState: 1 }}
        .notFound=${notFound}
        .error=${error}
        .showRanking=${showRanking}
      ></phg-game>
    </div>
  `;
}

// Base game state factory
function createGame(overrides = {}) {
  return {
    running: true,
    button: 0,
    blinds: { ante: 0, small: 25, big: 50 },
    board: { cards: [] },
    hand: { phase: "waiting", pot: 0, currentBet: 0, actingSeat: -1 },
    countdown: null,
    winnerMessage: null,
    rankings: [],
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

// Player seat factory
function createPlayer(name, overrides = {}) {
  return {
    empty: false,
    player: { id: `player-${name}`, name },
    stack: 1000,
    bet: 0,
    totalBuyIn: 1000,
    handsPlayed: 0,
    folded: false,
    allIn: false,
    sittingOut: false,
    disconnected: false,
    cards: [],
    actions: [],
    isCurrentPlayer: false,
    isActing: false,
    lastAction: null,
    handResult: null,
    handRank: null,
    ...overrides,
  };
}

// Test case definitions - Full Game States
const TEST_CASES = {
  // === LANDING PAGE ===

  "landing-page": () => html`
    <div style="height: 100vh; width: 100%;">
      <phg-home></phg-home>
    </div>
  `,

  // === LOBBY STATES ===

  "game-empty-table": () => gameView(createGame()),

  "game-waiting-for-players": () =>
    gameView(
      createGame({
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            stack: 5000,
            cards: [],
            actions: [{ action: "sitOut" }],
          }),
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 1 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 2 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 3 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 4 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 5 }] },
        ],
      }),
    ),

  "game-ready-to-start": () =>
    gameView(
      createGame({
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            stack: 5000,
            actions: [{ action: "start" }, { action: "sitOut" }],
          }),
          createPlayer("Alice", { stack: 3000 }),
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
        ],
      }),
    ),

  "game-countdown": () =>
    gameView(
      createGame({
        countdown: 3,
        seats: [
          createPlayer("You", { isCurrentPlayer: true, stack: 5000 }),
          createPlayer("Alice", { stack: 3000 }),
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
        ],
      }),
    ),

  // === PREFLOP STATES ===

  "game-preflop-your-turn": () =>
    gameView(
      createGame({
        button: 1,
        hand: { phase: "preflop", pot: 75, currentBet: 50, actingSeat: 0 },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            isActing: true,
            stack: 4950,
            bet: 0,
            cards: [
              { rank: "ace", suit: "spades" },
              { rank: "king", suit: "spades" },
            ],
            actions: [
              { action: "fold" },
              { action: "call", amount: 50 },
              { action: "raise", min: 100, max: 5000 },
            ],
            handRank: "A High",
          }),
          createPlayer("Alice", {
            stack: 2975,
            bet: 25,
            cards: [{ hidden: true }, { hidden: true }],
            lastAction: "SB $25",
          }),
          createPlayer("Bob", {
            stack: 2950,
            bet: 50,
            cards: [{ hidden: true }, { hidden: true }],
            lastAction: "BB $50",
          }),
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
        ],
      }),
    ),

  "game-preflop-waiting": () =>
    gameView(
      createGame({
        button: 0,
        hand: { phase: "preflop", pot: 125, currentBet: 50, actingSeat: 2 },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            stack: 4950,
            bet: 50,
            cards: [
              { rank: "queen", suit: "hearts" },
              { rank: "jack", suit: "hearts" },
            ],
            lastAction: "Call $50",
            handRank: "Q High",
          }),
          createPlayer("Alice", {
            stack: 2975,
            bet: 25,
            cards: [{ hidden: true }, { hidden: true }],
            lastAction: "SB $25",
          }),
          createPlayer("Bob", {
            isActing: true,
            stack: 2950,
            bet: 50,
            cards: [{ hidden: true }, { hidden: true }],
            actions: [{ action: "callClock" }],
          }),
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
        ],
      }),
    ),

  // === FLOP STATES ===

  "game-flop-check-or-bet": () =>
    gameView(
      createGame({
        button: 0,
        hand: { phase: "flop", pot: 150, currentBet: 0, actingSeat: 0 },
        board: {
          cards: [
            { rank: "ace", suit: "hearts" },
            { rank: "king", suit: "diamonds" },
            { rank: "7", suit: "clubs" },
          ],
        },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            isActing: true,
            stack: 4950,
            bet: 0,
            cards: [
              { rank: "ace", suit: "spades" },
              { rank: "king", suit: "spades" },
            ],
            actions: [
              { action: "check" },
              { action: "bet", min: 50, max: 4950 },
            ],
            handRank: "Two Pair, Aces and Kings",
          }),
          createPlayer("Alice", {
            stack: 2950,
            bet: 0,
            cards: [{ hidden: true }, { hidden: true }],
          }),
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
        ],
      }),
    ),

  "game-flop-facing-bet": () =>
    gameView(
      createGame({
        button: 1,
        hand: { phase: "flop", pot: 350, currentBet: 200, actingSeat: 0 },
        board: {
          cards: [
            { rank: "10", suit: "hearts" },
            { rank: "jack", suit: "hearts" },
            { rank: "3", suit: "clubs" },
          ],
        },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            isActing: true,
            stack: 4800,
            bet: 0,
            cards: [
              { rank: "queen", suit: "hearts" },
              { rank: "9", suit: "hearts" },
            ],
            actions: [
              { action: "fold" },
              { action: "call", amount: 200 },
              { action: "raise", min: 400, max: 4800 },
            ],
            handRank: "Flush Draw",
          }),
          createPlayer("Alice", {
            stack: 2800,
            bet: 200,
            cards: [{ hidden: true }, { hidden: true }],
            lastAction: "Bet $200",
          }),
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
        ],
      }),
    ),

  // === TURN STATES ===

  "game-turn": () =>
    gameView(
      createGame({
        button: 0,
        hand: { phase: "turn", pot: 600, currentBet: 0, actingSeat: 1 },
        board: {
          cards: [
            { rank: "ace", suit: "hearts" },
            { rank: "king", suit: "diamonds" },
            { rank: "7", suit: "clubs" },
            { rank: "2", suit: "spades" },
          ],
        },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            stack: 4700,
            bet: 0,
            cards: [
              { rank: "ace", suit: "spades" },
              { rank: "queen", suit: "spades" },
            ],
            handRank: "Pair of Aces",
          }),
          createPlayer("Alice", {
            isActing: true,
            stack: 2700,
            bet: 0,
            cards: [{ hidden: true }, { hidden: true }],
            actions: [{ action: "callClock" }],
          }),
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
        ],
      }),
    ),

  // === RIVER STATES ===

  "game-river-all-in-decision": () =>
    gameView(
      createGame({
        button: 1,
        hand: { phase: "river", pot: 2400, currentBet: 1200, actingSeat: 0 },
        board: {
          cards: [
            { rank: "ace", suit: "hearts" },
            { rank: "king", suit: "hearts" },
            { rank: "queen", suit: "hearts" },
            { rank: "5", suit: "clubs" },
            { rank: "2", suit: "diamonds" },
          ],
        },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            isActing: true,
            stack: 3600,
            bet: 0,
            cards: [
              { rank: "jack", suit: "hearts" },
              { rank: "10", suit: "hearts" },
            ],
            actions: [
              { action: "fold" },
              { action: "call", amount: 1200 },
              { action: "raise", min: 2400, max: 3600 },
            ],
            handRank: "Royal Flush",
          }),
          createPlayer("Alice", {
            stack: 1800,
            bet: 1200,
            cards: [{ hidden: true }, { hidden: true }],
            lastAction: "Bet $1200",
          }),
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
        ],
      }),
    ),

  // === SHOWDOWN STATES ===

  "game-showdown-you-win": () => {
    const winningCards = [
      { rank: "ace", suit: "hearts" },
      { rank: "king", suit: "hearts" },
      { rank: "queen", suit: "hearts" },
      { rank: "jack", suit: "hearts" },
      { rank: "10", suit: "hearts" },
    ];
    return gameView(
      createGame({
        button: 1,
        hand: { phase: "showdown", pot: 0, currentBet: 0, actingSeat: -1 },
        board: {
          cards: [
            { rank: "ace", suit: "hearts" },
            { rank: "king", suit: "hearts" },
            { rank: "queen", suit: "hearts" },
            { rank: "5", suit: "clubs" },
            { rank: "2", suit: "diamonds" },
          ],
        },
        winnerMessage: {
          playerName: "You",
          handRank: "Royal Flush",
          amount: 4800,
        },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            stack: 9800,
            bet: 0,
            cards: [
              { rank: "jack", suit: "hearts" },
              { rank: "10", suit: "hearts" },
            ],
            handResult: 4800,
            handRank: "Royal Flush",
            winningCards,
          }),
          createPlayer("Alice", {
            stack: 200,
            bet: 0,
            cards: [
              { rank: "ace", suit: "spades" },
              { rank: "ace", suit: "diamonds" },
            ],
            handResult: -4800,
            handRank: "Three of a Kind, Aces",
          }),
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
        ],
      }),
    );
  },

  "game-showdown-you-lose": () =>
    gameView(
      createGame({
        button: 0,
        hand: { phase: "showdown", pot: 0, currentBet: 0, actingSeat: -1 },
        board: {
          cards: [
            { rank: "ace", suit: "hearts" },
            { rank: "ace", suit: "clubs" },
            { rank: "king", suit: "diamonds" },
            { rank: "5", suit: "clubs" },
            { rank: "2", suit: "diamonds" },
          ],
        },
        winnerMessage: {
          playerName: "Alice",
          handRank: "Four of a Kind, Aces",
          amount: 4000,
        },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            stack: 1000,
            bet: 0,
            cards: [
              { rank: "king", suit: "spades" },
              { rank: "king", suit: "clubs" },
            ],
            handResult: -2000,
            handRank: "Full House, Kings over Aces",
          }),
          createPlayer("Alice", {
            stack: 7000,
            bet: 0,
            cards: [
              { rank: "ace", suit: "spades" },
              { rank: "ace", suit: "diamonds" },
            ],
            handResult: 4000,
            handRank: "Four of a Kind, Aces",
            winningCards: [
              { rank: "ace", suit: "hearts" },
              { rank: "ace", suit: "clubs" },
              { rank: "ace", suit: "spades" },
              { rank: "ace", suit: "diamonds" },
              { rank: "king", suit: "diamonds" },
            ],
          }),
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
        ],
      }),
    ),

  // === SPECIAL STATES ===

  "game-all-in-situation": () =>
    gameView(
      createGame({
        button: 0,
        hand: { phase: "turn", pot: 6000, currentBet: 0, actingSeat: -1 },
        board: {
          cards: [
            { rank: "jack", suit: "spades" },
            { rank: "10", suit: "spades" },
            { rank: "9", suit: "hearts" },
            { rank: "2", suit: "clubs" },
          ],
        },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            allIn: true,
            stack: 0,
            bet: 0,
            cards: [
              { rank: "queen", suit: "spades" },
              { rank: "8", suit: "spades" },
            ],
            handRank: "Straight",
          }),
          createPlayer("Alice", {
            allIn: true,
            stack: 0,
            bet: 0,
            cards: [{ hidden: true }, { hidden: true }],
          }),
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
        ],
      }),
    ),

  "game-with-folded-players": () =>
    gameView(
      createGame({
        button: 0,
        hand: { phase: "turn", pot: 800, currentBet: 200, actingSeat: 0 },
        board: {
          cards: [
            { rank: "ace", suit: "hearts" },
            { rank: "king", suit: "diamonds" },
            { rank: "7", suit: "clubs" },
            { rank: "3", suit: "spades" },
          ],
        },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            isActing: true,
            stack: 4500,
            bet: 0,
            cards: [
              { rank: "ace", suit: "spades" },
              { rank: "queen", suit: "spades" },
            ],
            actions: [
              { action: "fold" },
              { action: "call", amount: 200 },
              { action: "raise", min: 400, max: 4500 },
            ],
            handRank: "Pair of Aces",
          }),
          createPlayer("Alice", {
            folded: true,
            stack: 2800,
            bet: 0,
            cards: [],
          }),
          createPlayer("Bob", {
            stack: 2600,
            bet: 200,
            cards: [{ hidden: true }, { hidden: true }],
            lastAction: "Bet $200",
          }),
          createPlayer("Charlie", {
            folded: true,
            stack: 3200,
            bet: 0,
            cards: [],
          }),
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
        ],
      }),
    ),

  "game-clock-called": () =>
    gameView(
      createGame({
        button: 0,
        hand: {
          phase: "flop",
          pot: 300,
          currentBet: 100,
          actingSeat: 1,
          clockCalledAt: Date.now() - 15000,
        },
        board: {
          cards: [
            { rank: "jack", suit: "hearts" },
            { rank: "10", suit: "diamonds" },
            { rank: "5", suit: "clubs" },
          ],
        },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            stack: 4900,
            bet: 100,
            cards: [
              { rank: "ace", suit: "spades" },
              { rank: "king", suit: "spades" },
            ],
            lastAction: "Call $100",
            handRank: "A High",
          }),
          createPlayer("Alice", {
            isActing: true,
            stack: 2800,
            bet: 100,
            cards: [{ hidden: true }, { hidden: true }],
          }),
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
        ],
      }),
    ),

  "game-sitting-out": () =>
    gameView(
      createGame({
        button: 1,
        hand: { phase: "preflop", pot: 75, currentBet: 50, actingSeat: 2 },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            sittingOut: true,
            stack: 5000,
            bet: 0,
            cards: [],
            actions: [{ action: "sitIn", cost: 50 }, { action: "leave" }],
          }),
          createPlayer("Alice", {
            stack: 2975,
            bet: 25,
            cards: [{ hidden: true }, { hidden: true }],
            lastAction: "SB $25",
          }),
          createPlayer("Bob", {
            isActing: true,
            stack: 2950,
            bet: 50,
            cards: [{ hidden: true }, { hidden: true }],
          }),
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
        ],
      }),
    ),

  "game-disconnected-player": () =>
    gameView(
      createGame({
        button: 0,
        hand: { phase: "flop", pot: 200, currentBet: 0, actingSeat: 0 },
        board: {
          cards: [
            { rank: "ace", suit: "hearts" },
            { rank: "king", suit: "diamonds" },
            { rank: "7", suit: "clubs" },
          ],
        },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            isActing: true,
            stack: 4900,
            bet: 0,
            cards: [
              { rank: "queen", suit: "hearts" },
              { rank: "jack", suit: "hearts" },
            ],
            actions: [
              { action: "check" },
              { action: "bet", min: 50, max: 4900 },
            ],
            handRank: "Q High",
          }),
          createPlayer("Alice", {
            disconnected: true,
            stack: 2900,
            bet: 0,
            cards: [{ hidden: true }, { hidden: true }],
          }),
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
        ],
      }),
    ),

  "game-full-table": () =>
    gameView(
      createGame({
        button: 0,
        hand: { phase: "preflop", pot: 175, currentBet: 50, actingSeat: 3 },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            stack: 4950,
            bet: 50,
            cards: [
              { rank: "9", suit: "hearts" },
              { rank: "9", suit: "diamonds" },
            ],
            lastAction: "Call $50",
            handRank: "Pair of Nines",
          }),
          createPlayer("Alice", {
            stack: 2975,
            bet: 25,
            cards: [{ hidden: true }, { hidden: true }],
            lastAction: "SB $25",
          }),
          createPlayer("Bob", {
            stack: 2950,
            bet: 50,
            cards: [{ hidden: true }, { hidden: true }],
            lastAction: "BB $50",
          }),
          createPlayer("Charlie", {
            isActing: true,
            stack: 3000,
            bet: 0,
            cards: [{ hidden: true }, { hidden: true }],
          }),
          createPlayer("Diana", {
            stack: 1500,
            bet: 50,
            cards: [{ hidden: true }, { hidden: true }],
            lastAction: "Call $50",
          }),
          createPlayer("Eve", {
            folded: true,
            stack: 2000,
            bet: 0,
            cards: [],
          }),
        ],
      }),
    ),

  // === BUY-IN STATE ===

  "game-buy-in": () =>
    gameView(
      createGame({
        seats: [
          {
            empty: false,
            player: { id: "you", name: null },
            stack: 0,
            bet: 0,
            totalBuyIn: 0,
            handsPlayed: 0,
            folded: false,
            allIn: false,
            sittingOut: false,
            disconnected: false,
            cards: [],
            actions: [{ action: "buyIn", min: 20, max: 100, bigBlind: 50 }],
            isCurrentPlayer: true,
            isActing: false,
            lastAction: null,
            handResult: null,
            handRank: null,
          },
          createPlayer("Alice", { stack: 3000 }),
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
        ],
      }),
    ),

  // === ERROR & NOT FOUND STATES ===

  "game-not-found": () => gameView(null, { notFound: true }),

  "game-error": () =>
    gameView(
      createGame({
        seats: [
          createPlayer("You", { isCurrentPlayer: true, stack: 5000 }),
          createPlayer("Alice", { stack: 3000 }),
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
        ],
      }),
      { error: "Insufficient funds to make that bet" },
    ),

  // === MODAL STATES ===

  "game-rankings-modal": () =>
    gameView(
      createGame({
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            stack: 6200,
            totalBuyIn: 5000,
            handsPlayed: 45,
          }),
          createPlayer("Alice", {
            stack: 3800,
            totalBuyIn: 5000,
            handsPlayed: 45,
          }),
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
          { ...mockEmptySeat, actions: [] },
        ],
        rankings: [
          {
            seatIndex: 0,
            playerId: "you",
            playerName: "You",
            stack: 6200,
            totalBuyIn: 5000,
            netWinnings: 1200,
            handsPlayed: 45,
            winRate: 5.33,
          },
          {
            seatIndex: 1,
            playerId: "alice",
            playerName: "Alice",
            stack: 3800,
            totalBuyIn: 5000,
            netWinnings: -1200,
            handsPlayed: 45,
            winRate: -5.33,
          },
        ],
      }),
      { showRanking: true },
    ),

  // === HAND HISTORY STATES ===

  "history-loading": () => html`
    <div style="height: 100vh; width: 100%;">
      <phg-history
        .gameId=${"test123"}
        .loading=${true}
      ></phg-history>
    </div>
  `,

  "history-empty": () => html`
    <div style="height: 100vh; width: 100%;">
      <phg-history
        .gameId=${"test123"}
        .loading=${false}
        .handList=${[]}
      ></phg-history>
    </div>
  `,

  "history-error": () => html`
    <div style="height: 100vh; width: 100%;">
      <phg-history
        .gameId=${"test123"}
        .loading=${false}
        .error=${"Failed to load hand history"}
      ></phg-history>
    </div>
  `,

  "history-preflop-fold": () => html`
    <div style="height: 100vh; width: 100%;">
      <phg-history
        .gameId=${"test123"}
        .handNumber=${1}
        .playerId=${"player1"}
        .loading=${false}
        .handList=${[
          { game_number: "test123-1", hand_number: 1, hole_cards: ["Ah", "Kh"], winner_name: "You", winner_id: "player1", pot: 75, is_winner: true },
        ]}
        .hand=${{
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
            { id: "player1", seat: 3, name: "You", starting_stack: 1000 },
            { id: "player2", seat: 5, name: "Alice", starting_stack: 1000 },
          ],
          rounds: [
            {
              id: 0,
              street: "Preflop",
              actions: [
                { action_number: 1, player_id: "player1", action: "Post SB", amount: 25 },
                { action_number: 2, player_id: "player2", action: "Post BB", amount: 50 },
                { action_number: 3, player_id: "player1", action: "Dealt Cards", cards: ["Ah", "Kh"] },
                { action_number: 4, player_id: "player2", action: "Dealt Cards", cards: ["??", "??"] },
                { action_number: 5, player_id: "player1", action: "Raise", amount: 150 },
                { action_number: 6, player_id: "player2", action: "Fold" },
              ],
            },
          ],
          pots: [{ number: 0, amount: 75, player_wins: [{ player_id: "player1", win_amount: 75, contributed_rake: 0 }] }],
        }}
      ></phg-history>
    </div>
  `,

  "history-showdown-win": () => html`
    <div style="height: 100vh; width: 100%;">
      <phg-history
        .gameId=${"test123"}
        .handNumber=${1}
        .playerId=${"player1"}
        .loading=${false}
        .handList=${[
          { game_number: "test123-1", hand_number: 1, hole_cards: ["Jh", "Th"], winner_name: "You", winner_id: "player1", pot: 500, is_winner: true },
        ]}
        .hand=${{
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
            { id: "player1", seat: 3, name: "You", starting_stack: 1000 },
            { id: "player2", seat: 5, name: "Alice", starting_stack: 1000 },
          ],
          rounds: [
            {
              id: 0,
              street: "Preflop",
              actions: [
                { action_number: 1, player_id: "player1", action: "Post SB", amount: 25 },
                { action_number: 2, player_id: "player2", action: "Post BB", amount: 50 },
                { action_number: 3, player_id: "player1", action: "Dealt Cards", cards: ["Jh", "Th"] },
                { action_number: 4, player_id: "player2", action: "Dealt Cards", cards: ["As", "Ad"] },
                { action_number: 5, player_id: "player1", action: "Call", amount: 50 },
                { action_number: 6, player_id: "player2", action: "Check" },
              ],
            },
            {
              id: 1,
              street: "Flop",
              cards: ["Ah", "Kh", "Qh"],
              actions: [
                { action_number: 7, player_id: "player2", action: "Bet", amount: 100 },
                { action_number: 8, player_id: "player1", action: "Call", amount: 100 },
              ],
            },
            {
              id: 2,
              street: "Turn",
              cards: ["5c"],
              actions: [
                { action_number: 9, player_id: "player2", action: "Bet", amount: 100 },
                { action_number: 10, player_id: "player1", action: "Call", amount: 100 },
              ],
            },
            {
              id: 3,
              street: "River",
              cards: ["2d"],
              actions: [
                { action_number: 11, player_id: "player2", action: "Check" },
                { action_number: 12, player_id: "player1", action: "Check" },
              ],
            },
            {
              id: 4,
              street: "Showdown",
              actions: [
                { action_number: 13, player_id: "player1", action: "Shows Cards", cards: ["Jh", "Th"] },
                { action_number: 14, player_id: "player2", action: "Shows Cards", cards: ["As", "Ad"] },
              ],
            },
          ],
          pots: [{ number: 0, amount: 500, player_wins: [{ player_id: "player1", win_amount: 500, contributed_rake: 0 }] }],
        }}
      ></phg-history>
    </div>
  `,

  "history-showdown-lose": () => html`
    <div style="height: 100vh; width: 100%;">
      <phg-history
        .gameId=${"test123"}
        .handNumber=${1}
        .playerId=${"player1"}
        .loading=${false}
        .handList=${[
          { game_number: "test123-1", hand_number: 1, hole_cards: ["Kc", "Ks"], winner_name: "Alice", winner_id: "player2", pot: 400, is_winner: false },
        ]}
        .hand=${{
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
            { id: "player1", seat: 3, name: "You", starting_stack: 1000 },
            { id: "player2", seat: 5, name: "Alice", starting_stack: 1000 },
          ],
          rounds: [
            {
              id: 0,
              street: "Preflop",
              actions: [
                { action_number: 1, player_id: "player1", action: "Post SB", amount: 25 },
                { action_number: 2, player_id: "player2", action: "Post BB", amount: 50 },
                { action_number: 3, player_id: "player1", action: "Dealt Cards", cards: ["Kc", "Ks"] },
                { action_number: 4, player_id: "player2", action: "Dealt Cards", cards: ["As", "Ad"] },
                { action_number: 5, player_id: "player1", action: "Raise", amount: 100 },
                { action_number: 6, player_id: "player2", action: "Raise", amount: 200 },
                { action_number: 7, player_id: "player1", action: "Call", amount: 200 },
              ],
            },
            {
              id: 1,
              street: "Flop",
              cards: ["Kd", "5h", "2c"],
              actions: [
                { action_number: 8, player_id: "player2", action: "Check" },
                { action_number: 9, player_id: "player1", action: "Check" },
              ],
            },
            {
              id: 2,
              street: "Turn",
              cards: ["Ac"],
              actions: [
                { action_number: 10, player_id: "player2", action: "Check" },
                { action_number: 11, player_id: "player1", action: "Check" },
              ],
            },
            {
              id: 3,
              street: "River",
              cards: ["3s"],
              actions: [
                { action_number: 12, player_id: "player2", action: "Check" },
                { action_number: 13, player_id: "player1", action: "Check" },
              ],
            },
            {
              id: 4,
              street: "Showdown",
              actions: [
                { action_number: 14, player_id: "player1", action: "Shows Cards", cards: ["Kc", "Ks"] },
                { action_number: 15, player_id: "player2", action: "Shows Cards", cards: ["As", "Ad"] },
              ],
            },
          ],
          pots: [{ number: 0, amount: 400, player_wins: [{ player_id: "player2", win_amount: 400, contributed_rake: 0 }] }],
        }}
      ></phg-history>
    </div>
  `,

  "history-multiple-hands": () => html`
    <div style="height: 100vh; width: 100%;">
      <phg-history
        .gameId=${"test123"}
        .handNumber=${2}
        .playerId=${"player1"}
        .loading=${false}
        .handList=${[
          { game_number: "test123-1", hand_number: 1, hole_cards: ["Ah", "Kh"], winner_name: "You", winner_id: "player1", pot: 150, is_winner: true },
          { game_number: "test123-2", hand_number: 2, hole_cards: ["7s", "2d"], winner_name: "Alice", winner_id: "player2", pot: 200, is_winner: false },
          { game_number: "test123-3", hand_number: 3, hole_cards: ["Qc", "Qd"], winner_name: "You", winner_id: "player1", pot: 350, is_winner: true },
          { game_number: "test123-4", hand_number: 4, hole_cards: ["Jc", "Ts"], winner_name: "Bob", winner_id: "player3", pot: 100, is_winner: false },
          { game_number: "test123-5", hand_number: 5, hole_cards: ["9h", "9s"], winner_name: "You", winner_id: "player1", pot: 500, is_winner: true },
        ]}
        .hand=${{
          spec_version: "1.4.6",
          site_name: "Pluton Poker",
          game_number: "test123-2",
          start_date_utc: "2024-01-15T20:35:00Z",
          game_type: "Holdem",
          bet_limit: { bet_type: "NL" },
          table_size: 6,
          dealer_seat: 5,
          small_blind_amount: 25,
          big_blind_amount: 50,
          ante_amount: 0,
          players: [
            { id: "player1", seat: 3, name: "You", starting_stack: 1150 },
            { id: "player2", seat: 5, name: "Alice", starting_stack: 850 },
          ],
          rounds: [
            {
              id: 0,
              street: "Preflop",
              actions: [
                { action_number: 1, player_id: "player2", action: "Post SB", amount: 25 },
                { action_number: 2, player_id: "player1", action: "Post BB", amount: 50 },
                { action_number: 3, player_id: "player2", action: "Dealt Cards", cards: ["Ah", "Qh"] },
                { action_number: 4, player_id: "player1", action: "Dealt Cards", cards: ["7s", "2d"] },
                { action_number: 5, player_id: "player2", action: "Raise", amount: 100 },
                { action_number: 6, player_id: "player1", action: "Call", amount: 100 },
              ],
            },
            {
              id: 1,
              street: "Flop",
              cards: ["Qc", "7h", "3d"],
              actions: [
                { action_number: 7, player_id: "player1", action: "Check" },
                { action_number: 8, player_id: "player2", action: "Check" },
              ],
            },
            {
              id: 2,
              street: "Turn",
              cards: ["Qs"],
              actions: [
                { action_number: 9, player_id: "player1", action: "Check" },
                { action_number: 10, player_id: "player2", action: "Check" },
              ],
            },
            {
              id: 3,
              street: "River",
              cards: ["5c"],
              actions: [
                { action_number: 11, player_id: "player1", action: "Check" },
                { action_number: 12, player_id: "player2", action: "Check" },
              ],
            },
            {
              id: 4,
              street: "Showdown",
              actions: [
                { action_number: 13, player_id: "player2", action: "Shows Cards", cards: ["Ah", "Qh"] },
                { action_number: 14, player_id: "player1", action: "Shows Cards", cards: ["7s", "2d"] },
              ],
            },
          ],
          pots: [{ number: 0, amount: 200, player_wins: [{ player_id: "player2", win_amount: 200, contributed_rake: 0 }] }],
        }}
      ></phg-history>
    </div>
  `,
};

// Export test case IDs for Playwright
export const TEST_CASE_IDS = Object.keys(TEST_CASES);

// Parse query params and render
function init() {
  const params = new URLSearchParams(window.location.search);
  const testId = params.get("test");

  const root = document.getElementById("root");

  if (!testId) {
    // Show list of available tests grouped by category
    const categories = {
      Landing: ["landing-page"],
      Lobby: [
        "game-empty-table",
        "game-waiting-for-players",
        "game-ready-to-start",
        "game-countdown",
        "game-buy-in",
      ],
      Preflop: ["game-preflop-your-turn", "game-preflop-waiting"],
      Flop: ["game-flop-check-or-bet", "game-flop-facing-bet"],
      Turn: ["game-turn"],
      River: ["game-river-all-in-decision"],
      Showdown: ["game-showdown-you-win", "game-showdown-you-lose"],
      "Special States": [
        "game-all-in-situation",
        "game-with-folded-players",
        "game-clock-called",
        "game-sitting-out",
        "game-disconnected-player",
        "game-full-table",
      ],
      Errors: ["game-not-found", "game-error"],
      Modals: ["game-rankings-modal"],
      "Hand History": [
        "history-loading",
        "history-empty",
        "history-error",
        "history-preflop-fold",
        "history-showdown-win",
        "history-showdown-lose",
        "history-multiple-hands",
      ],
    };

    root.innerHTML = `
      <div style="font-family: monospace; padding: 20px; max-width: 800px; margin: 0 auto;">
        <h2>UI Catalog - Full Game States</h2>
        <p>Click to view each game state:</p>
        ${Object.entries(categories)
          .map(
            ([category, ids]) => `
          <h3>${category}</h3>
          <ul>
            ${ids.map((id) => `<li><a href="?test=${id}">${id}</a></li>`).join("")}
          </ul>
        `,
          )
          .join("")}
      </div>
    `;
    return;
  }

  const testCase = TEST_CASES[testId];

  if (!testCase) {
    root.innerHTML = `<div style="color: red; padding: 20px;">Unknown test case: ${testId}</div>`;
    return;
  }

  // Render the test case
  render(testCase(), root);
}

init();
