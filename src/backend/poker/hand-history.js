import { appendFile, mkdir, readFile } from "node:fs/promises"
import { existsSync } from "node:fs"

/**
 * @typedef {import('./game.js').Game} Game
 * @typedef {import('./deck.js').Card} Card
 * @typedef {import('./seat.js').OccupiedSeat} OccupiedSeat
 */

/**
 * @typedef {object} OHHAction
 * @property {number} action_number
 * @property {string} player_id
 * @property {string} action
 * @property {number} [amount]
 * @property {boolean} [is_allin]
 * @property {string[]} [cards]
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
 * @property {Array<{ number: number, amount: number, player_wins: Array<{ player_id: string, win_amount: number, contributed_rake: number }> }>} pots
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
const CACHE_LIMIT = 1000
/** @type {Map<string, OHHHand>} */
const cache = new Map()

/** @type {Map<string, Recorder>} */
const recorders = new Map()

/**
 * Gets the data directory path
 * @returns {string}
 */
function getDataDir() {
  return process.env.DATA_DIR || "data"
}

/**
 * Converts internal card format to OHH format
 * @param {Card} card
 * @returns {string}
 */
function cardToOHH(card) {
  const rankMap = {
    ace: "A",
    2: "2",
    3: "3",
    4: "4",
    5: "5",
    6: "6",
    7: "7",
    8: "8",
    9: "9",
    10: "T",
    jack: "J",
    queen: "Q",
    king: "K",
  }
  const suitMap = {
    hearts: "h",
    diamonds: "d",
    clubs: "c",
    spades: "s",
  }
  return `${rankMap[card.rank]}${suitMap[card.suit]}`
}

/**
 * Gets or creates a recorder for a game
 * @param {string} gameId
 * @returns {Recorder}
 */
export function getRecorder(gameId) {
  let recorder = recorders.get(gameId)
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
    }
    recorders.set(gameId, recorder)
  }
  return recorder
}

/**
 * Starts recording a new hand
 * @param {string} gameId
 * @param {Game} game
 */
