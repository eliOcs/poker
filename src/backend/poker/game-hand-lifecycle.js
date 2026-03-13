import * as Actions from "./actions.js";
import * as TournamentSummary from "./tournament-summary.js";

/**
 * @typedef {import('./game.js').Game} Game
 * @typedef {import('./game.js').BroadcastHandler} BroadcastHandler
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
 * @param {BroadcastHandler} [onBroadcast]
 */
export function finalizePendingHandHistory(game, onBroadcast) {
  const potResults = /** @type {import('./showdown.js').PotResult[]} */ (
    game.pendingHandHistory
  );
  game.pendingHandHistory = null;
  onBroadcast?.({
    type: "handEnded",
    gameId: game.id,
    handNumber: game.handNumber,
    potResults,
  });
}

/**
 * @param {Game} game
 * @param {BroadcastHandler} [onBroadcast]
 */
export function autoStartNextHand(game, onBroadcast) {
  sitOutDisconnectedPlayers(game);

  const playersWithChips = Actions.countPlayersWithChips(game);
  if (
    game.tournament?.active &&
    game.tournament.winner === null &&
    playersWithChips === 1
  ) {
    if (game.pendingHandHistory) finalizePendingHandHistory(game, onBroadcast);
    const winnerIndex = game.seats.findIndex(
      (seat) => !seat.empty && seat.stack > 0 && !seat.sittingOut,
    );
    game.tournament.winner = winnerIndex;
    TournamentSummary.finalizeTournament(game);
    return;
  }

  if (playersWithChips >= 2) {
    game.countdown = 5;
    return;
  }

  if (game.pendingHandHistory) finalizePendingHandHistory(game, onBroadcast);
}
