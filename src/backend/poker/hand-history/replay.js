/**
 * @typedef {import('./view.js').FilteredHand} FilteredHand
 * @typedef {import('./view.js').HistoryView} HistoryView
 * @typedef {import('./view.js').HistoryViewSeat} HistoryViewSeat
 * @typedef {import('./view.js').HistoryLastAction} HistoryLastAction
 * @typedef {import('../deck.js').Card} Card
 * @typedef {Card | "??"} ReplayCard
 * @typedef {"Preflop" | "Flop" | "Turn" | "River" | "Showdown"} ReplayStreet
 */

const incrementalContributionActions = new Set([
  "Post SB",
  "Post BB",
  "Post Ante",
]);
const cumulativeContributionActions = new Set(["Bet", "Raise", "Call"]);
const nonContributionActions = new Set([
  "Check",
  "Fold",
  "Shows Cards",
  "Mucks Cards",
]);
const replayStreets = new Set(["Preflop", "Flop", "Turn", "River", "Showdown"]);

/**
 * @typedef {object} ReplayStep
 * @property {"start"|"action"|"street"|"result"} kind
 * @property {ReplayStreet} street
 * @property {number} [actionNumber]
 * @property {HistoryView} view
 */

/**
 * @typedef {object} HandReplay
 * @property {ReplayStep[]} steps
 */

/**
 * @param {FilteredHand} hand
 * @returns {Map<string, ReplayCard[]>}
 */
function getFilteredHoleCards(hand) {
  /** @type {Map<string, ReplayCard[]>} */
  const cards = new Map();
  const playerIds = new Set(hand.players.map((player) => player.id));
  for (const round of hand.rounds) {
    for (const action of round.actions) {
      if (action.action !== "Dealt Cards") continue;
      if (!playerIds.has(action.player_id)) {
        throw new Error(
          `Replay dealt cards reference unknown player: ${action.player_id}`,
        );
      }
      if (!action.cards?.length) {
        throw new Error(
          `Replay dealt cards are missing for player: ${action.player_id}`,
        );
      }
      if (cards.has(action.player_id)) {
        throw new Error(
          `Replay contains duplicate dealt cards for player: ${action.player_id}`,
        );
      }
      cards.set(action.player_id, /** @type {ReplayCard[]} */ (action.cards));
    }
  }
  return cards;
}

function getReplayStreet(street) {
  if (!replayStreets.has(street)) {
    throw new Error(`Replay contains unknown street: ${street}`);
  }
  return /** @type {ReplayStreet} */ (street);
}

function getLastAction(action) {
  if (
    !incrementalContributionActions.has(action) &&
    !cumulativeContributionActions.has(action) &&
    !nonContributionActions.has(action)
  ) {
    throw new Error(`Replay contains unsupported action: ${action}`);
  }
  return /** @type {HistoryLastAction} */ (action);
}

/**
 * @param {HistoryViewSeat[]} seats
 * @param {string} playerId
 * @returns {Exclude<HistoryViewSeat, { empty: true }>|undefined}
 */
function findSeat(seats, playerId) {
  const seat = seats.find(
    (candidate) => !candidate.empty && candidate.player?.id === playerId,
  );
  return seat?.empty ? undefined : seat;
}

/**
 * @param {HistoryViewSeat[]} seats
 * @param {string} playerId
 * @param {Card[]} cards
 * @param {Map<string, ReplayCard[]>} filteredHoleCards
 * @param {Map<string, Set<Card>>} revealedCards
 */
function revealCards(seats, playerId, cards, filteredHoleCards, revealedCards) {
  const seat = findSeat(seats, playerId);
  if (!seat) {
    throw new Error(`Replay shown cards reference unknown player: ${playerId}`);
  }
  const filteredCards = filteredHoleCards.get(playerId);
  if (!filteredCards) {
    throw new Error(`Replay shown cards have no deal for player: ${playerId}`);
  }
  for (const card of cards) {
    if (!filteredCards.includes(card)) {
      throw new Error(
        `Replay shown card ${card} does not match the deal for player: ${playerId}`,
      );
    }
  }
  if (seat.isCurrentPlayer) return;

  const revealed = revealedCards.get(playerId) ?? new Set();
  for (const card of cards) revealed.add(card);
  revealedCards.set(playerId, revealed);

  seat.cards = filteredCards.map((card) =>
    card !== "??" && revealed.has(card) ? card : "??",
  );
}

