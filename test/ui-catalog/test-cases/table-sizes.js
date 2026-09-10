/** Crowded tables with a fixed mix of visible avatars and hole cards. */
import { gameView, createGame, createPlayer } from "./game-helpers.js";

const HOLE_CARDS = [
  ["As", "Ad"],
  ["Ks", "Kc"],
  ["Qs", "Qd"],
  ["Js", "Jc"],
  ["Ts", "Td"],
  ["9s", "9c"],
  ["8s", "8d"],
  ["7s", "7c"],
  ["6s", "6d"],
];

function riverPlayer(index, hero, size) {
  const isCurrentPlayer = index === hero;
  const isRaiser = index === size - 1;
  // Leave alternating opponents' avatars uncovered for layout comparisons.
  const opponentCards = index % 2 === 0 ? [] : ["??", "??"];
  return createPlayer(isCurrentPlayer ? "You" : `Player ${index + 1}`, {
    isCurrentPlayer,
    isActing: isCurrentPlayer,
    stack: 123456 + index * 100,
    bet: isRaiser ? 12575 : 12500,
    cards: isCurrentPlayer ? HOLE_CARDS[index] : opponentCards,
    lastAction: isRaiser ? "Raise $125.75" : "Call $125",
    handRank: isCurrentPlayer
      ? size === 2
        ? "Three Kings"
        : "One Pair"
      : null,
    actions: isCurrentPlayer
      ? [
          { action: "fold" },
          { action: "call", amount: 75 },
          { action: "raise", min: 12650, max: 123456 + index * 100 },
        ]
      : [],
  });
}

function crowdedTable(size, showdown = false) {
  const hero = Math.floor(size / 2);
  const seats = Array.from({ length: size }, (_, index) => {
    const seat = riverPlayer(index, hero, size);
    if (!showdown) return seat;
    const showsCards = index === 0 || seat.cards.length > 0;
    return {
      ...seat,
      isActing: false,
      bet: 0,
      cards: showsCards ? HOLE_CARDS[index] : [],
      lastAction: null,
      actions: seat.isCurrentPlayer
        ? [{ action: "emote" }, { action: "chat" }]
        : [],
      handResult: index === 0 ? (size - 1) * 15000 : -15000,
      handRank: showsCards
        ? [
            "Three Aces",
            "Three Kings",
            "Three Queens",
            "Pair of Jacks",
            "Pair of Tens",
            "Pair of Nines",
            "Pair of Eights",
            "Pair of Sevens",
            "Pair of Sixes",
          ][index]
        : null,
    };
  });
  return gameView(
    createGame({
      button: size - 1,
      board: { cards: ["Ah", "Kh", "Qh", "5c", "2d"] },
      hand: {
        phase: showdown ? "showdown" : "river",
        pot: size * 15000,
        currentBet: showdown ? 0 : 12575,
        actingSeat: showdown ? -1 : hero,
        clockRemaining: showdown ? undefined : 18,
      },
      winnerMessage: showdown
        ? {
            playerName: "Player 1",
            handRank: "Three Aces",
            amount: size * 15000,
          }
        : null,
      seats,
    }),
  );
}

export const TABLE_SIZE_TEST_CASES = {
  "table-heads-up": () => crowdedTable(2),
  "table-6max": () => crowdedTable(6),
  "table-full-ring": () => crowdedTable(9),
  "table-heads-up-showdown": () => crowdedTable(2, true),
  "table-6max-showdown": () => crowdedTable(6, true),
  "table-full-ring-showdown": () => crowdedTable(9, true),
};

export const TABLE_SIZE_IDS = Object.keys(TABLE_SIZE_TEST_CASES);
