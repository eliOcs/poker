import HandRankings from "../hand-rankings.js";
import { toDollars, writeHandToFile, addToCache } from "./io.js";

// Re-export from io.js (only non-currency-conversion functions)
export { getHand, getAllHands, clearCache, getCacheSize } from "./io.js";

// Re-export types and functions from view.js
// All currency values in these exports are in Cents
export { filterHandForPlayer, getHandSummary, getHandView } from "./view.js";

/**
 * Re-export types for external use
 * @typedef {import('./view.js').FilteredHand} FilteredHand
 * @typedef {import('./view.js').HandSummary} HandSummary
 * @typedef {import('./view.js').HistoryView} HistoryView
 * @typedef {import('./view.js').HistoryViewSeat} HistoryViewSeat
 */

/**
 * @typedef {import('../types.js').Cents} Cents
 * @typedef {import('../game.js').Game} Game
 * @typedef {import('../deck.js').Card} Card
 * @typedef {import('../seat.js').OccupiedSeat} OccupiedSeat
 * @typedef {import('../showdown.js').PotResult} PotResult
 */

/**
 * @typedef {object} OHHAction
 * @property {number} action_number
 * @property {string} player_id
 * @property {string} action
 * @property {number} [amount]
 * @property {boolean} [is_allin]
 * @property {string[]} [cards]
 * @property {string} [street] - Internal use only, stripped before saving
 */

/**
 * @typedef {object} OHHRound
 * @property {number} id
 * @property {string} street
 * @property {string[]} [cards]
 * @property {OHHAction[]} actions
 */

/**
 * @typedef {object} OHHTournamentInfo
 * @property {string} tournament_number
 * @property {string} name
 * @property {string} start_date_utc
 * @property {string} currency
 * @property {number} buyin_amount
 * @property {number} fee_amount
 * @property {number} initial_stack
 * @property {string} type
 * @property {string} speed
 */

/**
 * @typedef {object} OHHHand
 * @property {string} spec_version
 * @property {string} site_name
 * @property {string} game_number
 * @property {string} start_date_utc
 * @property {string} game_type
 * @property {{ bet_type: string }} bet_limit
 * @property {number} table_size
 * @property {number} dealer_seat
 * @property {number} small_blind_amount
 * @property {number} big_blind_amount
 * @property {number} ante_amount
 * @property {Array<{ id: string, seat: number, name: string|null, starting_stack: number }>} players
 * @property {OHHRound[]} rounds
 * @property {Array<{ number: number, amount: number, winning_hand: string|null, winning_cards: string[]|null, player_wins: Array<{ player_id: string, win_amount: number, contributed_rake: number }> }>} pots
 * @property {boolean} [tournament] - True if this is a tournament hand
 * @property {OHHTournamentInfo} [tournament_info] - Tournament metadata (only for tournaments)
 */

/**
 * @typedef {object} TournamentRecordInfo
 * @property {boolean} active
 * @property {string|null} startTime
 * @property {number} initialStack
 * @property {number} level
 */

/**
 * @typedef {object} Recorder
 * @property {string} gameId
 * @property {number} handNumber
 * @property {OHHAction[]} actions
 * @property {number} actionCounter
 * @property {string} currentStreet
 * @property {string|null} startTime
 * @property {Array<{ id: string, seat: number, name: string|null, starting_stack: Cents }>} players
 * @property {number} dealerSeat
 * @property {{ ante: Cents, small: Cents, big: Cents }} blinds
 * @property {Map<string, string[]>} boardByStreet
 * @property {TournamentRecordInfo|null} tournament
 */

/** @type {Map<string, Recorder>} */
const recorders = new Map();

/**
 * Gets or creates a recorder for a game
 * @param {string} gameId
 * @returns {Recorder}
 */
export function getRecorder(gameId) {
  let recorder = recorders.get(gameId);
  if (!recorder) {
    recorder = {
      gameId,
      handNumber: 0,
      actions: [],
      actionCounter: 0,
      currentStreet: "Preflop",
      startTime: null,
      players: [],
      dealerSeat: 0,
      blinds: { ante: 0, small: 0, big: 0 },
      boardByStreet: new Map(),
      tournament: null,
    };
    recorders.set(gameId, recorder);
  }
  return recorder;
}