function getContributionAmount(action, amount, playerId) {
  if (amount === undefined) {
    throw new Error(
      `Replay contribution action ${action} is missing an amount for player: ${playerId}`,
    );
  }
  if (amount < 0) {
    throw new Error(
      `Replay contribution action ${action} has a negative amount for player: ${playerId}`,
    );
  }
  return amount;
}

function deductFromStack(seat, contribution, action, playerId) {
  const stack = /** @type {number} */ (seat.stack);
  if (contribution > stack) {
    throw new Error(
      `Replay contribution action ${action} exceeds the stack for player: ${playerId}`,
    );
  }
  seat.stack = stack - contribution;
}

function applyIncrementalContribution(
  seat,
  playerId,
  action,
  amount,
  streetBets,
) {
  const previousBet = streetBets.get(playerId) ?? 0;
  streetBets.set(playerId, previousBet + amount);
  seat.bet = previousBet + amount;
  deductFromStack(seat, amount, action, playerId);
  return amount;
}

function applyCumulativeContribution(
  seat,
  playerId,
  action,
  amount,
  streetBets,
) {
  const previousBet = streetBets.get(playerId) ?? 0;
  if (amount < previousBet) {
    throw new Error(
      `Replay contribution action ${action} is below the previous bet for player: ${playerId}`,
    );
  }
  const contribution = amount - previousBet;
  streetBets.set(playerId, amount);
  seat.bet = amount;
  deductFromStack(seat, contribution, action, playerId);
  return contribution;
}

/**
 * @param {HistoryViewSeat} seat
 * @param {string} playerId
 * @param {HistoryLastAction} action
 * @param {number|undefined} amount
 * @param {Map<string, number>} streetBets
 */
function applyContribution(seat, playerId, action, amount, streetBets) {
  const isIncremental = incrementalContributionActions.has(action);
  const isCumulative = cumulativeContributionActions.has(action);
  if (!isIncremental && !isCumulative) return 0;

  const contributionAmount = getContributionAmount(action, amount, playerId);
  return isIncremental
    ? applyIncrementalContribution(
        seat,
        playerId,
        action,
        contributionAmount,
        streetBets,
      )
    : applyCumulativeContribution(
        seat,
        playerId,
        action,
        contributionAmount,
        streetBets,
      );
}

/**
 * @param {HistoryViewSeat[]} seats
 * @param {string} playerId
 * @param {HistoryLastAction} action
 * @param {number|undefined} amount
 * @param {boolean|undefined} isAllIn
 * @param {Map<string, number>} streetBets
 * @returns {number} Amount newly added to the pot.
 */
function applyAction(seats, playerId, action, amount, isAllIn, streetBets) {
  const seat = findSeat(seats, playerId);
  if (!seat) {
    throw new Error(`Replay action references unknown player: ${playerId}`);
  }

  const contribution = applyContribution(
    seat,
    playerId,
    action,
    amount,
    streetBets,
  );

  if (action === "Fold") seat.folded = true;
  if (isAllIn) seat.allIn = true;
  seat.lastAction = action;
  return contribution;
}

/**
 * Create an independent table view for a snapshot.
 * @param {HistoryViewSeat[]} seats
 * @param {Card[]} boardCards
 * @param {ReplayStreet} street
 * @param {number} pot
 * @param {number} button
 * @returns {HistoryView}
 */
function snapshotView(seats, boardCards, street, pot, button) {
  return {
    seats: seats.map((seat) =>
      seat.empty
        ? { empty: true }
        : {
            ...seat,
            player: seat.player ? { ...seat.player } : undefined,
            cards: [...(seat.cards ?? [])],
          },
    ),
    board: { cards: [...boardCards], phase: street },
    pot,
    button,
  };
}

/**
 * @param {FilteredHand} hand
 * @param {string} playerId
 * @param {Map<string, ReplayCard[]>} filteredHoleCards
 * @returns {HistoryViewSeat[]}
 */
