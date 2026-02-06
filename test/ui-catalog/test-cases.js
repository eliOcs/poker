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
import "/src/frontend/toast.js";
import { HISTORY_TEST_CASES, HISTORY_CATEGORY } from "./test-cases-history.js";
import {
  emptySeat,
  emptySeats,
  emptyTableSeats,
  gameView,
  gameViewWithToast,
  createGame,
  createPlayer,
} from "./test-cases/game-helpers.js";
import {
  SPECIAL_GAME_TEST_CASES,
  SPECIAL_GAME_IDS,
  RANKING_MODAL_TEST_CASES,
  RANKING_MODAL_IDS,
} from "./test-cases/game-special.js";
import {
  TABLE_SIZE_TEST_CASES,
  TABLE_SIZE_IDS,
} from "./test-cases/table-sizes.js";

// === GAME TEST CASES ===

const GAME_TEST_CASES = {
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
            actions: [{ action: "sitOut" }],
          }),
          ...emptyTableSeats().slice(1),
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
          ...emptySeats(2),
          createPlayer("Alice", { stack: 3000 }),
          ...emptySeats(5),
        ],
      }),
    ),

  "game-countdown": () =>
    gameView(
      createGame({
        countdown: 3,
        button: 2,
        seats: [
          ...emptySeats(2),
          createPlayer("You", { isCurrentPlayer: true, stack: 5000 }),
          ...emptySeats(2),
          createPlayer("Alice", { stack: 3000 }),
          ...emptySeats(3),
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
            cards: ["As", "Ks"],
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
            cards: ["??", "??"],
            lastAction: "SB $25",
          }),
          createPlayer("Bob", {
            stack: 2950,
            bet: 50,
            cards: ["??", "??"],
            lastAction: "BB $50",
          }),
          ...emptySeats(6),
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
            cards: ["Qh", "Jh"],
            lastAction: "Call $50",
            handRank: "Q High",
          }),
          createPlayer("Alice", {
            stack: 2975,
            bet: 25,
            cards: ["??", "??"],
            lastAction: "SB $25",
          }),
          createPlayer("Bob", {
            isActing: true,
            stack: 2950,
            bet: 50,
            cards: ["??", "??"],
            actions: [{ action: "callClock" }],
          }),
          ...emptySeats(6),
        ],
      }),
    ),

  // === FLOP STATES ===
  "game-flop-check-or-bet": () =>
    gameView(
      createGame({
        button: 0,
        hand: { phase: "flop", pot: 150, currentBet: 0, actingSeat: 0 },
        board: { cards: ["Ah", "Kd", "7c"] },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            isActing: true,
            stack: 4950,
            cards: ["As", "Ks"],
            actions: [
              { action: "check" },
              { action: "bet", min: 50, max: 4950 },
            ],
            handRank: "Two Pair, Aces and Kings",
          }),
          createPlayer("Alice", { stack: 2950, cards: ["??", "??"] }),
          ...emptySeats(7),
        ],
      }),
    ),

  "game-flop-facing-bet": () =>
    gameView(
      createGame({
        button: 1,
        hand: { phase: "flop", pot: 350, currentBet: 200, actingSeat: 0 },
        board: { cards: ["Th", "Jh", "3c"] },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            isActing: true,
            stack: 4800,
            cards: ["Qh", "9h"],
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
            cards: ["??", "??"],
            lastAction: "Bet $200",
          }),
          ...emptySeats(7),
        ],
      }),
    ),

  // === TURN STATES ===
  "game-turn": () =>
    gameView(
      createGame({
        button: 0,
        hand: { phase: "turn", pot: 600, currentBet: 0, actingSeat: 1 },
        board: { cards: ["Ah", "Kd", "7c", "2s"] },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            stack: 4700,
            cards: ["As", "Qs"],
            handRank: "Pair of Aces",
          }),
          createPlayer("Alice", {
            isActing: true,
            stack: 2700,
            cards: ["??", "??"],
            actions: [{ action: "callClock" }],
          }),
          ...emptySeats(7),
        ],
      }),
    ),

  // === RIVER STATES ===
  "game-river-all-in-decision": () =>
    gameView(
      createGame({
        button: 1,
        hand: { phase: "river", pot: 2400, currentBet: 1200, actingSeat: 0 },
        board: { cards: ["Ah", "Kh", "Qh", "5c", "2d"] },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            isActing: true,
            stack: 3600,
            cards: ["Jh", "Th"],
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
            cards: ["??", "??"],
            lastAction: "Bet $1200",
          }),
          ...emptySeats(7),
        ],
      }),
    ),

  // === SHOWDOWN STATES ===
  "game-showdown-you-win": () => {
    const winningCards = ["Ah", "Kh", "Qh", "Jh", "Th"];
    return gameView(
      createGame({
        button: 1,
        hand: { phase: "showdown", pot: 0, currentBet: 0, actingSeat: -1 },
        board: { cards: ["Ah", "Kh", "Qh", "5c", "2d"] },
        winnerMessage: {
          playerName: "You",
          handRank: "Royal Flush",
          amount: 4800,
        },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            stack: 9800,
            cards: ["Jh", "Th"],
            handResult: 4800,
            handRank: "Royal Flush",
            winningCards,
          }),
          createPlayer("Alice", {
            stack: 200,
            cards: ["As", "Ad"],
            handResult: -4800,
            handRank: "Three of a Kind, Aces",
          }),
          ...emptySeats(7),
        ],
      }),
    );
  },

  "game-showdown-you-lose": () =>
    gameView(
      createGame({
        button: 0,
        hand: { phase: "showdown", pot: 0, currentBet: 0, actingSeat: -1 },
        board: { cards: ["Ah", "Ac", "Kd", "5c", "2d"] },
        winnerMessage: {
          playerName: "Alice",
          handRank: "Four of a Kind, Aces",
          amount: 4000,
        },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            stack: 1000,
            cards: ["Ks", "Kc"],
            handResult: -2000,
            handRank: "Full House, Kings over Aces",
          }),
          createPlayer("Alice", {
            stack: 7000,
            cards: ["As", "Ad"],
            handResult: 4000,
            handRank: "Four of a Kind, Aces",
            winningCards: ["Ah", "Ac", "As", "Ad", "Kd"],
          }),
          ...emptySeats(7),
        ],
      }),
    ),

  // === BUY-IN STATE ===
  "game-buy-in": () =>
    gameView(
      createGame({
        seats: [
          emptySeat,
          createPlayer("Alice", { stack: 3000 }),
          ...emptySeats(2),
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
          ...emptySeats(4),
        ],
      }),
    ),

  // === ERROR STATES ===
  "game-error": () =>
    gameViewWithToast(
      createGame({
        seats: [
          createPlayer("You", { isCurrentPlayer: true, stack: 5000 }),
          ...emptySeats(3),
          createPlayer("Alice", { stack: 3000 }),
          ...emptySeats(4),
        ],
      }),
      "Insufficient funds to make that bet",
    ),

  // === MODAL STATES ===
  "game-settings-modal": () =>
    gameView(
      createGame({
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            stack: 5000,
          }),
          createPlayer("Alice", { stack: 3000 }),
          ...emptySeats(7),
        ],
      }),
      { showSettings: true },
    ),
};

