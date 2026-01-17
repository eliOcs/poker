import { appendFile, mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import HandRankings from "./hand-rankings.js";

/**
 * @typedef {import('./game.js').Game} Game
 * @typedef {import('./deck.js').Card} Card
 * @typedef {import('./seat.js').OccupiedSeat} OccupiedSeat
 * @typedef {import('./showdown.js').PotResult} PotResult
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
 */

/**
 * @typedef {object} Recorder
 * @property {string} gameId
 * @property {number} handNumber
 * @property {OHHAction[]} actions
 * @property {number} actionCounter
 * @property {string} currentStreet
 * @property {string|null} startTime
 * @property {Array<{ id: string, seat: number, name: string|null, starting_stack: number }>} players
 * @property {number} dealerSeat
 * @property {{ ante: number, small: number, big: number }} blinds
 * @property {Map<string, string[]>} boardByStreet
 */

// FIFO cache for recent hands
const CACHE_LIMIT = 1000;
/** @type {Map<string, OHHHand>} */
const cache = new Map();

/** @type {Map<string, Recorder>} */
const recorders = new Map();

/**
 * Gets the data directory path
 * @returns {string}
 */
function getDataDir() {
  return process.env.DATA_DIR || "data";
}

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
    };
    recorders.set(gameId, recorder);
  }
  return recorder;
}

/**
 * Starts recording a new hand
 * @param {string} gameId
 * @param {Game} game
 */
export function startHand(gameId, game) {
  const recorder = getRecorder(gameId);
  recorder.handNumber++;
  recorder.actions = [];
  recorder.actionCounter = 0;
  recorder.currentStreet = "Preflop";
  recorder.startTime = new Date().toISOString();
  recorder.dealerSeat = game.button + 1; // OHH uses 1-indexed seats
  recorder.blinds = { ...game.blinds };
  recorder.boardByStreet = new Map();

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
 * @param {number} amount
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
 * @param {number} [amount]
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

    // Clone action without the street field for the output
    const actionCopy = { ...action };
    delete actionCopy.street;
    currentRound.actions.push(actionCopy);
  }

  return rounds;
}

/**
 * Finalizes and saves the current hand
 * @param {string} gameId
 * @param {Game} game
 * @param {PotResult[]} [potResults]
 */
export async function finalizeHand(gameId, game, potResults = []) {
  const recorder = getRecorder(gameId);

  if (recorder.actions.length === 0) {
    return; // No actions recorded, skip
  }

  // Build pots array
  const pots = potResults.map((pot, index) => ({
    number: index,
    amount: pot.potAmount,
    winning_hand: pot.winningHand
      ? HandRankings.formatHand(pot.winningHand)
      : null,
    winning_cards: pot.winningCards || null,
    player_wins: pot.winners.map((seatIndex) => {
      const seat = /** @type {OccupiedSeat} */ (game.seats[seatIndex]);
      return {
        player_id: seat.player.id,
        win_amount: Math.floor(pot.potAmount / pot.winners.length),
        contributed_rake: 0,
      };
    }),
  }));

  // Build the OHH hand object
  /** @type {OHHHand} */
  const hand = {
    spec_version: "1.4.6",
    site_name: "Pluton Poker",
    game_number: `${gameId}-${recorder.handNumber}`,
    start_date_utc: recorder.startTime || new Date().toISOString(),
    game_type: "Holdem",
    bet_limit: { bet_type: "NL" },
    table_size: game.seats.length,
    dealer_seat: recorder.dealerSeat,
    small_blind_amount: recorder.blinds.small,
    big_blind_amount: recorder.blinds.big,
    ante_amount: recorder.blinds.ante,
    players: recorder.players,
    rounds: buildRounds(recorder),
    pots,
  };

  // Add to cache
  const cacheKey = `${gameId}-${recorder.handNumber}`;
  cache.set(cacheKey, hand);

  // Evict oldest if over limit
  if (cache.size > CACHE_LIMIT) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }

  // Write to file
  await writeHandToFile(gameId, hand);

  // Reset for next hand (keep handNumber)
  recorder.actions = [];
  recorder.actionCounter = 0;
  recorder.currentStreet = "Preflop";
  recorder.startTime = null;
  recorder.players = [];
  recorder.boardByStreet = new Map();
}

/**
 * Writes a hand to the .ohh file
 * @param {string} gameId
 * @param {OHHHand} hand
 */