function createReplaySeats(hand, playerId, filteredHoleCards) {
  return Array.from({ length: hand.table_size }, (_, index) => {
    const player = hand.players.find(
      (candidate) => candidate.seat === index + 1,
    );
    if (!player) return { empty: true };

    const dealtCards = filteredHoleCards.get(player.id);
    let cards = [];
    if (dealtCards) {
      cards =
        player.id === playerId ? [...dealtCards] : dealtCards.map(() => "??");
    }
    return {
      empty: false,
      player: {
        id: player.id,
        name: player.name ?? `Seat ${player.seat}`,
      },
      stack: player.starting_stack,
      bet: 0,
      cards,
      isCurrentPlayer: player.id === playerId,
      folded: false,
      allIn: false,
      sittingOut: false,
      disconnected: false,
      isActing: false,
    };
  });
}

/** @param {HistoryViewSeat[]} seats */
function resetBets(seats) {
  for (const seat of seats) {
    if (!seat.empty) seat.bet = 0;
  }
}

/**
 * @typedef {object} ReplayState
 * @property {FilteredHand} hand
 * @property {HistoryViewSeat[]} seats
 * @property {Map<string, ReplayCard[]>} filteredHoleCards
 * @property {Map<string, Set<Card>>} revealedCards
 * @property {Map<string, number>} streetBets
 * @property {Card[]} boardCards
 * @property {ReplayStep[]} steps
 * @property {ReplayStreet} currentStreet
 * @property {number} pot
 */

/**
 * @param {ReplayState} state
 * @param {import('./view.js').HandAction} action
 */
function appendActionStep(state, action) {
  if (action.action === "Dealt Cards") return;
  const lastAction = getLastAction(action.action);
  if (lastAction === "Shows Cards" && !action.cards?.length) {
    throw new Error(
      `Replay shown cards are missing for player: ${action.player_id}`,
    );
  }
  state.pot += applyAction(
    state.seats,
    action.player_id,
    lastAction,
    action.amount,
    action.is_allin,
    state.streetBets,
  );
  if (action.action === "Shows Cards" && action.cards?.length) {
    revealCards(
      state.seats,
      action.player_id,
      /** @type {Card[]} */ (action.cards),
      state.filteredHoleCards,
      state.revealedCards,
    );
  }
  state.steps.push({
    kind: "action",
    street: state.currentStreet,
    actionNumber: action.action_number,
    view: snapshotView(
      state.seats,
      state.boardCards,
      state.currentStreet,
      state.pot,
      state.hand.dealer_seat,
    ),
  });
}

/**
 * @param {ReplayState} state
 * @param {import('./view.js').HandRound} round
 * @param {number} roundIndex
 */
function appendRoundSteps(state, round, roundIndex) {
  state.currentStreet = getReplayStreet(round.street);
  if (roundIndex > 0) {
    state.streetBets = new Map();
    resetBets(state.seats);
  }

  if (round.cards?.length) {
    state.boardCards.push(.../** @type {Card[]} */ (round.cards));
    state.steps.push({
      kind: "street",
      street: state.currentStreet,
      view: snapshotView(
        state.seats,
        state.boardCards,
        state.currentStreet,
        state.pot,
        state.hand.dealer_seat,
      ),
    });
  }
  for (const action of round.actions) appendActionStep(state, action);
}

/**
 * Builds authoritative replay snapshots from a privacy-filtered hand. Hole-card
 * deals are setup state; every other action, board deal, and the result is a
 * separately addressable replay step.
 * @param {FilteredHand} hand
 * @param {string} playerId
 * @param {HistoryView} finalView
 * @returns {HandReplay}
 */
export function getHandReplay(hand, playerId, finalView) {
  const filteredHoleCards = getFilteredHoleCards(hand);
  const seats = createReplaySeats(hand, playerId, filteredHoleCards);
  const firstRound = hand.rounds[0];
  if (!firstRound) throw new Error("Replay hand has no rounds");
  const firstStreet = getReplayStreet(firstRound.street);
  /** @type {ReplayState} */
  const state = {
    hand,
    seats,
    filteredHoleCards,
    revealedCards: new Map(),
    streetBets: new Map(),
    boardCards: [],
    currentStreet: firstStreet,
    pot: 0,
    steps: [
      {
        kind: "start",
        street: firstStreet,
        view: snapshotView(seats, [], firstStreet, 0, hand.dealer_seat),
      },
    ],
  };

  for (const [index, round] of hand.rounds.entries()) {
    appendRoundSteps(state, round, index);
  }

  state.steps.push({
    kind: "result",
    street: getReplayStreet(finalView.board.phase),
    view: finalView,
  });
  return { steps: state.steps };
}
