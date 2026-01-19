/**
 * UI Catalog Test Cases - Special Game States
 *
 * Contains special game state test cases (all-in, folded players, sitting out, etc.)
 * Separated from test-cases.js to keep file sizes under 500 lines.
 */

import {
  emptySeats,
  gameView,
  createGame,
  createPlayer,
} from "./game-helpers.js";

// === SPECIAL GAME STATE TEST CASES ===

export const SPECIAL_GAME_TEST_CASES = {
  "game-all-in-situation": () =>
    gameView(
      createGame({
        button: 0,
        hand: { phase: "turn", pot: 6000, currentBet: 0, actingSeat: -1 },
        board: { cards: ["Js", "Ts", "9h", "2c"] },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            allIn: true,
            stack: 0,
            cards: ["Qs", "8s"],
            handRank: "Straight",
          }),
          createPlayer("Alice", { allIn: true, stack: 0, cards: ["??", "??"] }),
          ...emptySeats(4),
        ],
      }),
    ),

  "game-with-folded-players": () =>
    gameView(
      createGame({
        button: 0,
        hand: { phase: "turn", pot: 800, currentBet: 200, actingSeat: 0 },
        board: { cards: ["Ah", "Kd", "7c", "3s"] },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            isActing: true,
            stack: 4500,
            cards: ["As", "Qs"],
            actions: [
              { action: "fold" },
              { action: "call", amount: 200 },
              { action: "raise", min: 400, max: 4500 },
            ],
            handRank: "Pair of Aces",
          }),
          createPlayer("Alice", { folded: true, stack: 2800, cards: [] }),
          createPlayer("Bob", {
            stack: 2600,
            bet: 200,
            cards: ["??", "??"],
            lastAction: "Bet $200",
          }),
          createPlayer("Charlie", { folded: true, stack: 3200, cards: [] }),
          ...emptySeats(2),
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
          actingTicks: 75,
          clockTicks: 15,
        },
        board: { cards: ["Jh", "Td", "5c"] },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            stack: 4900,
            bet: 100,
            cards: ["As", "Ks"],
            lastAction: "Call $100",
            handRank: "A High",
          }),
          createPlayer("Alice", {
            isActing: true,
            stack: 2800,
            bet: 100,
            cards: ["??", "??"],
          }),
          ...emptySeats(4),
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
            cards: [],
            actions: [{ action: "sitIn", cost: 50 }, { action: "leave" }],
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
          }),
          ...emptySeats(3),
        ],
      }),
    ),

  "game-disconnected-player": () =>
    gameView(
      createGame({
        button: 0,
        hand: { phase: "flop", pot: 200, currentBet: 0, actingSeat: 0 },
        board: { cards: ["Ah", "Kd", "7c"] },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            isActing: true,
            stack: 4900,
            cards: ["Qh", "Jh"],
            actions: [
              { action: "check" },
              { action: "bet", min: 50, max: 4900 },
            ],
            handRank: "Q High",
          }),
          createPlayer("Alice", {
            disconnected: true,
            stack: 2900,
            cards: ["??", "??"],
          }),
          ...emptySeats(4),
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
            cards: ["9h", "9d"],
            lastAction: "Call $50",
            handRank: "Pair of Nines",
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
          createPlayer("Charlie", {
            isActing: true,
            stack: 3000,
            cards: ["??", "??"],
          }),
          createPlayer("Diana", {
            stack: 1500,
            bet: 50,
            cards: ["??", "??"],
            lastAction: "Call $50",
          }),
          createPlayer("Eve", { sittingOut: true, stack: 2000, cards: [] }),
        ],
      }),
    ),
};

export const SPECIAL_GAME_IDS = [
  "game-all-in-situation",
  "game-with-folded-players",
  "game-clock-called",
  "game-sitting-out",
  "game-disconnected-player",
  "game-full-table",
];
