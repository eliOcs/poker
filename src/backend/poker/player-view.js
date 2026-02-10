import * as Betting from "./betting.js";
import { countPlayersWithChips } from "./actions.js";
import { isClockCallable } from "./game-tick.js";
import * as TournamentTick from "./tournament-tick.js";
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
 * @typedef {object} ActionShowCard1
 * @property {'showCard1'} action
 * @property {Card[]} cards
 */

/**
 * @typedef {object} ActionShowCard2
 * @property {'showCard2'} action
 * @property {Card[]} cards
 */

/**
 * @typedef {object} ActionShowBothCards
 * @property {'showBothCards'} action
 * @property {Card[]} cards
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
 * @typedef {object} ActionEmote
 * @property {'emote'} action
 */

/**
 * @typedef {ActionSit|ActionBuyIn|ActionCheck|ActionCall|ActionBet|ActionRaise|ActionAllIn|ActionFold|ActionShowCard1|ActionShowCard2|ActionShowBothCards|ActionStart|ActionSitOut|ActionSitIn|ActionCallClock|ActionLeave|ActionEmote} PlayerAction
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
 * @property {number|null} bustedPosition - Tournament finishing position (null if not busted)
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
 * @typedef {object} TournamentView
 * @property {number} level - Current blind level (1-7)
 * @property {number} timeToNextLevel - Seconds until next level or break ends
 * @property {boolean} onBreak - Whether currently on break
 * @property {boolean} pendingBreak - Whether break will start after current hand
 * @property {number|null} winner - Seat index of tournament winner (null if ongoing)
 * @property {Cents} buyIn - Buy-in amount in cents
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
 * @property {number} handNumber
 * @property {Ranking.PlayerRanking[]} rankings
 * @property {TournamentView|null} tournament - Tournament state (null for cash games)
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
 * Determines if all cards should be shown for a seat
 * @param {SeatType} seat - The seat to check
 * @param {number} seatIndex - Index of this seat
 * @param {number} playerSeatIndex - Index of the viewing player's seat
 * @param {Game} game - Game state
 * @returns {boolean}
 */
