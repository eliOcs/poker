import { toCents } from "./io.js";

/**
 * @typedef {import('../types.js').Cents} Cents
 * @typedef {import('../deck.js').Card} Card
 * @typedef {import('./index.js').OHHHand} OHHHand
 */

/**
 * @typedef {object} HistoryViewSeat
 * @property {boolean} empty
 * @property {{ id: string, name: string }} [player]
 * @property {Cents} [stack]
 * @property {string[]} [cards]
 * @property {Cents|null} [handResult]
 * @property {Cents} [netResult] - Net gain/loss for this hand (winnings - contributions)
 * @property {Cents} [endingStack] - Stack after the hand completed
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
 * @property {Cents} pot
 * @property {{ playerName: string, handRank: string|null, amount: Cents }|null} winnerMessage
 * @property {string[]|null} winningCards
 * @property {number} button
 */

/**
 * Converts an action's amount from dollars to cents if present
 * @param {object} action
 * @returns {object}
 */
function convertActionAmount(action) {
  if (action.amount !== undefined) {
    return { ...action, amount: toCents(action.amount) };
  }
  return action;
}

/**
 * Filters a hand for a specific player's view
 * - Hides opponent hole cards unless shown at showdown
 * - Converts amounts from dollars (OHH format) to cents (frontend format)
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

  // Clone and filter rounds, converting amounts to cents
  const filteredRounds = hand.rounds.map((round) => ({
    ...round,
    actions: round.actions.map((action) => {
      // Filter "Dealt Cards" actions
      if (action.action === "Dealt Cards") {
        const isOwnCards = action.player_id === playerId;
        const wasShown = shownPlayerIds.has(action.player_id);

        if (isOwnCards || wasShown) {
          return convertActionAmount(action);
        } else {
          // Hide cards
          return convertActionAmount({
            ...action,
            cards: ["??", "??"],
          });
        }
      }
      return convertActionAmount(action);
    }),
  }));

  // Convert pot amounts to cents
  const convertedPots = hand.pots.map((pot) => ({
    ...pot,
    amount: toCents(pot.amount),
    player_wins: pot.player_wins.map((win) => ({
      ...win,
      win_amount: toCents(win.win_amount),
    })),
  }));

  // Convert player starting stacks to cents
  const convertedPlayers = hand.players.map((player) => ({
    ...player,
    starting_stack: toCents(player.starting_stack),
  }));

  return {
    ...hand,
    players: convertedPlayers,
    rounds: filteredRounds,
    pots: convertedPots,
  };
}

/**
 * Finds a player's hole cards from dealt cards actions
 * @param {OHHHand} hand
 * @param {string} playerId
 * @returns {string[]}
 */
function findPlayerHoleCards(hand, playerId) {
  for (const round of hand.rounds) {
    const dealtAction = round.actions.find(
      (a) => a.action === "Dealt Cards" && a.player_id === playerId,
    );
    if (dealtAction?.cards) {
      return dealtAction.cards;
    }
  }
  return ["??", "??"];
}

/**
 * Gets winner info from hand pots
 * @param {OHHHand} hand
 * @param {string} playerId
 * @returns {{ winnerName: string|null, winnerId: string|null, totalPot: Cents, isWinner: boolean }}
 */
function getWinnerInfoFromPots(hand, playerId) {
  if (hand.pots.length === 0) {
    return { winnerName: null, winnerId: null, totalPot: 0, isWinner: false };
  }

  const mainPot = hand.pots[0];
  const totalPot = toCents(mainPot.amount);

  if (mainPot.player_wins.length === 0) {
    return { winnerName: null, winnerId: null, totalPot, isWinner: false };
  }

  const winnerId = mainPot.player_wins[0].player_id;
  const winner = hand.players.find((p) => p.id === winnerId);
  const winnerName = winner?.name || `Seat ${winner?.seat || "??"}`;

  return { winnerName, winnerId, totalPot, isWinner: winnerId === playerId };
}

/**
 * Gets a summary of a hand for the hand list
 * @param {OHHHand} hand
 * @param {string} playerId - The requesting player's ID
 * @returns {{ game_number: string, hand_number: number, hole_cards: (Card | string)[], winner_name: string|null, winner_id: string|null, pot: Cents, is_winner: boolean }}
 */
