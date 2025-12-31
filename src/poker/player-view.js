import * as Betting from "./betting.js";
import { countPlayersWithChips } from "./actions.js";

/**
 * @typedef {import('./game.js').Game} Game
 * @typedef {import('./game.js').Blinds} Blinds
 * @typedef {import('./game.js').Board} Board
 * @typedef {import('./deck.js').Card} Card
 * @typedef {import('./seat.js').Seat} SeatType
 * @typedef {import('./seat.js').Player} Player
 */

/**
 * @typedef {object} HiddenCard
 * @property {true} hidden
 */

/**
 * @typedef {object} ActionSit
 * @property {'sit'} action
 * @property {number} seat
 */

/**
 * @typedef {object} ActionBuyIn
 * @property {'buyIn'} action
 * @property {number} min
 * @property {number} max
 */

/**
 * @typedef {object} ActionCheck
 * @property {'check'} action
 */

/**
 * @typedef {object} ActionCall
 * @property {'call'} action
 * @property {number} amount
 */

/**
 * @typedef {object} ActionBet
 * @property {'bet'} action
 * @property {number} min
 * @property {number} max
 */

/**
 * @typedef {object} ActionRaise
 * @property {'raise'} action
 * @property {number} min
 * @property {number} max
 */

/**
 * @typedef {object} ActionAllIn
 * @property {'allIn'} action
 * @property {number} amount
 */

/**
 * @typedef {object} ActionFold
 * @property {'fold'} action
 */

/**
 * @typedef {object} ActionStart
 * @property {'start'} action
 */

/**
 * @typedef {ActionSit|ActionBuyIn|ActionCheck|ActionCall|ActionBet|ActionRaise|ActionAllIn|ActionFold|ActionStart} PlayerAction
 */

/**
 * @typedef {object} ViewSeatEmpty
 * @property {true} empty
 * @property {PlayerAction[]} actions
 */

/**
 * @typedef {object} ViewSeatOccupied
 * @property {false} empty
 * @property {Player} player
 * @property {number} stack
 * @property {number} bet
 * @property {boolean} folded
 * @property {boolean} allIn
 * @property {(Card|HiddenCard)[]} cards
 * @property {PlayerAction[]} actions
 * @property {boolean} isCurrentPlayer
 * @property {boolean} isActing
 */

/**
 * @typedef {ViewSeatEmpty|ViewSeatOccupied} ViewSeat
 */

/**
 * @typedef {object} ViewHand
 * @property {string} phase
 * @property {number} pot
 * @property {number} currentBet
 * @property {number} actingSeat
 */

/**
 * @typedef {object} PlayerView
 * @property {boolean} running
 * @property {number} button
 * @property {Blinds} blinds
 * @property {Board} board
 * @property {ViewHand|null} hand
 * @property {ViewSeat[]} seats
 * @property {number|null} countdown
 */

/**
 * Finds the seat index for a player
 * @param {Game} game
 * @param {string} playerId
 * @returns {number} - Seat index or -1 if not found
 */
function findPlayerSeat(game, playerId) {
  return game.seats.findIndex(
    (seat) => !seat.empty && seat.player?.id === playerId,
  );
}

/**
 * Determines if cards should be shown for a seat
 * @param {SeatType} seat - The seat to check
 * @param {number} seatIndex - Index of this seat
 * @param {number} playerSeatIndex - Index of the viewing player's seat
 * @param {Game} game - Game state
 * @returns {boolean}
 */
function shouldShowCards(seat, seatIndex, playerSeatIndex, game) {
  if (seat.empty || !seat.cards || seat.cards.length === 0) {
    return false;
  }

  // Always show own cards
  if (seatIndex === playerSeatIndex) {
    return true;
  }

  // Show at showdown
  if (game.hand?.phase === "showdown") {
    return true;
  }

  return false;
}

/**
 * Creates a hidden card placeholder
 * @returns {HiddenCard}
 */
function hiddenCard() {
  return { hidden: true };
}