function shouldRevealAllCards(seat, seatIndex, playerSeatIndex, game) {
  if (seat.empty || !seat.cards || seat.cards.length === 0) {
    return false;
  }

  // Always show own cards
  if (seatIndex === playerSeatIndex) {
    return true;
  }

  // Show at showdown or when cards were revealed at showdown
  if (game.hand?.phase === "showdown" || seat.cardsRevealed) {
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
 * Determines which cards to send to the client for a seat
 * @param {import('./seat.js').OccupiedSeat} seat - The occupied seat
 * @param {boolean} revealAllCards - Whether all cards should be revealed
 * @param {boolean} isOwnSeat - Whether this is the viewing player's seat
 * @returns {(Card|HiddenCard)[]}
 */
function getCardsForView(seat, revealAllCards, isOwnSeat) {
  // Show actual cards if fully visible (own cards, showdown, fully revealed)
  if (revealAllCards || isOwnSeat) {
    return seat.cards;
  }

  const shownCards = seat.shownCards || [false, false];
  if (shownCards[0] || shownCards[1]) {
    return seat.cards.map((card, index) =>
      shownCards[index] ? card : hiddenCard(),
    );
  }

  // Don't render cards for folded opponents
  if (seat.folded && !isOwnSeat) {
    return [];
  }
  // Show face-down cards for active opponents
  return seat.cards?.map(() => hiddenCard()) || [];
}

/**
 * Gets available show-card actions after folding or when hand ended
 * @param {import('./seat.js').OccupiedSeat} seat
 * @param {Game} game
 * @returns {PlayerAction[]}
 */
function getShowCardsActions(seat, game) {
  if (!canShowCards(seat, game.hand?.phase)) {
    return [];
  }

  const shownCards = getShownCards(seat);
  if (shownCards[0] && shownCards[1]) {
    return [];
  }

  return buildShowCardActions(seat.cards, shownCards);
}

/**
 * @param {import('./seat.js').OccupiedSeat} seat
 * @param {string|undefined} phase
 * @returns {boolean}
 */
function canShowCards(seat, phase) {
  if (!seat.cards || seat.cards.length < 2) {
    return false;
  }
  return seat.folded || phase === "waiting";
}

/**
 * @param {import('./seat.js').OccupiedSeat} seat
 * @returns {[boolean, boolean]}
 */
function getShownCards(seat) {
  return seat.shownCards || [false, false];
}

/**
 * @param {Card[]} cards
 * @param {[boolean, boolean]} shownCards
 * @returns {PlayerAction[]}
 */
function buildShowCardActions(cards, shownCards) {
  /** @type {PlayerAction[]} */
  const actions = [];
  if (!shownCards[0]) {
    actions.push({ action: "showCard1", cards: [cards[0]] });
  }
  if (!shownCards[1]) {
    actions.push({ action: "showCard2", cards: [cards[1]] });
  }
  if (!shownCards[0] && !shownCards[1]) {
    actions.push({ action: "showBothCards", cards: cards.slice(0, 2) });
  }
  return actions;
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
 * Gets waiting phase actions for a sitting out player
 * @param {import('./seat.js').OccupiedSeat} seat
 * @param {Game} game
 * @param {boolean} isTournament
 * @returns {PlayerAction[]}
 */
function getSittingOutActions(seat, game, isTournament) {
  /** @type {PlayerAction[]} */
  const actions = [];
  // Always allow sitting in - if player can't afford the big blind, they go all-in
  const cost = seat.missedBigBlind ? Math.min(game.blinds.big, seat.stack) : 0;
  actions.push({ action: "sitIn", cost });
  if (!isTournament || game.handNumber === 0) {
    actions.push({ action: "leave" });
  }
  return actions;
}

/**
 * Gets waiting phase actions for a seated player
 * @param {import('./seat.js').OccupiedSeat} seat
 * @param {Game} game
 * @returns {PlayerAction[]}
 */
function getWaitingPhaseActions(seat, game) {
  const isTournament = game.tournament?.active === true;
  const showActions = getShowCardsActions(seat, game);

  if (seat.sittingOut) {
    return getSittingOutActions(seat, game, isTournament).concat(showActions);
  }

  if (seat.stack === 0) {
    if (isTournament) return showActions;
    return [
      { action: "buyIn", min: 20, max: 100, bigBlind: game.blinds.big },
      ...showActions,
    ];
  }

  /** @type {PlayerAction[]} */
  const actions = [];
  const canStart =
    game.countdown === null &&
    countPlayersWithChips(game) >= 2 &&
    !game.tournament?.onBreak;

  if (canStart) {
    actions.push({ action: "start" });
  }
  actions.push({ action: "sitOut" });
  return actions.concat(showActions);
}

/**
 * Checks if any opponent can respond to a bet/raise
 * Returns true if at least one non-folded opponent has chips remaining
 * @param {Game} game
 * @param {number} seatIndex - The current player's seat
 * @returns {boolean}
 */
function canAnyOpponentRespond(game, seatIndex) {
  for (let i = 0; i < game.seats.length; i++) {
    if (i === seatIndex) continue;
    const seat = game.seats[i];
    if (seat.empty || seat.folded) continue;
    // Opponent can respond if they have chips and aren't all-in
    if (seat.stack > 0 && !seat.allIn) {
      return true;
    }
  }
  return false;
}

/**
 * Adds check/call/fold actions based on bet state
 * @param {PlayerAction[]} actions
 * @param {Cents} toCall
 * @param {Cents} playerStack
 */
function addBasicActions(actions, toCall, playerStack) {
  if (toCall === 0) {
    actions.push({ action: "check" });
  }
  if (toCall > 0 && playerStack > 0) {
    actions.push({ action: "call", amount: Math.min(toCall, playerStack) });
  }
  if (toCall > 0) {
    actions.push({ action: "fold" });
  }
}

/**
 * Adds bet/raise/all-in actions if opponents can respond
 * @param {PlayerAction[]} actions
 * @param {import('./seat.js').OccupiedSeat} seat
 * @param {Game} game
 * @param {Cents} toCall
 * @param {boolean} opponentsCanRespond
 */
function addAggressiveActions(
  actions,
  seat,
  game,
  toCall,
  opponentsCanRespond,
) {
  const { currentBet } = game.hand;
  const { bet: playerBet, stack: playerStack } = seat;

  // Only allow bet if opponents can respond
  if (currentBet === 0 && playerStack > 0 && opponentsCanRespond) {
    const minBet = Betting.getMinBet(game);
    actions.push({
      action: "bet",
      min: Math.min(minBet, playerStack),
      max: playerStack,
    });
  }

  // Only allow raise if opponents can respond
  if (currentBet > 0 && playerStack > toCall && opponentsCanRespond) {
    addRaiseAction(actions, seat, game);
  }

  // Only allow all-in if it would be meaningful (opponents can respond OR it's a call)
  if (playerStack > 0) {
    const wouldBeRaise = playerBet + playerStack > currentBet;
    if (!wouldBeRaise || opponentsCanRespond) {
      actions.push({ action: "allIn", amount: playerStack });
    }
  }
}

/**
 * Gets betting actions when it's the player's turn
 * @param {import('./seat.js').OccupiedSeat} seat
 * @param {Game} game
 * @param {number} seatIndex - The current player's seat index
 * @returns {PlayerAction[]}
 */
function getBettingActions(seat, game, seatIndex) {
  /** @type {PlayerAction[]} */
  const actions = [];
  const toCall = game.hand.currentBet - seat.bet;
  const opponentsCanRespond = canAnyOpponentRespond(game, seatIndex);

  addBasicActions(actions, toCall, seat.stack);
  addAggressiveActions(actions, seat, game, toCall, opponentsCanRespond);

  return actions;
}

/**
 * Adds raise action if valid
 * @param {PlayerAction[]} actions
 * @param {import('./seat.js').OccupiedSeat} seat
 * @param {Game} game
 */
function addRaiseAction(actions, seat, game) {
  const minRaise = Betting.getMinRaise(game);
  const maxRaise = seat.bet + seat.stack;
  if (maxRaise >= minRaise) {
    actions.push({
      action: "raise",
      min: Math.min(minRaise, maxRaise),
      max: maxRaise,
    });
  }
}

/**
 * Checks if call clock action is available
 * @param {Game} game
 * @param {number} playerSeatIndex
 * @returns {boolean}
 */
function canCallClock(game, playerSeatIndex) {
  return (
    game.hand?.actingSeat !== -1 &&
    game.hand?.actingSeat !== playerSeatIndex &&
    isClockCallable(game)
  );
}

/**
 * Whether registration is open for new players to sit down
 * @param {Game} game
 * @returns {boolean}
 */
function isRegistrationOpen(game) {
  if (game.tournament?.active && game.tournament.level > 1) return false;
  return true;
}

/**
 * Gets available actions for a seat
 * @param {Game} game
 * @param {number} seatIndex
 * @param {number} playerSeatIndex
 * @returns {PlayerAction[]}
 */
function getEmptySeatActions(game, seatIndex, playerSeatIndex) {
  if (playerSeatIndex === -1 && isRegistrationOpen(game)) {
    return [{ action: "sit", seat: seatIndex }];
  }
  return [];
}

function addFoldedActions(game, seat, actions) {
  if (seat.folded && !seat.sittingOut) {
    actions.push({ action: "sitOut" });
  }
  return actions.concat(getShowCardsActions(seat, game));
}

function getAvailableActions(game, seatIndex, playerSeatIndex) {
  const seat = game.seats[seatIndex];

  if (seat.empty) {
    return getEmptySeatActions(game, seatIndex, playerSeatIndex);
  }

  // Not the player's seat - no actions
  if (seatIndex !== playerSeatIndex) {
    return [];
  }

  /** @type {PlayerAction[]} */
  const actions = [];

  if (canCallClock(game, playerSeatIndex)) {
    actions.push({ action: "callClock" });
  }

  if (game.hand?.actingSeat !== seatIndex) {
    actions.push({ action: "emote" });
  }

  if (game.hand?.phase === "waiting") {
    return actions.concat(getWaitingPhaseActions(seat, game));
  }

  if (game.hand?.actingSeat !== seatIndex) {
    return addFoldedActions(game, seat, actions);
  }

  return actions.concat(getBettingActions(seat, game, seatIndex));
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

  /** @type {TournamentView|null} */
  const tournament = game.tournament?.active
    ? {
        level: game.tournament.level,
        timeToNextLevel: TournamentTick.getTimeToNextLevel(game) ?? 0,
        onBreak: game.tournament.onBreak,
        pendingBreak: game.tournament.pendingBreak,
        winner: game.tournament.winner,
        buyIn: game.tournament.buyIn,
      }
    : null;

  return {
    running: game.running,
    button: game.button,
    blinds: game.blinds,
    handNumber: game.handNumber,
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
    tournament,
    seats: game.seats.map((seat, index) => {
      if (seat.empty) {
        return {
          empty: true,
          actions: getAvailableActions(game, index, playerSeatIndex),
        };
      }

      const revealAllCards = shouldRevealAllCards(
        seat,
        index,
        playerSeatIndex,
        game,
      );
      const isOwnSeat = index === playerSeatIndex;

      // Calculate hand rank only for visible cards of non-folded players
      const handRank =
        revealAllCards && !seat.folded
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
        cards: getCardsForView(seat, revealAllCards, isOwnSeat),
        actions: getAvailableActions(game, index, playerSeatIndex),
        isCurrentPlayer: index === playerSeatIndex,
        isActing: index === game.hand?.actingSeat,
        lastAction: seat.lastAction,
        handResult: seat.handResult,
        handRank,
        winningCards: seat.winningCards,
        bustedPosition: seat.bustedPosition,
        emote: seat.emote || null,
      };
    }),
  };
}