async function writeHandToFile(gameId, hand) {
  const dataDir = getDataDir();

  // Ensure data directory exists
  if (!existsSync(dataDir)) {
    await mkdir(dataDir, { recursive: true });
  }

  const filePath = `${dataDir}/${gameId}.ohh`;
  const content = JSON.stringify({ ohh: hand }) + "\n\n";

  await appendFile(filePath, content, "utf8");
}

/**
 * Reads all hands from a game's .ohh file
 * @param {string} gameId
 * @returns {Promise<OHHHand[]>}
 */
async function readHandsFromFile(gameId) {
  const dataDir = getDataDir();
  const filePath = `${dataDir}/${gameId}.ohh`;

  if (!existsSync(filePath)) {
    return [];
  }

  const content = await readFile(filePath, "utf8");
  const lines = content.split("\n\n").filter(Boolean);

  return lines.map((line) => JSON.parse(line).ohh);
}

/**
 * Gets a hand from cache or file
 * @param {string} gameId
 * @param {number} handNumber
 * @returns {Promise<OHHHand|null>}
 */
export async function getHand(gameId, handNumber) {
  const cacheKey = `${gameId}-${handNumber}`;

  // Check cache first
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey) || null;
  }

  // Read from file
  const hands = await readHandsFromFile(gameId);
  const hand = hands.find((h) => h.game_number === `${gameId}-${handNumber}`);

  if (hand) {
    // Add to cache for future requests
    cache.set(cacheKey, hand);
    if (cache.size > CACHE_LIMIT) {
      const firstKey = cache.keys().next().value;
      if (firstKey) cache.delete(firstKey);
    }
  }

  return hand || null;
}

/**
 * Gets all hands for a game (for list endpoint)
 * @param {string} gameId
 * @returns {Promise<OHHHand[]>}
 */
export async function getAllHands(gameId) {
  return readHandsFromFile(gameId);
}

/**
 * Filters a hand for a specific player's view
 * Hides opponent hole cards unless shown at showdown
 * @param {OHHHand} hand
 * @param {string} playerId
 * @returns {OHHHand}
 */
export function filterHandForPlayer(hand, playerId) {
  // Find which players showed their cards at showdown
  const shownPlayerIds = new Set();
  for (const round of hand.rounds) {
    for (const action of round.actions) {
      if (action.action === "Shows Cards") {
        shownPlayerIds.add(action.player_id);
      }
    }
  }

  // Clone and filter rounds
  const filteredRounds = hand.rounds.map((round) => ({
    ...round,
    actions: round.actions.map((action) => {
      // Filter "Dealt Cards" actions
      if (action.action === "Dealt Cards") {
        const isOwnCards = action.player_id === playerId;
        const wasShown = shownPlayerIds.has(action.player_id);

        if (isOwnCards || wasShown) {
          return action; // Show cards
        } else {
          // Hide cards
          return {
            ...action,
            cards: ["??", "??"],
          };
        }
      }
      return action;
    }),
  }));

  return {
    ...hand,
    rounds: filteredRounds,
  };
}

/**
 * Gets a summary of a hand for the hand list
 * @param {OHHHand} hand
 * @param {string} playerId - The requesting player's ID
 * @returns {{ game_number: string, hand_number: number, hole_cards: (Card | string)[], winner_name: string|null, winner_id: string|null, pot: number, is_winner: boolean }}
 */
export function getHandSummary(hand, playerId) {
  // Extract hand number from game_number (format: "gameId-handNumber")
  const handNumber = parseInt(hand.game_number.split("-").pop() || "0", 10);

  // Find player's hole cards
  let holeCards = ["??", "??"];
  for (const round of hand.rounds) {
    for (const action of round.actions) {
      if (action.action === "Dealt Cards" && action.player_id === playerId) {
        holeCards = action.cards || ["??", "??"];
        break;
      }
    }
  }

  // Find winner info
  let winnerName = null;
  let winnerId = null;
  let totalPot = 0;
  let isWinner = false;

  if (hand.pots.length > 0) {
    const mainPot = hand.pots[0];
    totalPot = mainPot.amount;

    if (mainPot.player_wins.length > 0) {
      winnerId = mainPot.player_wins[0].player_id;
      isWinner = winnerId === playerId;

      // Find winner name from players array
      const winner = hand.players.find((p) => p.id === winnerId);
      winnerName = winner?.name || `Seat ${winner?.seat || "??"}`;
    }
  }

  return {
    game_number: hand.game_number,
    hand_number: handNumber,
    hole_cards: holeCards,
    winner_name: winnerName,
    winner_id: winnerId,
    pot: totalPot,
    is_winner: isWinner,
  };
}