/**
 * Starts recording a new hand
 * @param {Game} game
 */
export function startHand(game) {
  const recorder = getRecorder(game.id);
  recorder.handNumber++;
  recorder.actions = [];
  recorder.actionCounter = 0;
  recorder.currentStreet = "Preflop";
  recorder.startTime = new Date().toISOString();
  recorder.dealerSeat = game.button + 1; // OHH uses 1-indexed seats
  recorder.blinds = { ...game.blinds };
  recorder.boardByStreet = new Map();

  // Capture tournament info if this is a tournament
  if (game.tournament?.active) {
    // Set tournament start time on first hand
    if (!game.tournament.startTime) {
      game.tournament.startTime = recorder.startTime;
    }
    recorder.tournament = {
      active: true,
      startTime: game.tournament.startTime,
      initialStack: game.tournament.initialStack,
      level: game.tournament.level,
    };
  } else {
    recorder.tournament = null;
  }

  // Capture players at hand start
  recorder.players = [];
  for (let i = 0; i < game.seats.length; i++) {
    const seat = game.seats[i];
    if (!seat.empty && !seat.sittingOut) {
      recorder.players.push({
        id: seat.player.id,
        seat: i + 1, // OHH uses 1-indexed seats
        name: seat.player.name,
        starting_stack: seat.stack + seat.bet, // Include any posted blinds
      });
    }
  }
}

/**
 * Records a post blind action
 * @param {string} gameId
 * @param {string} playerId
 * @param {'sb' | 'bb' | 'ante'} blindType
 * @param {Cents} amount
 */
export function recordBlind(gameId, playerId, blindType, amount) {
  const recorder = getRecorder(gameId);
  const actionMap = {
    sb: "Post SB",
    bb: "Post BB",
    ante: "Post Ante",
  };
  recorder.actions.push({
    action_number: ++recorder.actionCounter,
    player_id: playerId,
    action: actionMap[blindType],
    amount,
  });
}

/**
 * @param {string} gameId
 * @param {string} playerId
 * @param {Card[]} cards
 */
export function recordDealtCards(gameId, playerId, cards) {
  const recorder = getRecorder(gameId);
  recorder.actions.push({
    action_number: ++recorder.actionCounter,
    player_id: playerId,
    action: "Dealt Cards",
    cards,
  });
}

/**
 * Records a betting action
 * @param {string} gameId
 * @param {string} playerId
 * @param {string} action - fold, check, call, bet, raise
 * @param {Cents} [amount]
 * @param {boolean} [isAllIn]
 */
export function recordAction(
  gameId,
  playerId,
  action,
  amount,
  isAllIn = false,
) {
  const recorder = getRecorder(gameId);

  // Capitalize action for OHH format
  const ohhAction = action.charAt(0).toUpperCase() + action.slice(1);

  /** @type {OHHAction} */
  const actionObj = {
    action_number: ++recorder.actionCounter,
    player_id: playerId,
    action: ohhAction,
    street: recorder.currentStreet,
  };

  if (amount !== undefined) {
    actionObj.amount = amount;
    actionObj.is_allin = isAllIn;
  }

  recorder.actions.push(actionObj);
}

/**
 * @param {string} gameId
 * @param {string} street - flop, turn, river
 * @param {Card[]} [boardCards]
 */
export function recordStreet(gameId, street, boardCards) {
  const recorder = getRecorder(gameId);
  const streetMap = {
    flop: "Flop",
    turn: "Turn",
    river: "River",
  };
  recorder.currentStreet = streetMap[street] || street;

  if (boardCards && boardCards.length > 0) {
    // Store a copy to avoid mutation when more cards are dealt
    recorder.boardByStreet.set(recorder.currentStreet, [...boardCards]);
  }
}

/**
 * @param {string} gameId
 * @param {string} playerId
 * @param {Card[]} cards
 * @param {boolean} shows - true if showing, false if mucking
 */
export function recordShowdown(gameId, playerId, cards, shows) {
  const recorder = getRecorder(gameId);
  recorder.actions.push({
    action_number: ++recorder.actionCounter,
    player_id: playerId,
    action: shows ? "Shows Cards" : "Mucks Cards",
    cards: shows ? cards : undefined,
    street: "Showdown",
  });
}

