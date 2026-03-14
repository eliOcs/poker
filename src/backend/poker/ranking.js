import { calculatePrizes } from "../../shared/tournament.js";

/**
 * @typedef {import('./types.js').Cents} Cents
 * @typedef {import('./game.js').Game} Game
 * @typedef {import('./seat.js').OccupiedSeat} OccupiedSeat
 */

/**
 * @typedef {object} PlayerRanking
 * @property {number} seatIndex - Seat index
 * @property {string} playerId - Player ID
 * @property {string|undefined} playerName - Player display name
 * @property {Cents} stack - Current stack
 * @property {number|null} bustedPosition - Tournament finishing position (null if still alive)
 * @property {Cents} totalBuyIn - Total buy-ins
 * @property {Cents} netWinnings - Current stack minus total buy-ins
 * @property {number} handsPlayed - Number of hands played
 * @property {number|null} winRate - BB/100 win rate (null if < 10 hands)
 */

/**
 * Tournament ranking comparator.
 * Non-busted players rank ahead of busted players.
 * Busted players are ordered by bustedPosition (2nd before 3rd, etc).
 * @param {PlayerRanking} a
 * @param {PlayerRanking} b
 * @returns {number}
 */
function compareTournamentRankings(a, b) {
  const aBusted = a.bustedPosition != null;
  const bBusted = b.bustedPosition != null;
  const aPosition = a.bustedPosition;
  const bPosition = b.bustedPosition;

  if (
    aBusted &&
    bBusted &&
    aPosition != null &&
    bPosition != null &&
    aPosition !== bPosition
  ) {
    return aPosition - bPosition;
  } else if (aBusted !== bBusted) {
    return aBusted ? 1 : -1;
  }

  if (a.stack !== b.stack) {
    return b.stack - a.stack;
  }

  return a.seatIndex - b.seatIndex;
}

/**
 * Computes player rankings for the game
 * @param {Game} game
 * @returns {PlayerRanking[]} - Players sorted by net winnings (descending)
 */
export function computeRankings(game) {
  const rankings = [];
  const bigBlind = game.blinds.big;

  for (let i = 0; i < game.seats.length; i++) {
    const seat = /** @type {import('./seat.js').Seat} */ (game.seats[i]);
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
      bustedPosition: occupiedSeat.bustedPosition,
      totalBuyIn: occupiedSeat.totalBuyIn,
      netWinnings,
      handsPlayed: occupiedSeat.handsPlayed,
      winRate,
    });
  }

  // Tournaments: sort by alive stack, then busted finish position
  // Cash games: sort by net winnings (highest first)
  if (game.tournament?.active) {
    rankings.sort(compareTournamentRankings);

    if (game.tournament.kind !== "mtt") {
      const prizes = calculatePrizes(rankings.length, game.tournament.buyIn);
      const prizeByPosition = new Map(
        prizes.map((p) => [p.position, p.amount]),
      );

      for (let i = 0; i < rankings.length; i++) {
        const prize = prizeByPosition.get(i + 1) ?? 0;
        /** @type {(typeof rankings)[number]} */ (rankings[i]).netWinnings =
          prize - game.tournament.buyIn;
      }
    }
  } else {
    rankings.sort((a, b) => b.netWinnings - a.netWinnings);
  }

  return rankings;
}