/**
 * @typedef {object} HistoryViewSeat
 * @property {boolean} empty
 * @property {{ id: string, name: string }} [player]
 * @property {number} [stack]
 * @property {string[]} [cards]
 * @property {number|null} [handResult]
 * @property {string|null} [handRank]
 * @property {string[]|null} [winningCards]
 * @property {boolean} [isCurrentPlayer]
 * @property {boolean} [folded]
 * @property {boolean} [allIn]
 * @property {boolean} [sittingOut]
 * @property {boolean} [disconnected]
 * @property {boolean} [isActing]
 */

/**
 * @typedef {object} HistoryView
 * @property {HistoryViewSeat[]} seats
 * @property {{ cards: string[], phase: string }} board
 * @property {number} pot
 * @property {{ playerName: string, handRank: string|null, amount: number }|null} winnerMessage
 * @property {string[]|null} winningCards
 * @property {number} button
 */

/**
 * Converts OHH hand data to game view format for rendering
 * @param {OHHHand} hand - The OHH hand data
 * @param {string} playerId - The requesting player's ID
 * @returns {HistoryView}
 */
export function getHandView(hand, playerId) {
  // Build a map of player cards from Dealt Cards actions
  /** @type {Map<string, string[]>} */
  const playerCards = new Map();
  for (const round of hand.rounds) {
    for (const action of round.actions) {
      if (action.action === "Dealt Cards" && action.cards) {
        playerCards.set(action.player_id, action.cards);
      }
    }
  }

  // Build a set of winners and their win amounts
  /** @type {Map<string, number>} */
  const winAmounts = new Map();
  for (const pot of hand.pots) {
    for (const win of pot.player_wins) {
      const current = winAmounts.get(win.player_id) || 0;
      winAmounts.set(win.player_id, current + win.win_amount);
    }
  }

  // Get winning hand info from main pot
  const mainPot = hand.pots[0];
  const winningHand = mainPot?.winning_hand || null;
  const winningCards = mainPot?.winning_cards || null;

  // Build seats array (6 seats, sparse based on player positions)
  /** @type {HistoryViewSeat[]} */
  const seats = [];
  for (let i = 0; i < hand.table_size; i++) {
    const player = hand.players.find((p) => p.seat === i + 1);
    if (!player) {
      seats.push({ empty: true });
      continue;
    }

    const isCurrentPlayer = player.id === playerId;
    const isWinner = winAmounts.has(player.id);
    const winAmount = winAmounts.get(player.id) || 0;
    const playerName = player.name || `Seat ${player.seat}`;
    const displayName = isCurrentPlayer ? `${playerName} (you)` : playerName;

    seats.push({
      empty: false,
      player: { id: player.id, name: displayName || `Seat ${i + 1}` },
      stack: player.starting_stack,
      cards: playerCards.get(player.id) || [],
      handResult: winAmount > 0 ? winAmount : null,
      handRank: isWinner ? winningHand : null,
      winningCards: isWinner ? winningCards : null,
      isCurrentPlayer,
      folded: false,
      allIn: false,
      sittingOut: false,
      disconnected: false,
      isActing: false,
    });
  }

  // Extract board cards and last street from rounds
  /** @type {string[]} */
  const boardCards = [];
  let lastStreet = "Preflop";
  for (const round of hand.rounds) {
    if (round.cards) {
      boardCards.push(...round.cards);
    }
    if (round.street) {
      lastStreet = round.street;
    }
  }

  // Calculate total pot
  let totalPot = 0;
  for (const pot of hand.pots) {
    totalPot += pot.amount || 0;
  }

  // Build winner message
  let winnerMessage = null;
  if (mainPot?.player_wins?.length > 0) {
    const winnerId = mainPot.player_wins[0].player_id;
    const winAmount = mainPot.player_wins[0].win_amount;
    const winner = hand.players.find((p) => p.id === winnerId);
    winnerMessage = {
      playerName: winner?.name || `Seat ${winner?.seat || "??"}`,
      handRank: winningHand,
      amount: winAmount,
    };
  }

  return {
    seats,
    board: { cards: boardCards, phase: lastStreet },
    pot: totalPot,
    winnerMessage,
    winningCards,
    button: hand.dealer_seat,
  };
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

/**
 * Clears the cache (for testing)
 */
export function clearCache() {
  cache.clear();
}

/**
 * Gets cache size (for testing)
 * @returns {number}
 */
export function getCacheSize() {
  return cache.size;
}
