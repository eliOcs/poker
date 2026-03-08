import * as Actions from "./actions.js";
import * as HandHistory from "./hand-history/index.js";
import * as TournamentSummary from "./tournament-summary.js";
import * as Store from "../store.js";

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
  if (!game.pendingHandHistory) return;

  const finalizedHandNumber = game.handNumber;
  HandHistory.finalizeHand(game, game.pendingHandHistory).then((hand) => {
    Store.recordPlayerGames(
      hand.players.map((player) => ({ playerId: player.id, gameId: game.id })),
    );
    onBroadcast?.({
      type: "history",
      gameId: game.id,
      event: "handRecorded",
      handNumber: finalizedHandNumber,
    });
  });
  game.pendingHandHistory = null;
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
    finalizePendingHandHistory(game, onBroadcast);
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

  finalizePendingHandHistory(game, onBroadcast);
}