export function startHand(gameId, game) {
  const recorder = getRecorder(gameId)
  recorder.handNumber++
  recorder.actions = []
  recorder.actionCounter = 0
  recorder.currentStreet = "Preflop"
  recorder.startTime = new Date().toISOString()
  recorder.dealerSeat = game.button + 1 // OHH uses 1-indexed seats
  recorder.blinds = { ...game.blinds }
  recorder.boardByStreet = new Map()

  // Capture players at hand start
  recorder.players = []
  for (let i = 0; i < game.seats.length; i++) {
    const seat = game.seats[i]
    if (!seat.empty && !seat.sittingOut) {
      recorder.players.push({
        id: seat.player.id,
        seat: i + 1, // OHH uses 1-indexed seats
        name: seat.player.name,
        starting_stack: seat.stack + seat.bet, // Include any posted blinds
      })
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
  const recorder = getRecorder(gameId)
  const actionMap = {
    sb: "Post SB",
    bb: "Post BB",
    ante: "Post Ante",
  }
  recorder.actions.push({
    action_number: ++recorder.actionCounter,
    player_id: playerId,
    action: actionMap[blindType],
    amount,
  })
}

/**
 * Records cards dealt to a player
 * @param {string} gameId
 * @param {string} playerId
 * @param {Card[]} cards
 */
export function recordDealtCards(gameId, playerId, cards) {
  const recorder = getRecorder(gameId)
  recorder.actions.push({
    action_number: ++recorder.actionCounter,
    player_id: playerId,
    action: "Dealt Cards",
    cards: cards.map(cardToOHH),
  })
}

/**
 * Records a betting action
 * @param {string} gameId
 * @param {string} playerId
 * @param {string} action - fold, check, call, bet, raise
 * @param {number} [amount]
 * @param {boolean} [isAllIn]
 */
export function recordAction(gameId, playerId, action, amount, isAllIn = false) {
  const recorder = getRecorder(gameId)

  // Capitalize action for OHH format
  const ohhAction = action.charAt(0).toUpperCase() + action.slice(1)

  /** @type {OHHAction} */
  const actionObj = {
    action_number: ++recorder.actionCounter,
    player_id: playerId,
    action: ohhAction,
  }

  if (amount !== undefined) {
    actionObj.amount = amount
    actionObj.is_allin = isAllIn
  }

  recorder.actions.push(actionObj)
}

/**
 * Records the start of a new street
 * @param {string} gameId
 * @param {string} street - flop, turn, river
 * @param {Card[]} [boardCards] - new board cards for this street
 */
export function recordStreet(gameId, street, boardCards) {
  const recorder = getRecorder(gameId)
  const streetMap = {
    flop: "Flop",
    turn: "Turn",
    river: "River",
  }
  recorder.currentStreet = streetMap[street] || street

  if (boardCards && boardCards.length > 0) {
    recorder.boardByStreet.set(
      recorder.currentStreet,
      boardCards.map(cardToOHH)
    )
  }
}

/**
 * Records a showdown action
 * @param {string} gameId
 * @param {string} playerId
 * @param {Card[]} cards
 * @param {boolean} shows - true if showing, false if mucking
 */
export function recordShowdown(gameId, playerId, cards, shows) {
  const recorder = getRecorder(gameId)
  recorder.actions.push({
    action_number: ++recorder.actionCounter,
    player_id: playerId,
    action: shows ? "Shows Cards" : "Mucks Cards",
    cards: shows ? cards.map(cardToOHH) : undefined,
  })
}

/**
 * Builds OHH rounds array from recorded actions
 * @param {Recorder} recorder
 * @returns {OHHRound[]}
 */
function buildRounds(recorder) {
  /** @type {OHHRound[]} */
  const rounds = []
  /** @type {OHHRound|null} */
  let currentRound = null
  let roundId = 0

  // Street order for tracking
  const streetOrder = ["Preflop", "Flop", "Turn", "River", "Showdown"]
  let currentStreetIndex = 0

  for (const action of recorder.actions) {
    // Determine which street this action belongs to
    let actionStreet = "Preflop"

    // Check if this action starts a new street based on action type
    if (
      action.action === "Dealt Cards" &&
      currentStreetIndex === 0 &&
      currentRound !== null
    ) {
      // Still in preflop dealing
      actionStreet = "Preflop"
    } else if (
      ["Post SB", "Post BB", "Post Ante", "Dealt Cards"].includes(action.action)
    ) {
      actionStreet = "Preflop"
    } else if (["Shows Cards", "Mucks Cards"].includes(action.action)) {
      actionStreet = "Showdown"
    } else {
      actionStreet = streetOrder[currentStreetIndex]
    }

    // Create new round if needed
    if (!currentRound || currentRound.street !== actionStreet) {
      // Check if we need to advance street
      const newStreetIndex = streetOrder.indexOf(actionStreet)
      if (newStreetIndex > currentStreetIndex) {
        currentStreetIndex = newStreetIndex
      }

      currentRound = {
        id: roundId++,
        street: actionStreet,
        actions: [],
      }

      // Add board cards if this street has them
      const streetCards = recorder.boardByStreet.get(actionStreet)
      if (streetCards) {
        currentRound.cards = streetCards
      }

      rounds.push(currentRound)
    }

    currentRound.actions.push(action)
  }

  return rounds
}

/**
 * Finalizes and saves the current hand
 * @param {string} gameId
 * @param {Game} game
 * @param {Array<{ visibleSeats: number[], potAmount: number, winners: number[], winningHand: object|null }>} [potResults]
 */
export async function finalizeHand(gameId, game, potResults = []) {
  const recorder = getRecorder(gameId)

  if (recorder.actions.length === 0) {
    return // No actions recorded, skip
  }

  // Build pots array
  const pots = potResults.map((pot, index) => ({
    number: index,
    amount: pot.potAmount,
    player_wins: pot.winners.map((seatIndex) => {
      const seat = /** @type {OccupiedSeat} */ (game.seats[seatIndex])
      return {
        player_id: seat.player.id,
        win_amount: Math.floor(pot.potAmount / pot.winners.length),
        contributed_rake: 0,
      }
    }),
  }))

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
  }

  // Add to cache
  const cacheKey = `${gameId}-${recorder.handNumber}`
  cache.set(cacheKey, hand)

  // Evict oldest if over limit
  if (cache.size > CACHE_LIMIT) {
    const firstKey = cache.keys().next().value
    cache.delete(firstKey)
  }

  // Write to file
  await writeHandToFile(gameId, hand)

  // Reset for next hand (keep handNumber)
  recorder.actions = []
  recorder.actionCounter = 0
  recorder.currentStreet = "Preflop"
  recorder.startTime = null
  recorder.players = []
  recorder.boardByStreet = new Map()
}

/**
 * Writes a hand to the .ohh file
 * @param {string} gameId
 * @param {OHHHand} hand
 */
async function writeHandToFile(gameId, hand) {
  const dataDir = getDataDir()

  // Ensure data directory exists
  if (!existsSync(dataDir)) {
    await mkdir(dataDir, { recursive: true })
  }

  const filePath = `${dataDir}/${gameId}.ohh`
  const content = JSON.stringify({ ohh: hand }) + "\n\n"

  await appendFile(filePath, content, "utf8")
}

/**
 * Reads all hands from a game's .ohh file
 * @param {string} gameId
 * @returns {Promise<OHHHand[]>}
 */
async function readHandsFromFile(gameId) {
  const dataDir = getDataDir()
  const filePath = `${dataDir}/${gameId}.ohh`

  if (!existsSync(filePath)) {
    return []
  }

  const content = await readFile(filePath, "utf8")
  const lines = content.split("\n\n").filter(Boolean)

  return lines.map((line) => JSON.parse(line).ohh)
}

/**
 * Gets a hand from cache or file
 * @param {string} gameId
 * @param {number} handNumber
 * @returns {Promise<OHHHand|null>}
 */
export async function getHand(gameId, handNumber) {
  const cacheKey = `${gameId}-${handNumber}`

  // Check cache first
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey) || null
  }

  // Read from file
  const hands = await readHandsFromFile(gameId)
  const hand = hands.find((h) => h.game_number === `${gameId}-${handNumber}`)

  if (hand) {
    // Add to cache for future requests
    cache.set(cacheKey, hand)
    if (cache.size > CACHE_LIMIT) {
      const firstKey = cache.keys().next().value
      cache.delete(firstKey)
    }
  }

  return hand || null
}

