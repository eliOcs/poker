/** A learner's private table against bots: bot badges, BB amounts, no blinds. */
import { renderGameView } from "/src/frontend/app-render.js";
import { createGame, createPlayer } from "./game-helpers.js";

/** @param {string} name */
function bot(name, overrides = {}) {
  const seat = createPlayer(name, { stack: 10000, cards: ["??", "??"] });
  seat.player = { ...seat.player, bot: true };
  return Object.assign(seat, overrides);
}

/**
 * @param {string} playerName
 * @param {number} seatIndex
 * @param {number} netWinnings
 * @param {number} winRate
 */
function ranking(playerName, seatIndex, netWinnings, winRate) {
  return {
    seatIndex,
    playerId: playerName.toLowerCase(),
    playerName,
    stack: 10000,
    totalBuyIn: 10000 - netWinnings,
    netWinnings,
    handsPlayed: 124,
    winRate,
  };
}

/** @param {object} game */
function botTableView(game) {
  return renderGameView(
    {
      game,
      gameConnectionStatus: "connected",
      socialAction: undefined,
      user: undefined,
    },
    { kind: "bots", tableId: "test123" },
  );
}

export const BOT_TABLE_TEST_CASES = {
  // Stacks reset to 100 BB, so the rankings carry the session's result in BB.
  "game-bots-rankings-modal": () =>
    botTableView(
      createGame({
        blinds: { ante: 0, small: 50, big: 100 },
        seats: [
          createPlayer("You", { isCurrentPlayer: true, stack: 10000 }),
          bot("Ada"),
          bot("Chip"),
          bot("Pixel"),
          bot("Turing"),
          bot("Volt"),
        ],
        rankings: [
          ranking("Chip", 2, 4275, 34.48),
          ranking("You", 0, 1550, 12.5),
          ranking("Volt", 5, 25, 0.2),
          ranking("Ada", 1, -650, -5.24),
          ranking("Turing", 4, -1850, -14.92),
          ranking("Pixel", 3, -3350, -27.02),
        ],
      }),
    ),

  "game-bots-table": () =>
    botTableView(
      createGame({
        button: 3,
        blinds: { ante: 0, small: 50, big: 100 },
        hand: {
          phase: "preflop",
          collectedPot: 0,
          currentBet: 300,
          actingSeat: 0,
        },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            isActing: true,
            stack: 10000,
            cards: ["Qh", "Qd"],
            actions: [
              { action: "fold" },
              { action: "call", amount: 300 },
              { action: "raise", min: 500, max: 10000, step: 50 },
              { action: "emote" },
              { action: "chat" },
            ],
            handRank: "Pair of Queens",
          }),
          bot("Ada", { folded: true, cards: [], lastAction: "fold" }),
          bot("Chip", { stack: 9700, bet: 300, lastAction: "raise" }),
          bot("Pixel", { folded: true, cards: [], lastAction: "fold" }),
          bot("Turing", { stack: 9950, bet: 50 }),
          bot("Volt", { stack: 9900, bet: 100 }),
        ],
      }),
    ),
};