export function getHandSummary(hand, playerId) {
  const handNumber = parseInt(hand.game_number.split("-").pop() || "0", 10);
  const holeCards = findPlayerHoleCards(hand, playerId);
  const { winnerName, winnerId, totalPot, isWinner } = getWinnerInfoFromPots(
    hand,
    playerId,
  );

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
 * Builds a map of player IDs to their hole cards from dealt cards actions
 * @param {OHHHand} hand
 * @returns {Map<string, string[]>}
 */
function buildPlayerCardsMap(hand) {
  /** @type {Map<string, string[]>} */
  const playerCards = new Map();
  for (const round of hand.rounds) {
    for (const action of round.actions) {
      if (action.action === "Dealt Cards" && action.cards) {
        playerCards.set(action.player_id, action.cards);
      }
    }
  }
  return playerCards;
}

/**
 * Builds a map of player IDs to their total win amounts
 * Expects hand data with amounts already converted to cents
 * @param {OHHHand} hand
 * @returns {Map<string, Cents>}
 */
function buildWinAmountsMap(hand) {
  /** @type {Map<string, Cents>} */
  const winAmounts = new Map();
  for (const pot of hand.pots) {
    for (const win of pot.player_wins) {
      const current = winAmounts.get(win.player_id) || 0;
      winAmounts.set(win.player_id, current + win.win_amount);
    }
  }
  return winAmounts;
}

/**
 * Builds a map of player IDs to their total contributions (bets put into the pot)
 * Expects hand data with amounts already converted to cents
 * @param {OHHHand} hand
 * @returns {Map<string, Cents>}
 */
function buildContributionsMap(hand) {
  const contributionActions = new Set([
    "Post SB",
    "Post BB",
    "Post Ante",
    "Bet",
    "Raise",
    "Call",
  ]);

  /** @type {Map<string, Cents>} */
  const contributions = new Map();
  for (const round of hand.rounds) {
    for (const action of round.actions) {
      if (contributionActions.has(action.action) && action.amount) {
        const current = contributions.get(action.player_id) || 0;
        contributions.set(action.player_id, current + action.amount);
      }
    }
  }
  return contributions;
}

/**
 * Builds an occupied seat view
 * Expects player data with starting_stack already converted to cents
 * @param {{ id: string, seat: number, name: string|null, starting_stack: Cents }} player
 * @param {Map<string, string[]>} playerCards
 * @param {Map<string, Cents>} winAmounts
 * @param {Map<string, Cents>} contributions
 * @param {string|null} winningHand
 * @param {string[]|null} winningCards
 * @param {string} playerId
 * @returns {HistoryViewSeat}
 */
function buildOccupiedSeat(
  player,
  playerCards,
  winAmounts,
  contributions,
  winningHand,
  winningCards,
  playerId,
) {
  const isCurrentPlayer = player.id === playerId;
  const isWinner = winAmounts.has(player.id);
  const winAmount = winAmounts.get(player.id) || 0;
  const contributed = contributions.get(player.id) || 0;
  const startingStack = player.starting_stack;
  const netResult = winAmount - contributed;
  const endingStack = startingStack + netResult;
  const playerName = player.name || `Seat ${player.seat}`;
  const displayName = isCurrentPlayer ? `${playerName} (you)` : playerName;

  return {
    empty: false,
    player: { id: player.id, name: displayName },
    stack: startingStack,
    cards: playerCards.get(player.id) || [],
    handResult: winAmount > 0 ? winAmount : null,
    netResult,
    endingStack,
    handRank: isWinner ? winningHand : null,
    winningCards: isWinner ? winningCards : null,
    isCurrentPlayer,
    folded: false,
    allIn: false,
    sittingOut: false,
    disconnected: false,
    isActing: false,
  };
}

/**
 * Extracts board cards and last street from hand rounds
 * @param {OHHHand} hand
 * @returns {{ boardCards: string[], lastStreet: string }}
 */
function extractBoardInfo(hand) {
  /** @type {string[]} */
  const boardCards = [];
  let lastStreet = "Preflop";
  for (const round of hand.rounds) {
    if (round.cards) boardCards.push(...round.cards);
    if (round.street) lastStreet = round.street;
  }
  return { boardCards, lastStreet };
}

/**
 * Calculates total pot amount from all pots
 * Expects hand data with amounts already converted to cents
 * @param {OHHHand} hand
 * @returns {Cents}
 */
function calculateTotalPot(hand) {
  return hand.pots.reduce((sum, pot) => sum + (pot.amount || 0), 0);
}

/**
 * Builds winner message from main pot
 * Expects hand data with amounts already converted to cents
 * @param {OHHHand['pots'][0]|undefined} mainPot
 * @param {OHHHand['players']} players
 * @returns {{ playerName: string, handRank: string|null, amount: Cents }|null}
 */
function buildViewWinnerMessage(mainPot, players) {
  if (!mainPot?.player_wins?.length) return null;

  const winnerId = mainPot.player_wins[0].player_id;
  const winner = players.find((p) => p.id === winnerId);
  return {
    playerName: winner?.name || `Seat ${winner?.seat || "??"}`,
    handRank: mainPot.winning_hand || null,
    amount: mainPot.player_wins[0].win_amount,
  };
}

/**
 * Converts OHH hand data to game view format for rendering
 * @param {OHHHand} hand - The OHH hand data
 * @param {string} playerId - The requesting player's ID
 * @returns {HistoryView}
 */
export function getHandView(hand, playerId) {
  const playerCards = buildPlayerCardsMap(hand);
  const winAmounts = buildWinAmountsMap(hand);
  const contributions = buildContributionsMap(hand);
  const mainPot = hand.pots[0];
  const winningHand = mainPot?.winning_hand || null;
  const winningCards = mainPot?.winning_cards || null;

  const seats = [];
  for (let i = 0; i < hand.table_size; i++) {
    const player = hand.players.find((p) => p.seat === i + 1);
    if (!player) {
      seats.push({ empty: true });
    } else {
      seats.push(
        buildOccupiedSeat(
          player,
          playerCards,
          winAmounts,
          contributions,
          winningHand,
          winningCards,
          playerId,
        ),
      );
    }
  }

  const { boardCards, lastStreet } = extractBoardInfo(hand);

  return {
    seats,
    board: { cards: boardCards, phase: lastStreet },
    pot: calculateTotalPot(hand),
    winnerMessage: buildViewWinnerMessage(mainPot, hand.players),
    winningCards,
    button: hand.dealer_seat,
  };
}
