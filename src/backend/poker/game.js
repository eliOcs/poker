import * as Id from "../id.js";
import * as Deck from "./deck.js";
import * as Seat from "./seat.js";
import * as Tournament from "../../shared/tournament.js";
export {
  gameStateSnapshot,
  stopGameTick,
  startGameTick,
  ensureGameTick,
  startHand,
  performAutoAction,
} from "./game-engine.js";
export { TIMER_INTERVAL, RUNOUT_DELAY_TICKS } from "./game-constants.js";
export {
  sitOutDisconnectedPlayers,
  autoStartNextHand,
} from "./game-hand-lifecycle.js";
export {
  processGameFlow,
  finishCollectBets,
  dealRunoutStreet,
} from "./game-flow.js";

/**
 * @typedef {import('./types.js').Cents} Cents
 * @typedef {import('./deck.js').Card} Card
 * @typedef {import('./seat.js').Seat} Seat
 * @typedef {import('./seat.js').Player} PlayerType
 * @typedef {{ type: "gameState", gameId: string } | { type: "history", gameId: string, event: "handRecorded", handNumber: number } | { type: "social", gameId: string, action: "chat", seat: number, message: string } | { type: "social", gameId: string, action: "emote", seat: number, emoji: string } | { type: "handEnded", gameId: string, handNumber: number, potResults: import('./showdown.js').PotResult[], historyHand?: import('./hand-history/index.js').OHHHand }} BroadcastMessage
 * @typedef {(message: BroadcastMessage) => { recipients: number, maxPayloadBytes: number }} BroadcastHandler
 */

/**
 * @typedef {'waiting'|'preflop'|'flop'|'turn'|'river'|'showdown'} Phase
 */
/**
 * @typedef {object} Blinds
 * @property {Cents} ante - Ante amount
 * @property {Cents} small - Small blind amount
 * @property {Cents} big - Big blind amount
 */
/**
 * @typedef {object} Board
 * @property {Card[]} cards - Community cards
 */

/**
 * @typedef {object} Hand
 * @property {Phase} phase - Current phase of the hand
 * @property {Cents} pot - Total chips in pot
 * @property {Cents} currentBet - Highest bet in current round
 * @property {number} lastRaiser - Seat index of last raiser (-1 if none)
 * @property {number} actingSeat - Seat index of player to act (-1 if none)
 * @property {Cents} lastRaiseSize - Size of the last raise (for min-raise calculation)
 */

/**
 * @typedef {object} WinnerMessage
 * @property {string|null} playerName - Winner's player name/ID (null for split pots)
 * @property {string|null} handRank - Winning hand description (null if won by fold)
 * @property {Cents} amount - Amount won
 * @property {boolean} isSplit - True when multiple players split the pot
 */

/**
 * @typedef {object} TournamentState
 * @property {boolean} active - Whether this is a tournament game
 * @property {"sitngo"|"mtt"} kind - Tournament mode
 * @property {string} competitionId - Sit & Go id or parent MTT id
 * @property {number} level - Current blind level (1-7)
 * @property {number} levelTicks - Ticks elapsed in current level
 * @property {boolean} onBreak - Currently in break period
 * @property {boolean} pendingBreak - Break will start after current hand ends
 * @property {number} breakTicks - Ticks elapsed in current break
 * @property {string|null} startTime - Tournament start time (ISO string)
 * @property {number} initialStack - Starting stack for each player
 * @property {number|null} winner - Seat index of tournament winner (null if ongoing)
 * @property {Cents} buyIn - Buy-in amount in cents
 * @property {Record<string, string>} [redirects] - PlayerId -> assigned table id for managed MTT moves
 */

/**
 * @typedef {object} RunoutState
 * @property {boolean} active - Whether runout is in progress
 * @property {number} delayTicks - Ticks remaining before dealing next street
 */

/**
 * @typedef {object} Game
 * @property {import('../id.js').Id} id - Game unique identifier
 * @property {boolean} running - Whether game is running
 * @property {number} button - Dealer button position (seat index)
 * @property {Blinds} blinds - Blind structure
 * @property {"cash"|"sitngo"|"mtt"} kind - Table resource kind
 * @property {string|null} tournamentId - Parent tournament id for MTT tables
 * @property {string|null} tableName - Human-readable table name for history/UX
 * @property {Seat[]} seats - Array of seats
 * @property {Card[]} deck - Current deck
 * @property {Board} board - Community cards
 * @property {Hand} hand - Current hand state
 * @property {number} handNumber - Current hand number (0 before first hand)
 * @property {number|null} countdown - Countdown ticks until hand starts (null if not counting)
 * @property {NodeJS.Timeout|null} tickTimer - Unified game tick timer (1 second interval)
 * @property {WinnerMessage|null} winnerMessage - Winner info to display after hand ends
 * @property {number} actingTicks - Ticks the current player has been acting (for call clock availability)
 * @property {number} clockTicks - Ticks since clock was called (for clock expiry)
 * @property {TournamentState|null} tournament - Tournament state (null for cash games)
 * @property {RunoutState|null} runout - Runout state for all-in scenarios (null if not running out)
 * @property {import('./showdown.js').PotResult[]|null} pendingHandHistory - Pot results to finalize after reveal window
 * @property {{ active: boolean, delayTicks: number }|null} collectingBets - Bet collection animation state
 * @property {import('../logger.js').Log|null} handLog - Deferred hand-level log record for the current hand
 */

