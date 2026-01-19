/**
 * Test helpers for backend poker tests
 *
 * Provides reusable game setup functions to reduce duplication across test files.
 */

import * as Game from "../../../src/backend/poker/game.js";
import * as Seat from "../../../src/backend/poker/seat.js";
import * as Actions from "../../../src/backend/poker/actions.js";
import * as Betting from "../../../src/backend/poker/betting.js";

/** Standard blinds used in most tests */
export const STANDARD_BLINDS = { ante: 0, small: 25, big: 50 };

/** Standard stack size for test players */
export const STANDARD_STACK = 1000;

/**
 * Creates a test game with standard options
 * @param {Object} [options]
 * @param {number} [options.seats=6] - Number of seats
 * @param {Object} [options.blinds] - Blinds configuration
 * @returns {import('../../../src/backend/poker/game.js').Game}
 */
export function createTestGame(options = {}) {
  const { seats = 6, blinds = STANDARD_BLINDS } = options;
  return Game.create({ seats, blinds });
}

/**
 * Creates a game with 3 players at seats 0, 2, 4 (standard test setup)
 * @param {Object} [options]
 * @param {number} [options.stack] - Stack size for each player
 * @param {Object} [options.blinds] - Blinds configuration
 * @returns {import('../../../src/backend/poker/game.js').Game}
 */
export function createGameWithPlayers(options = {}) {
  const { stack = STANDARD_STACK, blinds = STANDARD_BLINDS } = options;
  const game = createTestGame({ blinds });
  game.seats[0] = Seat.occupied({ id: "player1" }, stack);
  game.seats[2] = Seat.occupied({ id: "player2" }, stack);
  game.seats[4] = Seat.occupied({ id: "player3" }, stack);
  game.button = 0;
  return game;
}

/**
 * Creates a heads-up game with 2 players at seats 0 and 2
 * @param {Object} [options]
 * @param {number} [options.stack] - Stack size for each player
 * @param {Object} [options.blinds] - Blinds configuration
 * @returns {import('../../../src/backend/poker/game.js').Game}
 */
export function createHeadsUpGame(options = {}) {
  const { stack = STANDARD_STACK, blinds = STANDARD_BLINDS } = options;
  const game = createTestGame({ blinds });
  game.seats[0] = Seat.occupied({ id: "player1" }, stack);
  game.seats[2] = Seat.occupied({ id: "player2" }, stack);
  game.button = 0;
  return game;
}

/**
 * Sets up players at specified seat indices with given stack
 * @param {import('../../../src/backend/poker/game.js').Game} game
 * @param {number[]} seatIndices - Array of seat indices to populate
 * @param {number} [stack] - Stack size for each player
 */
export function setupPlayers(game, seatIndices, stack = STANDARD_STACK) {
  seatIndices.forEach((index, i) => {
    game.seats[index] = Seat.occupied({ id: `player${i + 1}` }, stack);
  });
}

/**
 * Sits players and buys them in at specified seats
 * @param {import('../../../src/backend/poker/game.js').Game} game
 * @param {number[]} seatIndices - Array of seat indices
 * @param {number} buyInAmount - Buy-in amount for each player
 * @returns {{ players: object[], game: import('../../../src/backend/poker/game.js').Game }}
 */
export function sitAndBuyInPlayers(game, seatIndices, buyInAmount) {
  const players = [];
  seatIndices.forEach((seatIndex, i) => {
    const player = { id: `player${i + 1}` };
    players.push(player);
    Actions.sit(game, { seat: seatIndex, player });
    Actions.buyIn(game, { seat: seatIndex, amount: buyInAmount });
  });
  return { players, game };
}

/**
 * Drains a generator to completion
 * @param {Generator} gen - The generator to drain
 * @returns {any} - The return value of the generator
 */
export function drainGenerator(gen) {
  let result = gen.next();
  while (!result.done) {
    result = gen.next();
  }
  return result.value;
}

/**
 * Sets up a game through preflop betting (startHand, blinds, deal, startBettingRound)
 * @param {import('../../../src/backend/poker/game.js').Game} game
 */
export function setupPreflop(game) {
  Actions.startHand(game);
  drainGenerator(Actions.blinds(game));
  drainGenerator(Actions.dealPreflop(game));
  Betting.startBettingRound(game, "preflop");
  game.hand.currentBet = game.blinds.big;
}

/**
 * Sets up a game through flop betting
 * @param {import('../../../src/backend/poker/game.js').Game} game
 */
export function setupFlop(game) {
  setupPreflop(game);
  // Skip to flop
  Betting.startBettingRound(game, "flop");
}
