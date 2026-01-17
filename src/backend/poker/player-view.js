import * as Betting from "./betting.js";
import { countPlayersWithChips } from "./actions.js";
import { isClockCallable } from "./game-tick.js";
import HandRankings from "./hand-rankings.js";
import * as Ranking from "./ranking.js";
import { HIDDEN, getRank } from "./deck.js";

/**
 * @typedef {import('./types.js').Cents} Cents
 * @typedef {import('./game.js').Game} Game
 * @typedef {import('./game.js').Blinds} Blinds
 * @typedef {import('./game.js').Board} Board
 * @typedef {import('./deck.js').Card} Card
 * @typedef {import('./seat.js').Seat} SeatType
 * @typedef {import('./seat.js').Player} Player
 */

/**
 * Hidden card is the string "??"
 * @typedef {typeof HIDDEN} HiddenCard
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
 * @property {Cents} bigBlind
 */

/**
 * @typedef {object} ActionCheck
 * @property {'check'} action
 */

/**
 * @typedef {object} ActionCall
 * @property {'call'} action
 * @property {Cents} amount
 */

/**
 * @typedef {object} ActionBet
 * @property {'bet'} action
 * @property {Cents} min
 * @property {Cents} max
 */

/**
 * @typedef {object} ActionRaise
 * @property {'raise'} action
 * @property {Cents} min
 * @property {Cents} max
 */

/**
 * @typedef {object} ActionAllIn
 * @property {'allIn'} action
 * @property {Cents} amount
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
 * @typedef {object} ActionSitOut
 * @property {'sitOut'} action
 */

/**
 * @typedef {object} ActionSitIn
 * @property {'sitIn'} action
 * @property {Cents} cost - Big blind cost to sit back in (0 if no missed blinds)
 */

/**
 * @typedef {object} ActionCallClock
 * @property {'callClock'} action
 */

/**
 * @typedef {object} ActionLeave
 * @property {'leave'} action
 */

/**
 * @typedef {ActionSit|ActionBuyIn|ActionCheck|ActionCall|ActionBet|ActionRaise|ActionAllIn|ActionFold|ActionStart|ActionSitOut|ActionSitIn|ActionCallClock|ActionLeave} PlayerAction
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
 * @property {Cents} stack
 * @property {Cents} bet
 * @property {boolean} folded
 * @property {boolean} allIn
 * @property {boolean} sittingOut
 * @property {boolean} disconnected
 * @property {(Card|HiddenCard)[]} cards
 * @property {PlayerAction[]} actions
 * @property {boolean} isCurrentPlayer
 * @property {boolean} isActing
 * @property {string|null} lastAction
 * @property {Cents|null} handResult
 * @property {string|null} handRank
 * @property {Card[]|null} winningCards - The 5 cards forming the winning hand (only for winners)
 */

/**
 * @typedef {ViewSeatEmpty|ViewSeatOccupied} ViewSeat
 */

/**
 * @typedef {object} ViewHand
 * @property {string} phase
 * @property {Cents} pot
 * @property {Cents} currentBet
 * @property {number} actingSeat
 * @property {number} actingTicks - Ticks the current player has been acting
 * @property {number} clockTicks - Ticks since clock was called (0 if not called)
 */

/**
 * @typedef {object} WinnerMessage
 * @property {string} playerName - Winner's player name/ID
 * @property {string|null} handRank - Winning hand description (null if won by fold)
 * @property {Cents} amount - Amount won
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
 * @property {WinnerMessage|null} winnerMessage
 * @property {Ranking.PlayerRanking[]} rankings
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

  // Show at showdown or when hand result is set (post-showdown)
  if (game.hand?.phase === "showdown" || seat.handResult !== null) {
    return true;
  }

  return false;
}

/**
 * Creates a hidden card placeholder
 * @returns {HiddenCard}
 */
function hiddenCard() {
  return HIDDEN;
}

/**
 * @param {Card[]} holeCards
 * @param {Card[]} boardCards
 * @returns {string|null}
 */
