import * as Actions from "./actions.js";
import * as HandHistory from "./hand-history/index.js";
import * as TournamentSummary from "./tournament-summary.js";

/**
 * @typedef {import('./game.js').Game} Game
 * @typedef {import('./showdown.js').PotResult} PotResult
 * @typedef {import('./hand-history/index.js').OHHHand} OHHHand
 * @typedef {{ handNumber: number, potResults: PotResult[], historyHand: OHHHand }} FinalizedHand
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
  const handNumber = game.handNumber;
  const potResults = /** @type {PotResult[]} */ (game.pendingHandHistory);
  game.pendingHandHistory = null;
  return {
    handNumber,
    potResults,
    historyHand: HandHistory.captureHand(game, potResults, handNumber),
  };
}

/**
 * @param {Game} game
 * @returns {FinalizedHand | null}
 */
export function autoStartNextHand(game) {
  sitOutDisconnectedPlayers(game);

  const playersWithChips = Actions.countPlayersWithChips(game);
  if (
    game.tournament?.kind === "sitngo" &&
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
