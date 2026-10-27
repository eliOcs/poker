/** A learner's private table against bots: bot badges, BB amounts, no blinds. */
import { renderGameView } from "/src/frontend/app-render.js";
import { createGame, createPlayer } from "./game-helpers.js";

/** @param {string} name */
function bot(name, overrides = {}) {
  const seat = createPlayer(name, { stack: 10000, cards: ["??", "??"] });
  seat.player = { ...seat.player, bot: true };
  return Object.assign(seat, overrides);
}

export const BOT_TABLE_TEST_CASES = {
  "game-bots-table": () =>
    renderGameView(
      {
        game: createGame({
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
        gameConnectionStatus: "connected",
        socialAction: undefined,
        user: undefined,
      },
      { kind: "bots", tableId: "test123" },
    ),
};
