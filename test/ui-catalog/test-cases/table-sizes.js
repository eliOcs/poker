/**
 * UI Catalog Test Cases - Table Sizes
 *
 * Test cases for different table configurations:
 * - Heads Up (2 players)
 * - 6-Max (6 players)
 * - Full Ring (9 players)
 *
 * All tables are full with active betting to visualize bet positioning.
 */

import { gameView, createGame, createPlayer } from "./game-helpers.js";

export const TABLE_SIZE_TEST_CASES = {
  "table-heads-up": () =>
    gameView(
      createGame({
        button: 0,
        hand: { phase: "flop", pot: 400, currentBet: 150, actingSeat: 0 },
        board: { cards: ["Ah", "Kd", "7c"] },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            isActing: true,
            stack: 4850,
            bet: 50,
            cards: ["As", "Qs"],
            actions: [
              { action: "fold" },
              { action: "call", amount: 100 },
              { action: "raise", min: 250, max: 4850 },
            ],
            handRank: "Pair of Aces",
            lastAction: "BB $50",
          }),
          createPlayer("Villain", {
            stack: 4700,
            bet: 150,
            cards: ["??", "??"],
            lastAction: "Raise $150",
          }),
        ],
      }),
    ),

  "table-6max": () =>
    gameView(
      createGame({
        button: 0,
        hand: { phase: "flop", pot: 600, currentBet: 200, actingSeat: 0 },
        board: { cards: ["Jh", "Td", "5c"] },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            isActing: true,
            stack: 4800,
            bet: 50,
            cards: ["Qh", "Jd"],
            actions: [
              { action: "fold" },
              { action: "call", amount: 150 },
              { action: "raise", min: 350, max: 4800 },
            ],
            handRank: "Pair of Jacks",
            lastAction: "BB $50",
          }),
          createPlayer("UTG", {
            stack: 4800,
            bet: 200,
            cards: ["??", "??"],
            lastAction: "Raise $200",
          }),
          createPlayer("MP", {
            stack: 4800,
            bet: 200,
            cards: ["??", "??"],
            lastAction: "Call $200",
          }),
          createPlayer("CO", {
            folded: true,
            stack: 5000,
            cards: [],
          }),
          createPlayer("BTN", {
            stack: 4975,
            bet: 25,
            cards: ["??", "??"],
            lastAction: "SB $25",
          }),
          createPlayer("SB", {
            stack: 4950,
            bet: 50,
            cards: ["??", "??"],
            lastAction: "Call $50",
          }),
        ],
      }),
    ),

  "table-full-ring": () =>
    gameView(
      createGame({
        button: 0,
        hand: { phase: "flop", pot: 1025, currentBet: 200, actingSeat: 0 },
        board: { cards: ["9h", "8d", "2c"] },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            isActing: true,
            stack: 4800,
            bet: 50,
            cards: ["Th", "Ts"],
            actions: [
              { action: "fold" },
              { action: "call", amount: 150 },
              { action: "raise", min: 350, max: 4800 },
            ],
            handRank: "Pair of Tens",
            lastAction: "BB $50",
          }),
          createPlayer("UTG", {
            stack: 4800,
            bet: 200,
            cards: ["??", "??"],
            lastAction: "Raise $200",
          }),
          createPlayer("UTG+1", {
            folded: true,
            stack: 5000,
            cards: [],
          }),
          createPlayer("MP", {
            stack: 4800,
            bet: 200,
            cards: ["??", "??"],
            lastAction: "Call $200",
          }),
          createPlayer("MP+1", {
            folded: true,
            stack: 5000,
            cards: [],
          }),
          createPlayer("HJ", {
            stack: 4800,
            bet: 200,
            cards: ["??", "??"],
            lastAction: "Call $200",
          }),
          createPlayer("CO", {
            folded: true,
            stack: 5000,
            cards: [],
          }),
          createPlayer("BTN", {
            stack: 4975,
            bet: 25,
            cards: ["??", "??"],
            lastAction: "SB $25",
          }),
          createPlayer("SB", {
            stack: 4950,
            bet: 50,
            cards: ["??", "??"],
            lastAction: "Call $50",
          }),
        ],
      }),
    ),
};

export const TABLE_SIZE_IDS = [
  "table-heads-up",
  "table-6max",
  "table-full-ring",
];