/**
 * Gets all hands for a game (for list endpoint)
 * @param {string} gameId
 * @returns {Promise<OHHHand[]>}
 */
export async function getAllHands(gameId) {
  return readHandsFromFile(gameId)
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
  const shownPlayerIds = new Set()
  for (const round of hand.rounds) {
    for (const action of round.actions) {
      if (action.action === "Shows Cards") {
        shownPlayerIds.add(action.player_id)
      }
    }
  }

  // Clone and filter rounds
  const filteredRounds = hand.rounds.map((round) => ({
    ...round,
    actions: round.actions.map((action) => {
      // Filter "Dealt Cards" actions
      if (action.action === "Dealt Cards") {
        const isOwnCards = action.player_id === playerId
        const wasShown = shownPlayerIds.has(action.player_id)

        if (isOwnCards || wasShown) {
          return action // Show cards
        } else {
          // Hide cards
          return {
            ...action,
            cards: ["??", "??"],
          }
        }
      }
      return action
    }),
  }))

  return {
    ...hand,
    rounds: filteredRounds,
  }
}

/**
 * Gets a summary of a hand for the hand list
 * @param {OHHHand} hand
 * @param {string} playerId - The requesting player's ID
 * @returns {{ game_number: string, hand_number: number, hole_cards: string[], winner_name: string|null, winner_id: string|null, pot: number, is_winner: boolean }}
 */
export function getHandSummary(hand, playerId) {
  // Extract hand number from game_number (format: "gameId-handNumber")
  const handNumber = parseInt(hand.game_number.split("-").pop() || "0", 10)

  // Find player's hole cards
  let holeCards = ["??", "??"]
  for (const round of hand.rounds) {
    for (const action of round.actions) {
      if (action.action === "Dealt Cards" && action.player_id === playerId) {
        holeCards = action.cards || ["??", "??"]
        break
      }
    }
  }

  // Find winner info
  let winnerName = null
  let winnerId = null
  let totalPot = 0
  let isWinner = false

  if (hand.pots.length > 0) {
    const mainPot = hand.pots[0]
    totalPot = mainPot.amount

    if (mainPot.player_wins.length > 0) {
      winnerId = mainPot.player_wins[0].player_id
      isWinner = winnerId === playerId

      // Find winner name from players array
      const winner = hand.players.find((p) => p.id === winnerId)
      winnerName = winner?.name || `Seat ${winner?.seat || "??"}`
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
  }
}

/**
 * Gets the current hand number for a game
 * @param {string} gameId
 * @returns {number}
 */
export function getHandNumber(gameId) {
  const recorder = recorders.get(gameId)
  return recorder?.handNumber || 0
}

/**
 * Clears the recorder for a game (for testing)
 * @param {string} gameId
 */
export function clearRecorder(gameId) {
  recorders.delete(gameId)
}

/**
 * Clears the cache (for testing)
 */
export function clearCache() {
  cache.clear()
}

/**
 * Gets cache size (for testing)
 * @returns {number}
 */
export function getCacheSize() {
  return cache.size
}