/**
 * @typedef {object} GameOptions
 * @property {number} [seats] - Number of seats
 * @property {Blinds} [blinds] - Blind structure
 * @property {"cash"|"sitngo"|"mtt"} [kind] - Table kind
 * @property {string|null} [tournamentId] - Parent tournament id for MTT tables
 * @property {string|null} [tableName] - Human-readable table name
 */

/**
 * Creates initial hand state
 * @returns {Hand}
 */
export function createHand() {
  return {
    phase: "waiting",
    pot: 0,
    currentBet: 0,
    lastRaiser: -1,
    actingSeat: -1,
    lastRaiseSize: 0,
  };
}

/**
 * Creates a new game
 * @param {GameOptions} [options] - Game options
 * @returns {Game}
 */
export function create({
  seats: numberOfSeats = 9,
  blinds = { ante: 5, small: 25, big: 50 },
  kind = "cash",
  tournamentId = null,
  tableName = null,
} = {}) {
  const id = Id.generate();
  /** @type {Seat[]} */
  const seats = [];
  for (let i = 0; i < numberOfSeats; i += 1) {
    seats.push(Seat.empty());
  }
  return {
    id,
    running: true,
    button: 0,
    blinds,
    kind,
    tournamentId,
    tableName,
    seats,
    deck: Deck.create(),
    board: { cards: [] },
    hand: createHand(),
    handNumber: 0,
    countdown: null,
    tickTimer: null,
    winnerMessage: null,
    actingTicks: 0,
    clockTicks: 0,
    tournament: null,
    runout: null,
    pendingHandHistory: null,
    collectingBets: null,
    handLog: null,
  };
}

/**
 * @typedef {object} TournamentOptions
 * @property {number} [seats] - Number of seats (default: 6)
 * @property {Cents} [buyIn] - Buy-in amount in cents
 */

/**
 * Creates a new tournament game
 * @param {TournamentOptions} [options] - Tournament options
 * @returns {Game}
 */
export function createTournament({
  seats: numberOfSeats = Tournament.DEFAULT_SEATS,
  buyIn = Tournament.DEFAULT_BUYIN.amount,
} = {}) {
  const level1Blinds = Tournament.getBlindsForLevel(1);
  const blinds = {
    ante: level1Blinds.ante,
    small: level1Blinds.small,
    big: level1Blinds.big,
  };

  const game = create({
    seats: numberOfSeats,
    blinds,
    kind: "sitngo",
    tableName: "Sit & Go Table",
  });

  game.tournament = {
    active: true,
    kind: "sitngo",
    competitionId: game.id,
    level: 1,
    levelTicks: 0,
    onBreak: false,
    pendingBreak: false,
    breakTicks: 0,
    startTime: null,
    initialStack: Tournament.INITIAL_STACK,
    winner: null,
    buyIn,
  };

  return game;
}

/**
 * Creates a new multi-table tournament table
 * @param {{ seats?: number, buyIn?: Cents, tournamentId: string, tableName: string, startTime: string|null, level?: number }} options
 * @returns {Game}
 */
export function createMttTable({
  seats: numberOfSeats = Tournament.DEFAULT_SEATS,
  buyIn = Tournament.DEFAULT_BUYIN.amount,
  tournamentId,
  tableName,
  startTime,
  level = 1,
}) {
  const initialBlinds = Tournament.getBlindsForLevel(level);
  const blinds = {
    ante: initialBlinds.ante,
    small: initialBlinds.small,
    big: initialBlinds.big,
  };

  const game = create({
    seats: numberOfSeats,
    blinds,
    kind: "mtt",
    tournamentId,
    tableName,
  });

  game.tournament = {
    active: true,
    kind: "mtt",
    competitionId: tournamentId,
    level,
    levelTicks: 0,
    onBreak: false,
    pendingBreak: false,
    breakTicks: 0,
    startTime,
    initialStack: Tournament.INITIAL_STACK,
    winner: null,
    buyIn,
    redirects: {},
  };

  return game;
}

/**
 * @param {Game} game
 * @param {PlayerType} player
 * @returns {number} Seat index or -1 if not found
 */
export function findPlayerSeatIndex(game, player) {
  return game.seats.findIndex(
    (seat) => !seat.empty && seat.player.id === player.id,
  );
}
