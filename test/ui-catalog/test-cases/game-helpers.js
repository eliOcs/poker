/**
 * UI Catalog Test Cases - Game Helper Factories
 *
 * Contains helper functions and factories for creating game test cases.
 * Separated from test-cases.js to keep file sizes under 500 lines.
 */

import { html } from "lit";
import { mockEmptySeat } from "/fixtures.js";

// === HELPER FACTORIES ===

// Empty seat with no actions (used when player cannot sit)
export const emptySeat = { ...mockEmptySeat, actions: [] };

// Create array of empty seats with no actions
export const emptySeats = (count) => Array(count).fill(emptySeat);

// Create 9 empty seats with sit actions (default table)
export const emptyTableSeats = () =>
  Array.from({ length: 9 }, (_, i) => ({
    ...mockEmptySeat,
    actions: [{ action: "sit", seat: i }],
  }));

// Helper to create a game component with mock data
export function gameView(gameState, options = {}) {
  const { showRanking = false, showSettings = false, volume = 0.75 } = options;
  return html`
    <div style="height: 100vh; width: 100%;">
      <phg-game
        .game=${gameState}
        .socket=${{ readyState: 1 }}
        .showRanking=${showRanking}
        .showSettings=${showSettings}
        .volume=${volume}
      ></phg-game>
    </div>
  `;
}

// Helper to show a game with a toast overlay
export function gameViewWithToast(
  gameState,
  toastMessage,
  toastVariant = "error",
) {
  return html`
    <div style="height: 100vh; width: 100%;">
      <phg-toast
        variant=${toastVariant}
        .duration=${0}
        message=${toastMessage}
      ></phg-toast>
      <phg-game .game=${gameState} .socket=${{ readyState: 1 }}></phg-game>
    </div>
  `;
}

// Base game state factory
export function createGame(overrides = {}) {
  return {
    running: true,
    button: 0,
    blinds: { ante: 0, small: 25, big: 50 },
    board: { cards: [] },
    hand: { phase: "waiting", pot: 0, currentBet: 0, actingSeat: -1 },
    countdown: null,
    winnerMessage: null,
    rankings: [],
    seats: emptyTableSeats(),
    ...overrides,
  };
}

// Player seat factory
export function createPlayer(name, overrides = {}) {
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