/**
 * Gets available actions for a seat
 * @param {Game} game
 * @param {number} seatIndex
 * @param {number} playerSeatIndex
 * @returns {PlayerAction[]}
 */
function getAvailableActions(game, seatIndex, playerSeatIndex) {
  /** @type {PlayerAction[]} */
  const actions = [];
  const seat = game.seats[seatIndex];

  // Empty seat - anyone can sit
  if (seat.empty) {
    actions.push({ action: "sit", seat: seatIndex });
    return actions;
  }

  // Not the player's seat - no actions
  if (seatIndex !== playerSeatIndex) {
    return actions;
  }

  // Player is seated but hand not active - can buy in if no stack, or start game
  if (game.hand?.phase === "waiting") {
    if (seat.stack === 0) {
      actions.push({ action: "buyIn", min: 20, max: 100 });
    } else if (game.countdown === null && countPlayersWithChips(game) >= 2) {
      // Player has chips, no countdown active, enough players - can start
      actions.push({ action: "start" });
    }
    return actions;
  }

  // Not this player's turn - no betting actions
  if (game.hand?.actingSeat !== seatIndex) {
    return actions;
  }

  // Player's turn to act - generate valid betting actions
  const currentBet = game.hand.currentBet;
  const playerBet = seat.bet;
  const playerStack = seat.stack;
  const toCall = currentBet - playerBet;

  // Check is valid when there's nothing to call
  if (toCall === 0) {
    actions.push({ action: "check" });
  }

  // Call is valid when there's something to call
  if (toCall > 0 && playerStack > 0) {
    const callAmount = Math.min(toCall, playerStack);
    actions.push({ action: "call", amount: callAmount });
  }

  // Bet is valid when no one has bet yet (postflop)
  if (currentBet === 0 && playerStack > 0) {
    const minBet = Betting.getMinBet(game);
    actions.push({
      action: "bet",
      min: Math.min(minBet, playerStack),
      max: playerStack,
    });
  }

  // Raise is valid when there's a bet and player has more than call amount
  if (currentBet > 0 && playerStack > toCall) {
    const minRaise = Betting.getMinRaise(game);
    const maxRaise = playerBet + playerStack;
    if (maxRaise >= minRaise) {
      actions.push({
        action: "raise",
        min: Math.min(minRaise, maxRaise),
        max: maxRaise,
      });
    }
  }

  // All-in is always available if player has chips
  if (playerStack > 0) {
    actions.push({ action: "allIn", amount: playerStack });
  }

  // Fold is always available when there's something to call
  if (toCall > 0) {
    actions.push({ action: "fold" });
  }

  return actions;
}

/**
 * Creates a player-specific view of the game state
 * - Hides opponent cards (unless showdown)
 * - Generates available actions
 * - Removes deck
 *
 * @param {Game} game - Full game state
 * @param {Player} player - The viewing player
 * @returns {PlayerView} - Filtered game state for this player
 */
export default function playerView(game, player) {
  const playerSeatIndex = findPlayerSeat(game, player.id);

  return {
    running: game.running,
    button: game.button,
    blinds: game.blinds,
    board: game.board,
    hand: game.hand
      ? {
          phase: game.hand.phase,
          pot: game.hand.pot,
          currentBet: game.hand.currentBet,
          actingSeat: game.hand.actingSeat,
        }
      : null,
    countdown: game.countdown,
    seats: game.seats.map((seat, index) => {
      if (seat.empty) {
        return {
          empty: true,
          actions: getAvailableActions(game, index, playerSeatIndex),
        };
      }

      const showCards = shouldShowCards(seat, index, playerSeatIndex, game);

      return {
        empty: false,
        player: seat.player,
        stack: seat.stack,
        bet: seat.bet,
        folded: seat.folded,
        allIn: seat.allIn,
        cards: showCards
          ? seat.cards
          : seat.cards?.map(() => hiddenCard()) || [],
        actions: getAvailableActions(game, index, playerSeatIndex),
        isCurrentPlayer: index === playerSeatIndex,
        isActing: index === game.hand?.actingSeat,
      };
    }),
  };
}
