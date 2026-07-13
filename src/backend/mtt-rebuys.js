import {
  collectBustedEntrants,
  eliminateBustedEntrants,
} from "./mtt-player-lifecycle.js";
import {
  isRebuyEligibleByCount,
  isRebuyPeriodOpen,
} from "./mtt-rebuy-policy.js";
import { countActiveEntrants } from "./mtt-table-state.js";

/**
 * @typedef {import('./poker/game.js').Game} Game
 * @typedef {import('./mtt.js').ManagedTournament} ManagedTournament
 * @typedef {"rebuy"|"leave"} RebuyResolution
 *
 * @typedef {object} RebuyDecisionEntry
 * @property {string} playerId
 * @property {number} seatIndex
 * @property {RebuyResolution} [resolution]
 *
 * @typedef {object} RebuyDecision
 * @property {RebuyDecisionEntry[]} entries
 */

/**
 * @param {ManagedTournament} tournament
 * @param {import('./mtt.js').TournamentEntrant} entrant
 */
export function isRebuyEligible(tournament, entrant) {
  return (
    isRebuyPeriodOpen(tournament) && isRebuyEligibleByCount(tournament, entrant)
  );
}

/**
 * Collects the table's busted players in stable seat order and opens all
 * eligible decisions concurrently. Ineligible busts remain in the batch as
 * pre-resolved leaves so the eventual elimination order stays deterministic.
 *
 * @param {ManagedTournament} tournament
 * @param {Game} game
 * @returns {RebuyDecision|undefined}
 */
export function openRebuyDecision(tournament, game) {
  if (game.pendingRebuyDecision) return game.pendingRebuyDecision;

  const bustedEntrants = collectBustedEntrants(tournament, game).sort(
    (a, b) => a.seatIndex - b.seatIndex,
  );
  if (bustedEntrants.length === 0) return;

  const decision = {
    entries: bustedEntrants.map(({ entrant, seatIndex }) => ({
      playerId: entrant.playerId,
      seatIndex,
      ...(isRebuyEligible(tournament, entrant)
        ? {}
        : { resolution: /** @type {const} */ ("leave") }),
    })),
  };
  game.pendingRebuyDecision = decision;
  return decision;
}

/**
 * @param {RebuyDecision|undefined} decision
 */
export function hasUnresolvedRebuyDecisions(decision) {
  return (
    decision?.entries.some((entry) => entry.resolution === undefined) ?? false
  );
}

/**
 * Accepts one authenticated player's pending decision. The rebuy-period check
 * intentionally happens when the batch opens: decisions that were already
 * offered remain valid after the cutoff.
 *
 * @param {ManagedTournament} tournament
 * @param {Game} game
 * @param {string} playerId
 * @param {RebuyResolution} resolution
 * @returns {boolean} whether this call resolved the entry
 */
export function resolveRebuyDecision(tournament, game, playerId, resolution) {
  const decision = game.pendingRebuyDecision;
  const entry = decision?.entries.find(
    (candidate) => candidate.playerId === playerId,
  );
  if (!entry || entry.resolution !== undefined) return false;

  if (resolution === "rebuy") {
    const entrant = /** @type {import('./mtt.js').TournamentEntrant} */ (
      tournament.entrants.get(playerId)
    );
    const seat = /** @type {import('./poker/seat.js').OccupiedSeat} */ (
      game.seats[entry.seatIndex]
    );

    entrant.rebuysUsed += 1;
    entrant.stack = tournament.initialStack;
    seat.stack = tournament.initialStack;
    seat.bet = 0;
    seat.sittingOut = false;
    delete seat.bustedPosition;
  }

  entry.resolution = resolution;
  return true;
}

/**
 * Resolves every unanswered entry as leave without changing an entry that was
 * already accepted.
 *
 * @param {RebuyDecision|undefined} decision
 * @returns {number} number of entries resolved by expiry
 */
export function expireRebuyDecisions(decision) {
  if (!decision) return 0;

  let expired = 0;
  for (const entry of decision.entries) {
    if (entry.resolution !== undefined) continue;
    entry.resolution = "leave";
    expired += 1;
  }
  return expired;
}

/**
 * Finalizes only the eliminated entries after the whole table-local batch has
 * resolved. Rebuyers stay in place and do not consume finishing positions.
 *
 * @param {ManagedTournament} tournament
 * @param {Game} game
 * @param {() => string} now
 * @returns {boolean} whether the batch was finalized
 */
export function finalizeRebuyDecision(tournament, game, now) {
  const decision = game.pendingRebuyDecision;
  if (!decision || hasUnresolvedRebuyDecisions(decision)) return false;

  const eliminatedEntrants = decision.entries
    .filter((entry) => entry.resolution === "leave")
    .map((entry) => ({
      entrant: /** @type {import('./mtt.js').TournamentEntrant} */ (
        tournament.entrants.get(entry.playerId)
      ),
      seat: /** @type {import('./poker/seat.js').OccupiedSeat} */ (
        game.seats[entry.seatIndex]
      ),
      seatIndex: entry.seatIndex,
    }));

  eliminateBustedEntrants(
    game,
    eliminatedEntrants,
    countActiveEntrants(tournament),
    now,
  );
  delete game.pendingRebuyDecision;
  return true;
}