/**
 * Builds OHH rounds array from recorded actions
 * @param {Recorder} recorder
 * @returns {OHHRound[]}
 */
function buildRounds(recorder) {
  /** @type {OHHRound[]} */
  const rounds = [];
  /** @type {OHHRound|null} */
  let currentRound = null;
  let roundId = 0;

  for (const action of recorder.actions) {
    // Use the street stored with each action
    const actionStreet = action.street || "Preflop";

    // Create new round if needed
    if (!currentRound || currentRound.street !== actionStreet) {
      currentRound = {
        id: roundId++,
        street: actionStreet,
        actions: [],
      };

      // Add board cards if this street has them
      const streetCards = recorder.boardByStreet.get(actionStreet);
      if (streetCards) {
        currentRound.cards = streetCards;
      }

      rounds.push(currentRound);
    }

    const actionCopy = { ...action };
    delete actionCopy.street;
    if (actionCopy.amount !== undefined) {
      actionCopy.amount = toDollars(actionCopy.amount);
    }
    currentRound.actions.push(actionCopy);
  }

  return rounds;
}

/**
 * Finalizes and saves the current hand
 * @param {Game} game
 * @param {PotResult[]} [potResults]
 */
export async function finalizeHand(game, potResults = []) {
  const recorder = getRecorder(game.id);

  if (recorder.actions.length === 0) {
    return; // No actions recorded, skip
  }

  const pots = potResults.map((pot, index) => ({
    number: index,
    amount: toDollars(pot.potAmount),
    winning_hand: pot.winningHand
      ? HandRankings.formatHand(pot.winningHand)
      : null,
    winning_cards: pot.winningCards || null,
    player_wins: pot.awards.map((award) => {
      const seat = /** @type {OccupiedSeat} */ (game.seats[award.seat]);
      return {
        player_id: seat.player.id,
        win_amount: toDollars(award.amount),
        contributed_rake: 0,
      };
    }),
  }));

  const playersInDollars = recorder.players.map((p) => ({
    ...p,
    starting_stack: toDollars(p.starting_stack),
  }));

  /** @type {OHHHand} */
  const hand = {
    spec_version: "1.4.6",
    site_name: "Pluton Poker",
    game_number: `${game.id}-${recorder.handNumber}`,
    start_date_utc: recorder.startTime || new Date().toISOString(),
    game_type: "Holdem",
    bet_limit: { bet_type: "NL" },
    table_size: game.seats.length,
    dealer_seat: recorder.dealerSeat,
    small_blind_amount: toDollars(recorder.blinds.small),
    big_blind_amount: toDollars(recorder.blinds.big),
    ante_amount: toDollars(recorder.blinds.ante),
    players: playersInDollars,
    rounds: buildRounds(recorder),
    pots,
  };

  // Add tournament info if this is a tournament hand
  if (recorder.tournament?.active) {
    hand.tournament = true;
    hand.tournament_info = {
      tournament_number: game.id,
      name: "Sit & Go",
      start_date_utc:
        recorder.tournament.startTime ||
        recorder.startTime ||
        new Date().toISOString(),
      currency: "USD",
      buyin_amount: 0, // No buy-in tracking for v1
      fee_amount: 0,
      initial_stack: toDollars(recorder.tournament.initialStack),
      type: "SnG",
      speed: "Regular",
    };
  }

  // Add to cache
  const cacheKey = `${game.id}-${recorder.handNumber}`;
  addToCache(cacheKey, hand);

  // Write to file
  await writeHandToFile(game.id, hand);

  // Reset for next hand (keep handNumber and tournament info)
  recorder.actions = [];
  recorder.actionCounter = 0;
  recorder.currentStreet = "Preflop";
  recorder.startTime = null;
  recorder.players = [];
  recorder.boardByStreet = new Map();
  // Note: tournament info is kept but will be refreshed on next startHand
}

/**
 * Gets the current hand number for a game
 * @param {string} gameId
 * @returns {number}
 */
export function getHandNumber(gameId) {
  const recorder = recorders.get(gameId);
  return recorder?.handNumber || 0;
}

/**
 * Clears the recorder for a game (for testing)
 * @param {string} gameId
 */
export function clearRecorder(gameId) {
  recorders.delete(gameId);
}
