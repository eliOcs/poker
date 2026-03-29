import * as Store from "../../src/backend/store.js";

/**
 * @param {string} gameId
 * @param {number} handNumber
 * @param {number} potAmount
 * @param {Array<object>} actions
 * @param {Array<object>} playerWins
 * @returns {import('../../src/backend/poker/hand-history/index.js').OHHHand}
 */
export function createHand(gameId, handNumber, potAmount, actions, playerWins) {
  return {
    spec_version: "1.4.6",
    site_name: "Pluton Poker",
    game_number: `${gameId}-${handNumber}`,
    start_date_utc: `2026-03-0${handNumber}T12:00:00.000Z`,
    game_type: "Hold'em",
    bet_limit: { bet_type: "NL" },
    table_size: 6,
    dealer_seat: 1,
    small_blind_amount: 0.25,
    big_blind_amount: 0.5,
    ante_amount: 0,
    players: [
      { id: "player1", seat: 1, name: "Alice", starting_stack: 10 },
      { id: "player2", seat: 2, name: "Bob", starting_stack: 10 },
    ],
    rounds: [{ id: 1, street: "Preflop", actions }],
    pots: [
      {
        number: 1,
        amount: potAmount,
        winning_hand: null,
        player_wins: playerWins,
      },
    ],
  };
}

/**
 * @param {import('../../src/backend/poker/hand-history/index.js').OHHHand} hand
 * @param {string} gameId
 */
export function recordHandPlayers(hand, gameId) {
  Store.recordPlayerTableActivity(
    hand.players.map((player) => ({
      playerId: player.id,
      tableId: gameId,
      tournamentId: hand?.tournament_info?.type === "MTT" ? gameId : null,
      lastHandNumber: parseInt(hand.game_number.split("-").pop() || "0", 10),
      lastPlayedAt: hand.start_date_utc,
    })),
  );
}