// Merge all test cases
const TEST_CASES = {
  ...GAME_TEST_CASES,
  ...SPECIAL_GAME_TEST_CASES,
  ...RANKING_MODAL_TEST_CASES,
  ...TABLE_SIZE_TEST_CASES,
  ...HISTORY_TEST_CASES,
};

// Export test case IDs for Playwright
export const TEST_CASE_IDS = Object.keys(TEST_CASES);

// Category definitions for navigation
const CATEGORIES = {
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
  "Special States": SPECIAL_GAME_IDS,
  "Table Sizes": TABLE_SIZE_IDS,
  Errors: ["game-not-found", "game-error"],
  Modals: [...RANKING_MODAL_IDS, "game-settings-modal"],
  [HISTORY_CATEGORY.name]: HISTORY_CATEGORY.ids,
};

// Parse query params and render
function init() {
  const params = new URLSearchParams(window.location.search);
  const testId = params.get("test");
  const root = document.getElementById("root");

  if (!testId) {
    root.innerHTML = `
      <div style="font-family: monospace; padding: 20px; max-width: 800px; margin: 0 auto;">
        <h2>UI Catalog - Full Game States</h2>
        <p>Click to view each game state:</p>
        ${Object.entries(CATEGORIES)
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

  render(testCase(), root);
}

init();
