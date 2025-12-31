/**
 * @typedef {import('./seat.js').Seat} SeatType
 * @typedef {import('./seat.js').OccupiedSeat} OccupiedSeat
 */

/**
 * @typedef {object} Pot
 * @property {number} amount - Chips in this pot
 * @property {number[]} eligibleSeats - Seat indices eligible to win this pot
 */

/**
 * @typedef {object} Award
 * @property {number} seat - Seat index
 * @property {number} amount - Amount awarded
 */

/**
 * Calculates main pot and side pots based on player contributions
 *
 * Side pots are created when players go all-in for different amounts.
 * Each pot has an amount and a list of eligible players.
 *
 * @param {SeatType[]} seats - Array of seat objects
 * @returns {Pot[]} - Array of pots, from smallest (first to be awarded) to main pot
 */
export function calculatePots(seats) {
  // Get all unique contribution levels from players in the hand
  const contributions = seats
    .map((seat, index) => ({ seat, index }))
    .filter(({ seat }) => !seat.empty && seat.totalInvested > 0)
    .map(({ seat, index }) => {
      const occupiedSeat = /** @type {OccupiedSeat} */ (seat);
      return {
        seatIndex: index,
        amount: occupiedSeat.totalInvested,
        folded: occupiedSeat.folded,
      };
    })
    .sort((a, b) => a.amount - b.amount);

  if (contributions.length === 0) {
    return [];
  }

  // Get unique investment levels
  const levels = [...new Set(contributions.map((c) => c.amount))].sort(
    (a, b) => a - b,
  );

  const pots = [];
  let previousLevel = 0;

  for (const level of levels) {
    // Calculate pot at this level
    const potAmount = contributions.reduce((sum, c) => {
      const contribution =
        Math.min(c.amount, level) - Math.min(c.amount, previousLevel);
      return sum + contribution;
    }, 0);

    // Find eligible players (not folded, contributed at least this level)
    const eligible = contributions
      .filter((c) => !c.folded && c.amount >= level)
      .map((c) => c.seatIndex);

    if (potAmount > 0 && eligible.length > 0) {
      pots.push({
        amount: potAmount,
        eligibleSeats: eligible,
      });
    }

    previousLevel = level;
  }

  return pots;
}

/**
 * Calculates total pot (sum of all pots)
 * @param {Pot[]} pots
 * @returns {number}
 */
export function getTotalPot(pots) {
  return pots.reduce((sum, pot) => sum + pot.amount, 0);
}

/**
 * Awards a pot to winner(s), handling splits for ties
 * @param {Pot} pot - The pot to award
 * @param {number[]} winnerSeats - Seat indices of winners (can be multiple for split)
 * @param {SeatType[]} seats - Array of seat objects
 * @returns {Award[]} - Array of { seat, amount } awards
 */
export function awardPot(pot, winnerSeats, seats) {
  const winners = winnerSeats.filter((seat) =>
    pot.eligibleSeats.includes(seat),
  );

  if (winners.length === 0) {
    return [];
  }

  const share = Math.floor(pot.amount / winners.length);
  const remainder = pot.amount % winners.length;

  return winners.map((seatIndex, i) => {
    // First winner gets the odd chips
    const award = share + (i === 0 ? remainder : 0);
    const seat = /** @type {OccupiedSeat} */ (seats[seatIndex]);
    seat.stack += award;
    return { seat: seatIndex, amount: award };
  });
}
