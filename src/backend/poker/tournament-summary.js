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
 */

/**
 * @typedef {object} TournamentPlayer
 * @property {string} id - Player ID
 * @property {string|null} name - Player display name
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
 * Starts tracking a tournament
 * Called when the first hand of the tournament starts
 * @param {Game} game
 */
export function startTournament(game) {
  if (!game.tournament?.active) return;

  const recorder = getRecorder(game.id);

  // Only initialize once (first hand)
  if (recorder.startTime) return;

  recorder.startTime = game.tournament.startTime || new Date().toISOString();

  // Capture all players who are seated
  recorder.players = [];
  for (let i = 0; i < game.seats.length; i++) {
    const seat = game.seats[i];
    if (!seat.empty) {
      recorder.players.push({
        id: seat.player.id,
        name: seat.player.name,
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
 * @returns {OTSFinish[]}
 */
function buildEliminatedFinishes(recorder) {
  return recorder.eliminations.map((elimination) => {
    const player = recorder.players.find((p) => p.id === elimination.playerId);
    return {
      player_name: player?.name || elimination.playerId,
      finish_position: elimination.position,
      still_playing: false,
      prize: 0,
    };
  });
}

/**
 * Builds finish entry for the winner
 * @param {Game} game
 * @returns {OTSFinish|null}
 */
function buildWinnerFinish(game) {
  const winnerSeatIndex = game.tournament?.winner;
  if (winnerSeatIndex === null || winnerSeatIndex === undefined) {
    return null;
  }
  const winnerSeat = /** @type {OccupiedSeat} */ (game.seats[winnerSeatIndex]);
  return {
    player_name: winnerSeat.player?.name || winnerSeat.player?.id || "Unknown",
    finish_position: 1,
    still_playing: false,
    prize: 0,
  };
}

/**
 * Builds the OTS summary object
 * @param {TournamentRecorder} recorder
 * @param {Game} game
 * @returns {OTSSummary}
 */
function buildOTSSummary(recorder, game) {
  const endTime = new Date().toISOString();

  const finishes = buildEliminatedFinishes(recorder);
  const winnerFinish = buildWinnerFinish(game);
  if (winnerFinish) {
    finishes.push(winnerFinish);
  }
  finishes.sort((a, b) => a.finish_position - b.finish_position);

  return {
    spec_version: "1.1.3",
    site_name: "Pluton Poker",
    tournament_number: recorder.gameId,
    tournament_name: "Sit & Go",
    start_date_utc: recorder.startTime || endTime,
    end_date_utc: endTime,
    currency: "USD",
    buyin_amount: 0,
    fee_amount: 0,
    initial_stack: toDollars(Tournament.INITIAL_STACK),
    type: "STT",
    flags: ["SNG"],
    speed: {
      type: "normal",
      round_time: Tournament.LEVEL_DURATION_TICKS,
    },
    prize_pool: 0,
    player_count: recorder.players.length,
    tournament_finishes_and_winnings: finishes,
  };
}

/**
 * Finalizes the tournament and writes the OTS file
 * Called when a winner is detected
 * @param {Game} game
 */
export async function finalizeTournament(game) {
  const recorder = recorders.get(game.id);
  if (!recorder) return;

  const summary = buildOTSSummary(recorder, game);

  await writeTournamentSummary(game.id, summary);

  // Clean up recorder
  recorders.delete(game.id);
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
