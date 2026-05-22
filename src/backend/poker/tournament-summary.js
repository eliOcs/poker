/**
 * Tournament Summary (OTS format) generation
 * Follows the Open Tournament Summary specification v1.1.3
 * https://ts-specs.handhistory.org/
 */

import { toDollars, writeTournamentSummary } from "./hand-history/io.js";
import * as Tournament from "../../shared/tournament.js";

/**
 * @typedef {import('./types.js').Cents} Cents
 * @typedef {import('./game.js').Game} Game
 * @typedef {import('./seat.js').OccupiedSeat} OccupiedSeat
 * @typedef {import('../mtt.js').ManagedTournament} ManagedTournament
 */

/**
 * @typedef {object} TournamentPlayer
 * @property {string} id - Player ID
 * @property {string|undefined} name - Player display name
 * @property {number} seatIndex - Seat index (0-based)
 */

/**
 * @typedef {object} Elimination
 * @property {string} playerId - Player ID
 * @property {number} position - Finishing position (e.g., 6 for 6th place)
 * @property {string} time - ISO8601 timestamp
 */

/**
 * @typedef {object} TournamentRecorder
 * @property {string} gameId
 * @property {string|null} startTime - ISO8601 start time
 * @property {TournamentPlayer[]} players - All players who joined
 * @property {Elimination[]} eliminations - Elimination order
 */

/**
 * @typedef {object} OTSFinish
 * @property {string} player_name
 * @property {number} finish_position
 * @property {boolean} still_playing
 * @property {number} prize
 */

/**
 * @typedef {object} OTSSummary
 * @property {string} spec_version
 * @property {string} site_name
 * @property {string} tournament_number
 * @property {string} tournament_name
 * @property {string} start_date_utc
 * @property {string} end_date_utc
 * @property {string} currency
 * @property {number} buyin_amount
 * @property {number} fee_amount
 * @property {number} initial_stack
 * @property {string} type
 * @property {string[]} flags
 * @property {{ type: string, round_time: number }} speed
 * @property {number} prize_pool
 * @property {number} player_count
 * @property {OTSFinish[]} tournament_finishes_and_winnings
 */

/**
 * @typedef {object} OTSSummaryInput
 * @property {string} tournamentNumber
 * @property {string} tournamentName
 * @property {string} startDateUtc
 * @property {string} endDateUtc
 * @property {Cents} buyIn
 * @property {Cents} initialStack
 * @property {"STT"|"MTT"} type
 * @property {string[]} flags
 * @property {number} playerCount
 * @property {OTSFinish[]} finishes
 */

/** @type {Map<string, TournamentRecorder>} */
const recorders = new Map();

/**
 * Gets or creates a recorder for a tournament
 * @param {string} gameId
 * @returns {TournamentRecorder}
 */
function getRecorder(gameId) {
  let recorder = recorders.get(gameId);
  if (!recorder) {
    recorder = {
      gameId,
      startTime: null,
      players: [],
      eliminations: [],
    };
    recorders.set(gameId, recorder);
  }
  return recorder;
}

/**
 * @param {number} playerCount
 * @param {Cents} buyIn
 * @returns {Map<number, number>}
 */
function buildPrizeByPosition(playerCount, buyIn) {
  const prizes = Tournament.calculatePrizes(playerCount, buyIn);
  return new Map(
    prizes.map((prize) => [prize.position, toDollars(prize.amount)]),
  );
}

/**
 * @param {string} playerId
 * @param {number} finishPosition
 * @param {Map<number, number>} prizeByPosition
 * @returns {OTSFinish}
 */
function buildFinish(playerId, finishPosition, prizeByPosition) {
  return {
    player_name: playerId,
    finish_position: finishPosition,
    still_playing: false,
    prize: prizeByPosition.get(finishPosition) ?? 0,
  };
}

/**
 * @param {OTSSummaryInput} input
 * @returns {OTSSummary}
 */
function buildSummary(input) {
  return {
    spec_version: "1.1.5",
    site_name: "Pluton Poker",
    tournament_number: input.tournamentNumber,
    tournament_name: input.tournamentName,
    start_date_utc: input.startDateUtc,
    end_date_utc: input.endDateUtc,
    currency: "USD",
    buyin_amount: toDollars(input.buyIn),
    fee_amount: 0,
    initial_stack: toDollars(input.initialStack),
    type: input.type,
    flags: input.flags,
    speed: {
      type: "normal",
      round_time: Tournament.LEVEL_DURATION_TICKS,
    },
    prize_pool: toDollars(input.buyIn * input.playerCount),
    player_count: input.playerCount,
    tournament_finishes_and_winnings: [...input.finishes].sort(
      (a, b) => a.finish_position - b.finish_position,
    ),
  };
}

/**
 * Starts tracking a tournament
 * Called when the first hand of the tournament starts
 * @param {Game} game
 */
export function startTournament(game) {
  if (!game.tournament?.active || game.tournament.kind !== "sitngo") return;

  const recorder = getRecorder(game.id);

  // Only initialize once (first hand)
  if (recorder.startTime) return;

  recorder.startTime = game.tournament.startTime || new Date().toISOString();

  // Capture all players who are seated
  recorder.players = [];
  for (let i = 0; i < game.seats.length; i++) {
    const seat = /** @type {import('./seat.js').Seat} */ (game.seats[i]);
    if (!seat.empty) {
      const occupiedSeat = /** @type {import('./seat.js').OccupiedSeat} */ (
        seat
      );
      recorder.players.push({
        id: occupiedSeat.player.id,
        name: occupiedSeat.player.name,
        seatIndex: i,
      });
    }
  }
}

