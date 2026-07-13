import * as PokerGame from "./poker/game.js";
import * as ActionClock from "./poker/action-clock.js";
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
  game.tournament.startTime = tournament.startedAt ?? undefined;
  game.tournament.name = tournament.name;
  game.tournament.buyIn = tournament.buyIn;
  game.tournament.initialStack = tournament.initialStack;
  game.tournament.competitionId = tournament.id;
}

/**
 * @param {Game} game
 * @returns {boolean}
 */
export function isHandSettled(game) {
  return (
    game.hand.phase === "waiting" &&
    game.collectingBets === undefined &&
    game.runout?.active !== true
  );
}

/**
 * @param {Game} game
 * @returns {boolean}
 */
export function isTableReadyForNextHand(game) {
  return (
    isHandSettled(game) &&
    game.pendingHandHistory === undefined &&
    !game.pendingRebuyDecision?.entries.some(
      (entry) => entry.resolution === undefined,
    )
  );
}

/**
 * @param {Game} game
 * @returns {boolean}
 */
export function isTableReadyForRebalance(game) {
  return isTableReadyForNextHand(game);
}

/**
 * @param {Game} game
 * @returns {boolean}
 */
export function hasSettledWaitingHand(game) {
  return isHandSettled(game) && game.pendingHandHistory !== undefined;
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
    delete game.tournament.winner;
  }
}

/**
 * Collapsed tables stay in memory for history/profile links, but they should no
 * longer run hand state or countdown logic after all players are reseated away.
 * @param {Game} game
 */
export function resetClosedTable(game) {
  PokerGame.stopGameTick(game);
  delete game.countdown;
  game.board.cards = [];
  game.hand = PokerGame.createHand();
  delete game.collectingBets;
  delete game.runout;
  delete game.pendingHandHistory;
  delete game.winnerMessage;
  ActionClock.reset(game.actionClock);
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

  if (!isTableReadyForNextHand(game)) {
    ensureTableTick(game);
    return;
  }

  if (tournament.onBreak || tournament.pendingCollapse) {
    delete game.countdown;
  } else if (
    countActivePlayers(game) >= 2 &&
    typeof game.countdown !== "number"
  ) {
    game.countdown = 5;
  } else if (countActivePlayers(game) < 2) {
    delete game.countdown;
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
    .map((table) => ({ table, game: games.get(table.tableId) }))
    .filter((entry) => entry.game !== undefined)
    .map((entry) => ({
      table: entry.table,
      game: /** @type {Game} */ (entry.game),
      activePlayers: countActivePlayers(/** @type {Game} */ (entry.game)),
    }))
    .filter(
      (entry) => entry.activePlayers > 0 && entry.table.closedAt === undefined,
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
    isHandSettled(entry.game),
  );
}
