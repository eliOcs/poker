import {
  collectBustedEntrants,
  eliminateBustedEntrants,
} from "./mtt-player-lifecycle.js";
import { isRebuyEligibleByCount } from "./mtt-rebuy-policy.js";
import { isEntryPeriodOpen } from "./mtt-entry-policy.js";
import { countRemainingEntrants } from "./mtt-table-state.js";
import * as ActionClock from "./poker/action-clock.js";

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
 * @property {import('./poker/action-clock.js').ActionClock} clock
 */

/**
 * @param {ManagedTournament} tournament
 * @param {import('./mtt.js').TournamentEntrant} entrant
 */
export function isRebuyEligible(tournament, entrant) {
  return (
    isEntryPeriodOpen(tournament) && isRebuyEligibleByCount(tournament, entrant)
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
    clock: ActionClock.create(),
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
 * Validates and applies one user-facing rebuy resolution action.
 *
 * @param {ManagedTournament} tournament
 * @param {Game} game
 * @param {string} playerId
 * @param {string} action
 * @returns {boolean} whether a rebuy resolution action was handled
 */
export function handleRebuyDecisionAction(tournament, game, playerId, action) {
  if (action !== "rebuy" && action !== "leave") return false;

  const entry = game.pendingRebuyDecision?.entries.find(
    (candidate) => candidate.playerId === playerId,
  );
  if (tournament.status !== "running" || !entry) {
    if (action === "rebuy") {
      throw new Error("rebuy decision is not pending");
    }
    return false;
  }
  if (!resolveRebuyDecision(tournament, game, playerId, action)) {
    throw new Error("rebuy decision is already resolved");
  }
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
 * Advances one table-local decision clock. The same clock targets every
 * unresolved entry in the batch.
 *
 * @param {RebuyDecision|undefined} decision
 * @returns {boolean} whether the countdown expired on this tick
 */
export function tickRebuyDecisionClock(decision) {
  if (!hasUnresolvedRebuyDecisions(decision)) return false;

  ActionClock.tickWait(/** @type {RebuyDecision} */ (decision).clock);
  return ActionClock.tick(/** @type {RebuyDecision} */ (decision).clock);
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
    countRemainingEntrants(tournament),
    now,
  );
  delete game.pendingRebuyDecision;
  return true;
}

/**
 * Opens a post-hand batch and immediately finalizes it when every busted
 * entrant was pre-resolved as ineligible.
 *
 * @param {ManagedTournament} tournament
 * @param {Game} game
 * @param {() => string} now
 */
export function processTableAfterHand(tournament, game, now) {
  const decision = openRebuyDecision(tournament, game);
  if (!hasUnresolvedRebuyDecisions(decision)) {
    finalizeRebuyDecision(tournament, game, now);
    return;
  }
  delete game.countdown;
}