/**
 * Records a player elimination
 * Called when a player busts out (stack = 0)
 * @param {Game} game
 * @param {OccupiedSeat} seat - The busted seat
 * @param {number} position - Finishing position (e.g., 6 for 6th place)
 */
export function recordElimination(game, seat, position) {
  if (game.tournament?.kind !== "sitngo") return;
  const recorder = recorders.get(game.id);
  if (!recorder) return;

  recorder.eliminations.push({
    playerId: seat.player.id,
    position,
    time: new Date().toISOString(),
  });
}

/**
 * Builds finish entries for eliminated players
 * @param {TournamentRecorder} recorder
 * @param {Map<number, number>} prizeByPosition - Map of position -> prize in dollars
 * @returns {OTSFinish[]}
 */
function buildEliminatedFinishes(recorder, prizeByPosition) {
  return recorder.eliminations.map((elimination) => {
    return buildFinish(
      elimination.playerId,
      elimination.position,
      prizeByPosition,
    );
  });
}

/**
 * Builds finish entry for the winner
 * @param {Game} game
 * @param {Map<number, number>} prizeByPosition - Map of position -> prize in dollars
 * @returns {OTSFinish|null}
 */
function buildWinnerFinish(game, prizeByPosition) {
  const winnerSeatIndex = game.tournament?.winner;
  if (winnerSeatIndex === null || winnerSeatIndex === undefined) {
    return null;
  }
  const winnerSeat = /** @type {OccupiedSeat} */ (game.seats[winnerSeatIndex]);
  return buildFinish(winnerSeat.player.id, 1, prizeByPosition);
}

/**
 * Builds the OTS summary object
 * @param {TournamentRecorder} recorder
 * @param {Game} game
 * @returns {OTSSummary}
 */
function buildOTSSummary(recorder, game) {
  const endTime = new Date().toISOString();
  const tournament = game.tournament;
  if (!tournament) {
    throw new Error("tournament summary requires tournament state");
  }

  const buyIn = tournament.buyIn;
  const playerCount = recorder.players.length;
  const prizeByPosition = buildPrizeByPosition(playerCount, buyIn);

  const finishes = buildEliminatedFinishes(recorder, prizeByPosition);
  const winnerFinish = buildWinnerFinish(game, prizeByPosition);
  if (winnerFinish) {
    finishes.push(winnerFinish);
  }

  return buildSummary({
    tournamentNumber: recorder.gameId,
    tournamentName: tournament.name,
    startDateUtc: recorder.startTime || endTime,
    endDateUtc: endTime,
    buyIn,
    initialStack: Tournament.INITIAL_STACK,
    type: "STT",
    flags: ["SNG"],
    playerCount,
    finishes,
  });
}

/**
 * @param {ManagedTournament} tournament
 * @param {Map<number, number>} prizeByPosition
 * @returns {OTSFinish[]}
 */
function buildManagedTournamentFinishes(tournament, prizeByPosition) {
  return [...tournament.entrants.values()].map((entrant) => {
    const finishPosition = entrant.finishPosition ?? tournament.entrants.size;
    return buildFinish(entrant.playerId, finishPosition, prizeByPosition);
  });
}

/**
 * @param {ManagedTournament} tournament
 * @returns {OTSSummary}
 */
function buildManagedTournamentSummary(tournament) {
  const endTime = tournament.endedAt || new Date().toISOString();
  const playerCount = tournament.entrants.size;
  const prizeByPosition = buildPrizeByPosition(playerCount, tournament.buyIn);

  return buildSummary({
    tournamentNumber: tournament.id,
    tournamentName: tournament.name,
    startDateUtc: tournament.startedAt || tournament.createdAt,
    endDateUtc: endTime,
    buyIn: tournament.buyIn,
    initialStack: tournament.initialStack,
    type: "MTT",
    flags: ["MTT"],
    playerCount,
    finishes: buildManagedTournamentFinishes(tournament, prizeByPosition),
  });
}

/**
 * Finalizes the tournament and writes the OTS file
 * Called when a winner is detected
 * @param {Game} game
 */
export async function finalizeTournament(game) {
  if (game.tournament?.kind !== "sitngo") return;
  const recorder = recorders.get(game.id);
  if (!recorder) return;

  const summary = buildOTSSummary(recorder, game);

  await writeTournamentSummary(game.id, summary);

  // Clean up recorder
  recorders.delete(game.id);
}

/**
 * Finalizes a managed multi-table tournament and writes the OTS file.
 * @param {ManagedTournament} tournament
 */
export async function finalizeManagedTournament(tournament) {
  if (tournament.status !== "finished") return;
  await writeTournamentSummary(
    tournament.id,
    buildManagedTournamentSummary(tournament),
  );
}

/**
 * Clears the recorder for a game (for testing)
 * @param {string} gameId
 */
export function clearRecorder(gameId) {
  recorders.delete(gameId);
}

/**
 * Gets the recorder for testing purposes
 * @param {string} gameId
 * @returns {TournamentRecorder|undefined}
 */
export function getRecorderForTest(gameId) {
  return recorders.get(gameId);
}
