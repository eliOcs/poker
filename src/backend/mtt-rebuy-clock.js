import * as ActionClock from "./poker/action-clock.js";
import { isRebuyPeriodOpen } from "./mtt-rebuy-policy.js";
import {
  expireRebuyDecisions,
  finalizeRebuyDecision,
  hasUnresolvedRebuyDecisions,
  tickRebuyDecisionClock,
} from "./mtt-rebuys.js";

/**
 * @typedef {import('./poker/game.js').Game} Game
 * @typedef {import('./mtt.js').ManagedTournament} ManagedTournament
 */

/**
 * @param {ManagedTournament} tournament
 * @param {Map<string, Game>} games
 * @returns {Game[]}
 */
function getOpenTournamentTables(tournament, games) {
  return tournament.tables
    .filter((table) => table.closedAt === undefined)
    .map((table) => {
      const game = games.get(table.tableId);
      if (!game) throw new Error("managed tournament table not found");
      return game;
    });
}

/**
 * Starts the shared countdown for every grandfathered decision when the
 * centralized rebuy-period predicate transitions from open to closed.
 * Existing countdowns are deliberately left untouched.
 *
 * @param {ManagedTournament} tournament
 * @param {Map<string, Game>} games
 * @param {boolean} wasOpen
 * @param {Set<string>} changedTableIds
 */
export function applyRebuyPeriodTransition(
  tournament,
  games,
  wasOpen,
  changedTableIds,
) {
  if (!wasOpen || isRebuyPeriodOpen(tournament)) return;

  for (const game of getOpenTournamentTables(tournament, games)) {
    const decision = game.pendingRebuyDecision;
    if (
      hasUnresolvedRebuyDecisions(decision) &&
      ActionClock.start(
        /** @type {import('./mtt-rebuys.js').RebuyDecision} */ (decision).clock,
      )
    ) {
      changedTableIds.add(game.id);
    }
  }
}

/**
 * Advances every pending table decision independently and finalizes batches
 * whose shared countdown expires.
 *
 * @param {ManagedTournament} tournament
 * @param {Map<string, Game>} games
 * @param {() => string} now
 * @param {Set<string>} changedTableIds
 * @returns {boolean} whether any batch was finalized
 */
export function tickRebuyDecisionClocks(
  tournament,
  games,
  now,
  changedTableIds,
) {
  let finalizedAny = false;

  for (const game of getOpenTournamentTables(tournament, games)) {
    const decision = game.pendingRebuyDecision;
    if (!tickRebuyDecisionClock(decision)) continue;

    expireRebuyDecisions(decision);
    finalizedAny = finalizeRebuyDecision(tournament, game, now) || finalizedAny;
    changedTableIds.add(game.id);
  }

  return finalizedAny;
}

/**
 * Authorizes and starts a manual clock call for a pending decision batch.
 *
 * @param {Game} game
 * @param {string} playerId
 * @returns {boolean} whether a rebuy clock action was handled
 */
export function callRebuyClock(game, playerId) {
  const decision = game.pendingRebuyDecision;
  if (!hasUnresolvedRebuyDecisions(decision)) return false;

  const pendingDecision =
    /** @type {import('./mtt-rebuys.js').RebuyDecision} */ (decision);
  const isSeated = game.seats.some(
    (seat) => !seat.empty && seat.player.id === playerId,
  );
  if (!isSeated) {
    throw new Error("must be seated to call clock");
  }

  const ownDecision = pendingDecision.entries.find(
    (entry) => entry.playerId === playerId,
  );
  if (ownDecision && ownDecision.resolution === undefined) {
    throw new Error("cannot call clock on yourself");
  }
  ActionClock.assertCanStart(pendingDecision.clock);
  ActionClock.start(pendingDecision.clock);
  return true;
}
