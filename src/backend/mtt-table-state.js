import * as PokerGame from "./poker/game.js";
import * as Seat from "./poker/seat.js";
import * as Tournament from "../shared/tournament.js";

/**
 * @typedef {import('./poker/game.js').Game} Game
 * @typedef {import('./mtt.js').ManagedTournament} ManagedTournament
 */

/**
 * @param {ManagedTournament} tournament
 * @param {Game} game
 */
export function applyTournamentStateToTable(tournament, game) {
  if (!game.tournament) return;

  const blinds = Tournament.getBlindsForLevel(tournament.level);
  game.blinds = {
    ante: blinds.ante,
    small: blinds.small,
    big: blinds.big,
  };
  game.tournament.level = tournament.level;
  game.tournament.levelTicks = tournament.levelTicks;
  game.tournament.onBreak = tournament.onBreak;
  game.tournament.pendingBreak = tournament.pendingBreak;
  game.tournament.breakTicks = tournament.breakTicks;
  game.tournament.startTime = tournament.startedAt;
  game.tournament.buyIn = tournament.buyIn;
  game.tournament.initialStack = tournament.initialStack;
  game.tournament.competitionId = tournament.id;
  game.tournament.redirects = game.tournament.redirects || {};
}

/**
 * @param {Game} game
 * @returns {boolean}
 */
export function isTableWaiting(game) {
  return (
    game.hand.phase === "waiting" &&
    game.collectingBets === null &&
    game.runout?.active !== true &&
    game.pendingHandHistory === null
  );
}

/**
 * @param {Game} game
 * @returns {boolean}
 */
export function hasSettledWaitingHand(game) {
  return (
    game.hand.phase === "waiting" &&
    game.collectingBets === null &&
    game.runout?.active !== true &&
    game.pendingHandHistory !== null
  );
}

/**
 * @param {Game} game
 * @returns {number}
 */
export function countActivePlayers(game) {
  return game.seats.filter((seat) => !seat.empty && seat.stack > 0).length;
}

/**
 * @param {ManagedTournament} tournament
 * @returns {number}
 */
export function countActiveEntrants(tournament) {
  let count = 0;
  for (const entrant of tournament.entrants.values()) {
    if (entrant.status === "seated" || entrant.status === "winner") {
      count += 1;
    }
  }
  return count;
}

/**
 * @param {Game} game
 * @returns {void}
 */
export function clearTableWinner(game) {
  if (game.tournament) {
    game.tournament.winner = null;
  }
}

/**
 * Collapsed tables stay in memory for history/profile links, but they should no
 * longer run hand state or countdown logic after all players are reseated away.
 * @param {Game} game
 */
export function resetClosedTable(game) {
  PokerGame.stopGameTick(game);
  game.countdown = null;
  game.board.cards = [];
  game.hand = PokerGame.createHand();
  game.collectingBets = null;
  game.runout = null;
  game.pendingHandHistory = null;
  game.winnerMessage = null;
  game.actingTicks = 0;
  game.clockTicks = 0;
  for (let i = 0; i < game.seats.length; i += 1) {
    game.seats[i] = Seat.empty();
  }
}

/**
 * @param {ManagedTournament} tournament
 * @param {Game} game
 * @param {(game: Game) => void} ensureTableTick
 */
export function syncWaitingTableState(tournament, game, ensureTableTick) {
  applyTournamentStateToTable(tournament, game);

  if (!isTableWaiting(game)) {
    ensureTableTick(game);
    return;
  }

  if (tournament.onBreak || tournament.pendingCollapse) {
    game.countdown = null;
  } else if (countActivePlayers(game) >= 2 && game.countdown === null) {
    game.countdown = 5;
  } else if (countActivePlayers(game) < 2) {
    game.countdown = null;
  }

  ensureTableTick(game);
}

/**
 * @param {ManagedTournament} tournament
 * @param {Map<string, Game>} games
 * @returns {Array<{ table: import('./mtt.js').ManagedTable, game: Game, activePlayers: number }>}
 */
export function getActiveTables(tournament, games) {
  return tournament.tables
    .map((table) => ({ table, game: games.get(table.tableId) || null }))
    .filter((entry) => entry.game !== null)
    .map((entry) => ({
      table: entry.table,
      game: /** @type {Game} */ (entry.game),
      activePlayers: countActivePlayers(/** @type {Game} */ (entry.game)),
    }))
    .filter(
      (entry) => entry.activePlayers > 0 && entry.table.closedAt === null,
    );
}

/**
 * @param {ManagedTournament} tournament
 * @returns {number}
 */
export function getTimeToNextLevel(tournament) {
  if (tournament.onBreak) {
    return Tournament.BREAK_DURATION_TICKS - tournament.breakTicks;
  }
  return Tournament.LEVEL_DURATION_TICKS - tournament.levelTicks;
}

/**
 * @param {ManagedTournament} tournament
 * @param {Map<string, Game>} games
 * @returns {boolean}
 */
export function canStartPendingBreak(tournament, games) {
  if (!tournament.pendingBreak) return false;
  return getActiveTables(tournament, games).every((entry) =>
    isTableWaiting(entry.game),
  );
}
