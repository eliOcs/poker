import * as Seat from "./poker/seat.js";
import { countRemainingEntrants } from "./mtt-table-state.js";

/**
 * @typedef {import('./poker/game.js').Game} Game
 * @typedef {import('./mtt.js').ManagedTournament} ManagedTournament
 * @typedef {import('./mtt.js').TournamentEntrant} TournamentEntrant
 * @typedef {{ seat: import('./poker/seat.js').OccupiedSeat, entrant: TournamentEntrant, seatIndex: number }} BustedEntrant
 */

/**
 * Synchronizes occupied seats to their entrants and returns newly busted
 * entrants in deterministic seat order.
 *
 * @param {ManagedTournament} tournament
 * @param {Game} game
 * @returns {BustedEntrant[]}
 */
export function collectBustedEntrants(tournament, game) {
  /** @type {BustedEntrant[]} */
  const bustedEntrants = [];

  for (let seatIndex = 0; seatIndex < game.seats.length; seatIndex += 1) {
    const seat = game.seats[seatIndex];
    if (!seat || seat.empty) continue;

    const occupiedSeat = /** @type {import('./poker/seat.js').OccupiedSeat} */ (
      seat
    );
    const entrant = tournament.entrants.get(occupiedSeat.player.id);
    if (!entrant) continue;

    entrant.name = occupiedSeat.player.name ?? entrant.name;
    entrant.handsPlayed = occupiedSeat.handsPlayed;

    if (occupiedSeat.stack > 0) {
      delete occupiedSeat.bustedPosition;
      entrant.status = "seated";
      entrant.stack = occupiedSeat.stack;
      entrant.tableId = game.id;
      entrant.seatIndex = seatIndex;
      continue;
    }

    if (entrant.status === "seated") {
      bustedEntrants.push({
        seat: occupiedSeat,
        entrant,
        seatIndex,
      });
    }
  }

  return bustedEntrants;
}

/**
 * @param {Game} game
 * @param {BustedEntrant[]} bustedEntrants
 * @param {number} activeBefore
 * @param {() => string} now
 */
export function eliminateBustedEntrants(
  game,
  bustedEntrants,
  activeBefore,
  now,
) {
  [...bustedEntrants]
    .sort((a, b) => a.seatIndex - b.seatIndex)
    .forEach(({ seat, entrant, seatIndex }, index) => {
      const finishPosition = activeBefore - index;
      seat.bustedPosition = finishPosition;
      seat.stack = 0;
      seat.bet = 0;
      seat.sittingOut = true;
      entrant.status = "eliminated";
      entrant.stack = 0;
      delete entrant.tableId;
      delete entrant.seatIndex;
      entrant.finishPosition = finishPosition;
      entrant.eliminatedAt = now();
      game.seats[seatIndex] = Seat.empty();
    });
}

/**
 * @param {ManagedTournament} tournament
 * @param {Game} game
 * @param {() => string} now
 */
export function processTableAfterHand(tournament, game, now) {
  const activeBefore = countRemainingEntrants(tournament);
  const bustedEntrants = collectBustedEntrants(tournament, game);
  eliminateBustedEntrants(game, bustedEntrants, activeBefore, now);
}
