import * as Actions from "./actions.js";
import * as TournamentSummary from "./tournament-summary.js";

/**
 * @typedef {import('./game.js').Game} Game
 * @typedef {import('./showdown.js').PotResult} PotResult
 * @typedef {{ handNumber: number, potResults: PotResult[] }} FinalizedHand
 */

/**
 * @param {Game} game
 */
export function sitOutDisconnectedPlayers(game) {
  for (const seat of game.seats) {
    if (!seat.empty && seat.disconnected && !seat.sittingOut) {
      seat.sittingOut = true;
    }
  }
}

/**
 * @param {Game} game
 * @returns {FinalizedHand}
 */
export function finalizePendingHandHistory(game) {
  const potResults = /** @type {PotResult[]} */ (game.pendingHandHistory);
  game.pendingHandHistory = null;
  return { handNumber: game.handNumber, potResults };
}

/**
 * @param {Game} game
 * @returns {FinalizedHand | null}
 */
export function autoStartNextHand(game) {
  sitOutDisconnectedPlayers(game);

  const playersWithChips = Actions.countPlayersWithChips(game);
  if (
    game.tournament?.active &&
    game.tournament.winner === null &&
    playersWithChips === 1
  ) {
    const handData = game.pendingHandHistory
      ? finalizePendingHandHistory(game)
      : null;
    const winnerIndex = game.seats.findIndex(
      (seat) => !seat.empty && seat.stack > 0 && !seat.sittingOut,
    );
    game.tournament.winner = winnerIndex;
    TournamentSummary.finalizeTournament(game);
    return handData;
  }

  if (playersWithChips >= 2) {
    game.countdown = 5;
    return null;
  }

  return game.pendingHandHistory ? finalizePendingHandHistory(game) : null;
}