function calculateHandRank(holeCards, boardCards) {
  if (!holeCards || holeCards.length < 2) {
    return null;
  }

  const allCards = [...holeCards, ...boardCards];

  // Need at least 5 cards for a full hand evaluation
  if (allCards.length >= 5) {
    const result = HandRankings.bestCombination(allCards);
    return HandRankings.formatHand(result.hand);
  }

  // For just hole cards (preflop), check for pair or high card
  if (holeCards.length === 2) {
    const rank0 = getRank(holeCards[0]);
    const rank1 = getRank(holeCards[1]);
    if (rank0 === rank1) {
      /** @type {import('./hand-rankings.js').Pair} */
      const hand = { name: "pair", of: rank0, kickers: [] };
      return HandRankings.formatHand(hand);
    }
    // Show high card
    const highCard =
      HandRankings.getRankValue(rank0) > HandRankings.getRankValue(rank1)
        ? rank0
        : rank1;
    /** @type {import('./hand-rankings.js').HighCard} */
    const hand = { name: "high card", ranks: [highCard] };
    return HandRankings.formatHand(hand);
  }

  return null;
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

  // Empty seat - can sit only if not already seated
  if (seat.empty) {
    if (playerSeatIndex === -1) {
      actions.push({ action: "sit", seat: seatIndex });
    }
    return actions;
  }

  // Not the player's seat - only callClock action possible
  if (seatIndex !== playerSeatIndex) {
    // Call clock action - available when someone else is taking too long
    // This is checked on the player's OWN seat actions, not the acting player's seat
    return actions;
  }

  // Call clock action - available when someone else is taking too long
  if (
    game.hand?.actingSeat !== -1 &&
    game.hand?.actingSeat !== playerSeatIndex &&
    isClockCallable(game)
  ) {
    actions.push({ action: "callClock" });
  }

  // Player is seated but hand not active - can buy in if no stack, or start game
  if (game.hand?.phase === "waiting") {
    if (seat.sittingOut) {
      // Sitting out - can sit back in if has enough chips for big blind
      if (seat.stack >= game.blinds.big) {
        const cost = seat.missedBigBlind ? game.blinds.big : 0;
        actions.push({ action: "sitIn", cost });
      }
      // Can always leave when sitting out
      actions.push({ action: "leave" });
    } else if (seat.stack === 0) {
      actions.push({
        action: "buyIn",
        min: 20,
        max: 100,
        bigBlind: game.blinds.big,
      });
    } else {
      // Player has chips and not sitting out
      if (game.countdown === null && countPlayersWithChips(game) >= 2) {
        // No countdown active, enough players - can start
        actions.push({ action: "start" });
      }
      // Can sit out if has chips
      actions.push({ action: "sitOut" });
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
          actingTicks: game.actingTicks,
          clockTicks: game.clockTicks,
        }
      : null,
    countdown: game.countdown,
    winnerMessage: game.winnerMessage,
    rankings: Ranking.computeRankings(game),
    seats: game.seats.map((seat, index) => {
      if (seat.empty) {
        return {
          empty: true,
          actions: getAvailableActions(game, index, playerSeatIndex),
        };
      }

      const showCards = shouldShowCards(seat, index, playerSeatIndex, game);

      // Calculate hand rank only for visible cards of non-folded players
      const handRank =
        showCards && !seat.folded
          ? calculateHandRank(seat.cards, game.board?.cards || [])
          : null;

      return {
        empty: false,
        player: seat.player,
        stack: seat.stack,
        bet: seat.bet,
        folded: seat.folded,
        allIn: seat.allIn,
        sittingOut: seat.sittingOut,
        disconnected: seat.disconnected,
        cards: showCards
          ? seat.cards
          : seat.cards?.map(() => hiddenCard()) || [],
        actions: getAvailableActions(game, index, playerSeatIndex),
        isCurrentPlayer: index === playerSeatIndex,
        isActing: index === game.hand?.actingSeat,
        lastAction: seat.lastAction,
        handResult: seat.handResult,
        handRank,
        winningCards: seat.winningCards,
      };
    }),
  };
}
