/**
 * @typedef {import('./types.js').Cents} Cents
 * @typedef {import('./deck.js').Card} Card
 * @typedef {import('../id.js').Id} Id
 */

/**
 * @typedef {object} Player
 * @property {Id} id - Player unique identifier
 * @property {string|null} name - Player display name
 */

/**
 * @typedef {object} EmptySeat
 * @property {true} empty
 */

/**
 * @typedef {object} OccupiedSeat
 * @property {false} empty
 * @property {Player} player - Player object with id
 * @property {Cents} stack - Chips behind (not in pot)
 * @property {Cents} bet - Current bet in this betting round
 * @property {Cents} totalInvested - Total chips put in pot this hand (for side pots)
 * @property {Cents} totalBuyIn - Cumulative buy-ins for this session (for ranking)
 * @property {number} handsPlayed - Number of hands played this session (for ranking)
 * @property {Card[]} cards - Hole cards
 * @property {boolean} folded - Has folded this hand
 * @property {boolean} allIn - Is all-in
 * @property {boolean} sittingOut - Is sitting out (not participating)
 * @property {boolean} missedBigBlind - Has missed big blind while sitting out (must post on return)
 * @property {boolean} disconnected - Whether player's WebSocket is disconnected
 * @property {string|null} lastAction - Last action taken (check, call, bet, raise, fold, allIn)
 * @property {Cents|null} handResult - Result of the hand (positive for win, negative for loss)
 * @property {Card[]|null} winningCards - The 5 cards forming the winning hand (only for winners)
 * @property {boolean} cardsRevealed - Whether cards were revealed at showdown
 * @property {[boolean, boolean]} shownCards - Which individual hole cards were voluntarily shown
 * @property {number|null} bustedPosition - Tournament finishing position (e.g., 6 for 6th place)
 * @property {string|null} [emote] - Transient emote emoji (set and cleared during broadcast)
 */

/**
 * @typedef {EmptySeat|OccupiedSeat} Seat
 */

/**
 * Creates an empty seat
 * @returns {EmptySeat}
 */
export function empty() {
  return { empty: true };
}

/**
 * Creates an occupied seat with a player
 * @param {Player} player - Player object with id
 * @param {Cents} [stack] - Initial chip stack
 * @returns {OccupiedSeat}
 */
export function occupied(player, stack = 0) {
  return {
    empty: false,
    player,
    stack,
    bet: 0,
    totalInvested: 0,
    totalBuyIn: 0,
    handsPlayed: 0,
    cards: [],
    folded: false,
    allIn: false,
    sittingOut: false,
    missedBigBlind: false,
    disconnected: false,
    lastAction: null,
    handResult: null,
    winningCards: null,
    cardsRevealed: false,
    shownCards: [false, false],
    bustedPosition: null,
  };
}

/**
 * Resets seat state for a new hand (keeps player and stack)
 * @param {OccupiedSeat} seat
 */
export function resetForNewHand(seat) {
  seat.bet = 0;
  seat.totalInvested = 0;
  seat.cards = [];
  seat.folded = false;
  seat.allIn = false;
  seat.lastAction = null;
  seat.handResult = null;
  seat.winningCards = null;
  seat.cardsRevealed = false;
  seat.shownCards = [false, false];
  // If sitting out, mark as having missed big blind
  if (seat.sittingOut) {
    seat.missedBigBlind = true;
  }
}

/**
 * Checks if a seat is active in the current hand (not folded, not sitting out, has player)
 * @param {Seat} seat
 * @returns {seat is OccupiedSeat}
 */
export function isActive(seat) {
  return !seat.empty && !seat.folded && !seat.sittingOut;
}

/**
 * Checks if a seat can act (active and not all-in)
 * @param {Seat} seat
 * @returns {seat is OccupiedSeat}
 */
export function canAct(seat) {
  if (seat.empty) return false;
  if (seat.folded || seat.allIn) return false;
  if (seat.sittingOut && seat.bet === 0) return false;
  return true;
}

/**
 * Checks if a seat can post blinds (occupied, not folded, has chips)
 * Used for tournament blind posting where sitting out players still pay blinds
 * @param {Seat} seat
 * @returns {seat is OccupiedSeat}
 */
export function canPostBlinds(seat) {
  return !seat.empty && !seat.folded && seat.stack > 0;
}
