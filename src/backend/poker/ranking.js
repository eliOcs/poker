/**
 * @typedef {import('./game.js').Game} Game
 * @typedef {import('./seat.js').OccupiedSeat} OccupiedSeat
 */

/**
 * @typedef {object} PlayerRanking
 * @property {number} seatIndex - Seat index
 * @property {string} playerId - Player ID
 * @property {string|null} playerName - Player display name
 * @property {number} stack - Current stack
 * @property {number} totalBuyIn - Total buy-ins
 * @property {number} netWinnings - Current stack minus total buy-ins
 * @property {number} handsPlayed - Number of hands played
 * @property {number|null} winRate - BB/100 win rate (null if < 10 hands)
 */

/**
 * Computes player rankings for the game
 * @param {Game} game
 * @returns {PlayerRanking[]} - Players sorted by net winnings (descending)
 */
export function computeRankings(game) {
  const rankings = [];
  const bigBlind = game.blinds.big;

  for (let i = 0; i < game.seats.length; i++) {
    const seat = game.seats[i];
    if (seat.empty) continue;

    const occupiedSeat = /** @type {OccupiedSeat} */ (seat);
    const netWinnings = occupiedSeat.stack - occupiedSeat.totalBuyIn;

    // Calculate BB/100: (netWinnings / bigBlind) / (handsPlayed / 100)
    // Only calculate if >= 10 hands played (statistically meaningful)
    let winRate = null;
    if (occupiedSeat.handsPlayed >= 10 && bigBlind > 0) {
      const bbWon = netWinnings / bigBlind;
      winRate = (bbWon / occupiedSeat.handsPlayed) * 100;
    }

    rankings.push({
      seatIndex: i,
      playerId: occupiedSeat.player.id,
      playerName: occupiedSeat.player.name,
      stack: occupiedSeat.stack,
      totalBuyIn: occupiedSeat.totalBuyIn,
      netWinnings,
      handsPlayed: occupiedSeat.handsPlayed,
      winRate,
    });
  }

  // Sort by net winnings (highest first)
  rankings.sort((a, b) => b.netWinnings - a.netWinnings);

  return rankings;
}
