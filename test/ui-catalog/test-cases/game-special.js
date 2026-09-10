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
import { createDefaultTournamentSchedule } from "../../../src/shared/tournament.js";

// === SPECIAL GAME STATE TEST CASES ===

export const SPECIAL_GAME_TEST_CASES = {
  // === SHOWDOWN STATES ===
  "game-showdown-you-win": () => {
    const winningCards = ["Ah", "Kh", "Qh", "Jh", "Th"];
    return gameView(
      createGame({
        button: 1,
        hand: {
          phase: "showdown",
          collectedPot: 0,
          currentBet: 0,
          actingSeat: -1,
        },
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
            actions: [{ action: "emote" }, { action: "chat" }],
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
        hand: {
          phase: "showdown",
          collectedPot: 0,
          currentBet: 0,
          actingSeat: -1,
        },
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
            actions: [{ action: "emote" }, { action: "chat" }],
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

  "game-all-in-situation": () =>
    gameView(
      createGame({
        button: 0,
        hand: {
          phase: "turn",
          collectedPot: 6000,
          currentBet: 0,
          actingSeat: -1,
        },
        board: { cards: ["Js", "Ts", "9h", "2c"] },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            allIn: true,
            stack: 0,
            cards: ["Qs", "8s"],
            handRank: "Straight",
            actions: [{ action: "emote" }, { action: "chat" }],
          }),
          createPlayer("Alice", { allIn: true, stack: 0, cards: ["??", "??"] }),
          ...emptySeats(7),
        ],
      }),
    ),

  "game-with-folded-players": () =>
    gameView(
      createGame({
        button: 1,
        hand: {
          phase: "turn",
          collectedPot: 800,
          currentBet: 200,
          actingSeat: 0,
        },
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
          createPlayer("Alice", {
            folded: true,
            stack: 2800,
            bet: 100,
            cards: [],
          }),
          createPlayer("Bob", {
            stack: 2600,
            bet: 200,
            cards: ["??", "??"],
            lastAction: "Bet $200",
          }),
          createPlayer("Charlie", { folded: true, stack: 3200, cards: [] }),
          ...emptySeats(5),
        ],
      }),
    ),

  "game-clock-called": () =>
    gameView(
      createGame({
        button: 0,
        hand: {
          phase: "flop",
          collectedPot: 300,
          currentBet: 100,
          actingSeat: 1,
          actingTicks: 75,
          clockRemaining: 45,
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
            actions: [{ action: "emote" }, { action: "chat" }],
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

  "game-sitting-out": () =>
    gameView(
      createGame({
        button: 1,
        hand: {
          phase: "preflop",
          collectedPot: 75,
          currentBet: 50,
          actingSeat: 2,
        },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            sittingOut: true,
            stack: 5000,
            cards: [],
            actions: [
              { action: "emote" },
              { action: "chat" },
              { action: "sitIn", cost: 50 },
              { action: "leave" },
            ],
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

  "game-disconnected-player": () =>
    gameView(
      createGame({
        button: 0,
        hand: {
          phase: "flop",
          collectedPot: 200,
          currentBet: 0,
          actingSeat: 0,
        },
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
          ...emptySeats(7),
        ],
      }),
    ),

  "game-full-table": () =>
    gameView(
      createGame({
        button: 0,
        hand: {
          phase: "river",
          collectedPot: 275,
          currentBet: 50,
          actingSeat: 3,
        },
        board: { cards: ["Ah", "Kd", "7c", "3s", "Jh"] },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            stack: 4950,
            bet: 50,
            cards: ["9h", "9d"],
            lastAction: "Call $50",
            handRank: "Pair of Nines",
            actions: [{ action: "emote" }, { action: "chat" }],
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
          createPlayer("Frank", {
            stack: 2200,
            bet: 50,
            cards: ["??", "??"],
            lastAction: "Call $50",
          }),
          createPlayer("Grace", {
            stack: 1800,
            bet: 50,
            cards: ["??", "??"],
            lastAction: "Call $50",
          }),
          createPlayer("Henry", { folded: true, stack: 2500, cards: [] }),
        ],
      }),
    ),
};

// === RANKING MODAL TEST CASES ===

export const RANKING_MODAL_TEST_CASES = {
  "game-rankings-modal": () =>
    gameView(
      createGame({
        tableSize: 6,
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            stack: 11489,
            totalBuyIn: 5000,
            handsPlayed: 158,
          }),
          createPlayer("Voy me voy", {
            stack: 2361,
            totalBuyIn: 5000,
            handsPlayed: 158,
          }),
          createPlayer("Cañas y tapas", {
            stack: 4822,
            totalBuyIn: 5000,
            handsPlayed: 112,
          }),
          createPlayer("Alice", {
            stack: 6750,
            totalBuyIn: 5000,
            handsPlayed: 158,
          }),
          createPlayer("Bob", {
            stack: 3078,
            totalBuyIn: 10000,
            handsPlayed: 95,
          }),
          createPlayer("Moskowski", {
            stack: 9889,
            totalBuyIn: 5000,
            handsPlayed: 158,
          }),
        ],
        rankings: [
          {
            seatIndex: 5,
            playerId: "moskowski",
            playerName: "Moskowski",
            stack: 9889,
            totalBuyIn: 5000,
            netWinnings: 4889,
            handsPlayed: 158,
            winRate: 61.9,
          },
          {
            seatIndex: 0,
            playerId: "you",
            playerName: "You",
            stack: 11489,
            totalBuyIn: 5000,
            netWinnings: 6489,
            handsPlayed: 158,
            winRate: 82.14,
          },
          {
            seatIndex: 3,
            playerId: "alice",
            playerName: "Alice",
            stack: 6750,
            totalBuyIn: 5000,
            netWinnings: 1750,
            handsPlayed: 158,
            winRate: 22.15,
          },
          {
            seatIndex: 2,
            playerId: "canas",
            playerName: "Cañas y tapas",
            stack: 4822,
            totalBuyIn: 5000,
            netWinnings: -178,
            handsPlayed: 112,
            winRate: -3.18,
          },
          {
            seatIndex: 1,
            playerId: "voy",
            playerName: "Voy me voy",
            stack: 2361,
            totalBuyIn: 5000,
            netWinnings: -2639,
            handsPlayed: 158,
            winRate: -33.4,
          },
          {
            seatIndex: 4,
            playerId: "bob",
            playerName: "Bob",
            stack: 3078,
            totalBuyIn: 10000,
            netWinnings: -6922,
            handsPlayed: 95,
            winRate: -145.73,
          },
        ],
      }),
    ),

  "game-rankings-modal-tournament": () =>
    gameView(
      createGame({
        tournament: {
          ...createDefaultTournamentSchedule(),
          level: 3,
          timeToNextLevel: 180,
          onBreak: false,
        },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            stack: 8500,
          }),
          createPlayer("Alice", { stack: 6200 }),
          createPlayer("Bob", { stack: 3100 }),
          ...emptySeats(6),
        ],
        rankings: [
          {
            seatIndex: 0,
            playerId: "you",
            playerName: "You",
            stack: 8500,
            totalBuyIn: 5000,
            netWinnings: 3500,
            handsPlayed: 30,
            winRate: null,
          },
          {
            seatIndex: 1,
            playerId: "alice",
            playerName: "Alice",
            stack: 6200,
            totalBuyIn: 5000,
            netWinnings: 1200,
            handsPlayed: 30,
            winRate: null,
          },
          {
            seatIndex: 2,
            playerId: "bob",
            playerName: "Bob",
            stack: 3100,
            totalBuyIn: 5000,
            netWinnings: -1900,
            handsPlayed: 30,
            winRate: null,
          },
        ],
      }),
    ),

  "game-tournament-levels-modal": () =>
    gameView(
      createGame({
        handNumber: 12,
        blinds: { ante: 0, small: 10000, big: 20000 },
        tournament: {
          ...createDefaultTournamentSchedule(),
          level: 3,
          timeToNextLevel: 180,
          onBreak: false,
        },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            stack: 8500,
          }),
          createPlayer("Alice", { stack: 6200 }),
          createPlayer("Bob", { stack: 3100 }),
          ...emptySeats(6),
        ],
      }),
    ),
};

export const RANKING_MODAL_IDS = Object.keys(RANKING_MODAL_TEST_CASES);

export const SPECIAL_GAME_IDS = [
  "game-all-in-situation",
  "game-with-folded-players",
  "game-clock-called",
  "game-sitting-out",
  "game-disconnected-player",
  "game-full-table",
];
