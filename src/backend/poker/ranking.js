import { calculatePrizesFromPool } from "../../shared/tournament.js";

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
 * @property {number} [bustedPosition] - Tournament finishing position
 * @property {Cents} totalBuyIn - Total buy-ins
 * @property {Cents} netWinnings - Current stack minus total buy-ins
 * @property {number} handsPlayed - Number of hands played
 * @property {number} [winRate] - BB/100 win rate when enough hands are available
 */

/**
 * @typedef {object} TournamentEntry
 * @property {Cents} stack - Chips now; zero once out
 * @property {number} entries - Buy-ins paid: the first plus every rebuy
 * @property {number} [finishPosition] - Set once the player is out (or won)
 */

/**
 * Ranks a tournament field and projects each player's result. Players still
 * in rank by stack, ahead of those out, who keep their finish position; ties
 * keep the given order. The pool is every buy-in paid, and a player's net is
 * the prize for their place minus the buy-ins they paid. Lobby standings,
 * table rankings and profiles all read tournament results from here.
 * @template {TournamentEntry} T
 * @param {T[]} field - Everyone who entered
 * @param {Cents} buyIn
 * @returns {Array<T & { netWinnings: Cents }>}
 */
export function rankTournamentField(field, buyIn) {
  const ranked = [...field].sort((a, b) => {
    if (a.finishPosition === undefined && b.finishPosition === undefined) {
      return b.stack - a.stack;
    }
    if (a.finishPosition === undefined) return -1;
    if (b.finishPosition === undefined) return 1;
    return a.finishPosition - b.finishPosition;
  });
  const entries = field.reduce((total, entry) => total + entry.entries, 0);
  const prizes = calculatePrizesFromPool(field.length, buyIn * entries);
  const prizeByPosition = new Map(prizes.map((p) => [p.position, p.amount]));

  return ranked.map((entry, index) => ({
    ...entry,
    netWinnings:
      (prizeByPosition.get(entry.finishPosition ?? index + 1) ?? 0) -
      buyIn * entry.entries,
  }));
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
    let winRate;
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

  if (game.tournament?.kind === "mtt") {
    // A table holds part of the field: the tournament ranks it (mtt-view.js).
    return [];
  }
  if (game.tournament?.active) {
    const field = rankings.map((ranking) => ({
      ranking,
      stack: ranking.stack,
      entries: 1,
      finishPosition: ranking.bustedPosition,
    }));
    return rankTournamentField(field, game.tournament.buyIn).map(
      ({ ranking, netWinnings }) => ({ ...ranking, netWinnings }),
    );
  }

  return rankings.sort((a, b) => b.netWinnings - a.netWinnings);
}
