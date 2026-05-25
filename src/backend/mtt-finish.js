import {
  applyTournamentStateToTable,
  clearTableWinner,
} from "./mtt-table-state.js";
import {
  compareForcedFinishEntrants,
  getEntrantSeatContext,
} from "./mtt-seating.js";
import * as TournamentSummary from "./poker/tournament-summary.js";
import * as logger from "./logger.js";

/**
 * @param {import('./mtt.js').ManagedTournament} tournament
 * @param {Map<string, import('./poker/game.js').Game>} games
 * @param {(game: import('./poker/game.js').Game) => void} ensureTableTick
 * @param {() => string} now
 * @param {import('./mtt.js').TournamentEntrant} [winnerEntrant]
 */
export function finishTournament(
  tournament,
  games,
  ensureTableTick,
  now,
  winnerEntrant = undefined,
) {
  const activeEntrants = [...tournament.entrants.values()].filter(
    (entrant) => entrant.status === "seated",
  );
  const resolvedWinner = winnerEntrant ?? activeEntrants[0];
  if (!resolvedWinner) return;

  const forcedEliminations = activeEntrants
    .filter((entrant) => entrant.playerId !== resolvedWinner.playerId)
    .sort((a, b) => compareForcedFinishEntrants(tournament, a, b));

  forcedEliminations.forEach((entrant, index) => {
    const finishPosition = index + 2;
    const seatContext = getEntrantSeatContext(games, entrant);
    if (seatContext) {
      seatContext.seat.bustedPosition = finishPosition;
      seatContext.seat.stack = 0;
      seatContext.seat.bet = 0;
      seatContext.seat.sittingOut = true;
    }
    entrant.status = "eliminated";
    entrant.stack = 0;
    delete entrant.tableId;
    delete entrant.seatIndex;
    entrant.finishPosition = finishPosition;
    entrant.eliminatedAt = now();
  });

  const winnerSeatContext = getEntrantSeatContext(games, resolvedWinner);
  if (!winnerSeatContext) return;

  const winnerEndedAt = now();
  resolvedWinner.status = "winner";
  resolvedWinner.finishPosition = 1;
  resolvedWinner.tableId = winnerSeatContext.game.id;
  tournament.status = "finished";
  tournament.endedAt = winnerEndedAt;

  for (const table of tournament.tables) {
    table.closedAt = tournament.endedAt;
    const game = games.get(table.tableId);
    if (!game) continue;
    clearTableWinner(game);
    applyTournamentStateToTable(tournament, game);
    if (
      game.tournament &&
      resolvedWinner.tableId === table.tableId &&
      resolvedWinner.seatIndex !== undefined
    ) {
      game.tournament.winner = resolvedWinner.seatIndex;
    }
    delete game.countdown;
    ensureTableTick(game);
  }

  void TournamentSummary.finalizeManagedTournament(tournament).catch((err) => {
    logger.error("mtt summary write failed", {
      tournamentId: tournament.id,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}
