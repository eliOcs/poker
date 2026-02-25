/**
 * UI Catalog Test Cases - Action Panel States
 *
 * Covers all distinct action panel rendering states.
 * Separated from test-cases.js to keep file sizes under 500 lines.
 */

import {
  emptySeats,
  gameView,
  createGame,
  createPlayer,
} from "./game-helpers.js";

export const ACTION_PANEL_TEST_CASES = {
  // Sit In / Leave Table buttons (sitting out)
  "action-sit-in": () =>
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
          ...emptySeats(6),
        ],
      }),
    ),

  // Bet action with postflop presets (Min/½Pot/Pot/Max), slider, Fold/Check/Bet
  "action-bet": () =>
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

  // Raise action with postflop presets, slider, Fold/Call/Raise
  "action-raise": () =>
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

  // Raise action with preflop presets (Min/2.5BB/3BB/Max) when pot=0
  "action-raise-preflop": () =>
    gameView(
      createGame({
        button: 1,
        hand: { phase: "preflop", pot: 0, currentBet: 50, actingSeat: 0 },
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

  // Raise where max equals current value — shows "All-In" button
  "action-all-in": () =>
    gameView(
      createGame({
        button: 1,
        hand: { phase: "river", pot: 4000, currentBet: 2000, actingSeat: 0 },
        board: { cards: ["Ah", "Kd", "7c", "3s", "Jh"] },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            isActing: true,
            stack: 500,
            cards: ["Qh", "Jd"],
            actions: [
              { action: "fold" },
              { action: "call", amount: 500 },
              { action: "raise", min: 500, max: 500 },
            ],
            handRank: "Pair of Jacks",
          }),
          createPlayer("Alice", {
            stack: 1500,
            bet: 2000,
            cards: ["??", "??"],
            lastAction: "Bet $2000",
          }),
          ...emptySeats(7),
        ],
      }),
    ),

  // Only fold + call (no raise) — simple action buttons
  "action-fold-or-call": () =>
    gameView(
      createGame({
        button: 1,
        hand: { phase: "river", pot: 3000, currentBet: 1500, actingSeat: 0 },
        board: { cards: ["Ah", "Kd", "7c", "3s", "Jh"] },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            isActing: true,
            stack: 200,
            cards: ["9h", "9d"],
            actions: [{ action: "fold" }, { action: "call", amount: 200 }],
            handRank: "Pair of Nines",
          }),
          createPlayer("Alice", {
            stack: 2800,
            bet: 1500,
            cards: ["??", "??"],
            lastAction: "Bet $1500",
          }),
          ...emptySeats(7),
        ],
      }),
    ),

  // Emote + Call Clock actions (waiting with clock available)
  "action-emote-and-clock": () =>
    gameView(
      createGame({
        button: 0,
        hand: { phase: "flop", pot: 300, currentBet: 100, actingSeat: 1 },
        board: { cards: ["Jh", "Td", "5c"] },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            stack: 4900,
            bet: 100,
            cards: ["As", "Ks"],
            lastAction: "Call $100",
            handRank: "A High",
            actions: [{ action: "emote" }, { action: "callClock" }],
          }),
          createPlayer("Alice", {
            isActing: true,
            stack: 2800,
            bet: 100,
            cards: ["??", "??"],
          }),
          ...emptySeats(7),
        ],
      }),
    ),

  // Show card actions with card visuals
  "action-show-cards": () =>
    gameView(
      createGame({
        button: 0,
        hand: { phase: "river", pot: 1200, currentBet: 0, actingSeat: 1 },
        board: { cards: ["Ah", "Kd", "7c", "3s", "Jh"] },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            folded: true,
            stack: 4700,
            cards: ["Qs", "Jd"],
            handRank: "Pair of Jacks",
            actions: [
              { action: "showCard1", cards: ["Qs"] },
              { action: "showCard2", cards: ["Jd"] },
              { action: "showBothCards", cards: ["Qs", "Jd"] },
            ],
          }),
          createPlayer("Alice", {
            isActing: true,
            stack: 2400,
            cards: ["??", "??"],
          }),
          ...emptySeats(7),
        ],
      }),
    ),

  // Tournament winner — "You've won!"
  "action-tournament-winner": () =>
    gameView(
      createGame({
        tournament: { level: 5, timeToNextLevel: 0, onBreak: false, winner: 0 },
        hand: { phase: "showdown", pot: 0, currentBet: 0, actingSeat: -1 },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            stack: 15000,
            actions: [],
          }),
          ...emptySeats(8),
        ],
      }),
    ),

  // Tournament busted — "You finished in Xth place"
  "action-tournament-busted": () =>
    gameView(
      createGame({
        tournament: { level: 5, timeToNextLevel: 0, onBreak: false },
        hand: { phase: "showdown", pot: 0, currentBet: 0, actingSeat: -1 },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            stack: 0,
            bustedPosition: 3,
            actions: [],
          }),
          createPlayer("Alice", { stack: 8000, cards: ["??", "??"] }),
          createPlayer("Bob", { stack: 7000, cards: ["??", "??"] }),
          ...emptySeats(6),
        ],
      }),
    ),
};
