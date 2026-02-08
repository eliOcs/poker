import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import * as Game from "./game.js";
import * as Seat from "./seat.js";
import { getDataDir, toCents } from "./hand-history/io.js";
import * as Tournament from "../../shared/tournament.js";
import * as logger from "../logger.js";

/**
 * @typedef {import('./game.js').Game} PokerGame
 * @typedef {import('./seat.js').Seat} PokerSeat
 * @typedef {import('./hand-history/index.js').OHHHand} OHHHand
 */

/**
 * @typedef {object} OTSFinish
 * @property {string} player_name
 * @property {number} finish_position
 */

/**
 * @typedef {object} OTSSummary
 * @property {number} [buyin_amount]
 * @property {number} [initial_stack]
 * @property {string} [start_date_utc]
 * @property {OTSFinish[]} [tournament_finishes_and_winnings]
 */

/**
 * @typedef {object} RecoveredSeatState
 * @property {string} playerId
 * @property {string|null} name
 * @property {number} stack
 * @property {number} totalBuyIn
 * @property {number} handsPlayed
 */

/**
 * @typedef {object} RecoveryTracker
 * @property {Map<number, RecoveredSeatState>} seatsByIndex
 * @property {Map<string, number>} seatByPlayerId
 * @property {Map<string, number>} initialStackByPlayer
 * @property {Map<string, number>} handsPlayedByPlayer
 */

const INCREMENTAL_ACTIONS = new Set(["Post SB", "Post BB", "Post Ante"]);
const CUMULATIVE_ACTIONS = new Set(["Bet", "Raise", "Call"]);

/**
 * @param {string} gameNumber
 * @returns {number}
 */
function parseHandNumber(gameNumber) {
  const match = gameNumber.match(/-(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * @param {number|undefined|null} value
 * @returns {number}
 */
function cents(value) {
  return toCents(typeof value === "number" ? value : 0);
}

/**
 * @param {Map<string, number>} map
 * @param {string} key
 * @param {number} delta
 */
function addToMapValue(map, key, delta) {
  map.set(key, (map.get(key) || 0) + delta);
}

/**
 * @param {Array<{id: string, starting_stack: number}>} players
 * @returns {Map<string, number>}
 */
function createStartingStacks(players = []) {
  /** @type {Map<string, number>} */
  const stacks = new Map();
  for (const player of players) {
    stacks.set(player.id, cents(player.starting_stack));
  }
  return stacks;
}

/**
 * @param {Record<string, unknown>} action
 * @param {Map<string, number>} streetCommitted
 * @param {Map<string, number>} contributions
 */
function applyActionContribution(action, streetCommitted, contributions) {
  const playerId = /** @type {string|undefined} */ (action.player_id);
  const amount = /** @type {number|undefined} */ (action.amount);
  const actionName = /** @type {string|undefined} */ (action.action);

  if (!playerId || typeof amount !== "number" || !actionName) {
    return;
  }

  const amountInCents = cents(amount);
  const previousCommit = streetCommitted.get(playerId) || 0;

  if (INCREMENTAL_ACTIONS.has(actionName)) {
    addToMapValue(contributions, playerId, amountInCents);
    streetCommitted.set(playerId, previousCommit + amountInCents);
    return;
  }

  if (!CUMULATIVE_ACTIONS.has(actionName)) {
    return;
  }

  const delta = Math.max(0, amountInCents - previousCommit);
  if (delta > 0) {
    addToMapValue(contributions, playerId, delta);
  }
  streetCommitted.set(playerId, Math.max(previousCommit, amountInCents));
}

/**
 * @param {Array<{ actions?: Record<string, unknown>[] }>} rounds
 * @returns {Map<string, number>}
 */
function collectContributions(rounds = []) {
  /** @type {Map<string, number>} */
  const contributions = new Map();

  for (const round of rounds) {
    /** @type {Map<string, number>} */
    const streetCommitted = new Map();
    for (const action of round.actions || []) {
      applyActionContribution(action, streetCommitted, contributions);
    }
  }

  return contributions;
}

/**
 * @param {Array<{ player_wins?: Array<{ player_id: string, win_amount: number }> }>} pots
 * @returns {Map<string, number>}
 */
function collectWinnings(pots = []) {
  /** @type {Map<string, number>} */
  const winnings = new Map();
  for (const pot of pots) {
    for (const win of pot.player_wins || []) {
      if (!win?.player_id || typeof win.win_amount !== "number") {
        continue;
      }
      addToMapValue(winnings, win.player_id, cents(win.win_amount));
    }
  }
  return winnings;
}

/**
 * @param {Map<string, number>} startingStacks
 * @param {Map<string, number>} contributions
 * @param {Map<string, number>} winnings
 * @returns {Map<string, number>}
 */
function buildEndingStacks(startingStacks, contributions, winnings) {
  /** @type {Map<string, number>} */
  const endingStacks = new Map();
  for (const [playerId, startingStack] of startingStacks) {
    const endingStack =
      startingStack -
      (contributions.get(playerId) || 0) +
      (winnings.get(playerId) || 0);
    endingStacks.set(playerId, Math.max(0, endingStack));
  }
  return endingStacks;
}

/**
 * Calculates each player's ending stack for one hand.
 *
 * @param {OHHHand} hand
 * @returns {Map<string, number>} playerId -> ending stack in cents
 */
function calculateEndingStacksForHand(hand) {
  const startingStacks = createStartingStacks(hand.players || []);
  const contributions = collectContributions(hand.rounds || []);
  const winnings = collectWinnings(hand.pots || []);
  return buildEndingStacks(startingStacks, contributions, winnings);
}

/**
 * @returns {RecoveryTracker}
 */
function createRecoveryTracker() {
  return {
    seatsByIndex: new Map(),
    seatByPlayerId: new Map(),
    initialStackByPlayer: new Map(),
    handsPlayedByPlayer: new Map(),
  };
}

/**
 * @param {RecoveryTracker} tracker
 * @param {string} playerId
 * @param {number} startingStack
 */
function ensureInitialStack(tracker, playerId, startingStack) {
  if (!tracker.initialStackByPlayer.has(playerId)) {
    tracker.initialStackByPlayer.set(playerId, startingStack);
  }
}

/**
 * @param {RecoveryTracker} tracker
 * @param {string} playerId
 */
function incrementHandsPlayed(tracker, playerId) {
  tracker.handsPlayedByPlayer.set(
    playerId,
    (tracker.handsPlayedByPlayer.get(playerId) || 0) + 1,
  );
}

/**
 * @param {RecoveryTracker} tracker
 * @param {string} playerId
 * @param {number} seatIndex
 */
function clearPreviousSeatIfMoved(tracker, playerId, seatIndex) {
  const previousSeat = tracker.seatByPlayerId.get(playerId);
  if (previousSeat !== undefined && previousSeat !== seatIndex) {
    tracker.seatsByIndex.delete(previousSeat);
  }
}

/**
 * @param {RecoveryTracker} tracker
 * @param {string} playerId
 * @param {number} seatIndex
 */
function clearSeatIfReplaced(tracker, playerId, seatIndex) {
  const occupant = tracker.seatsByIndex.get(seatIndex);
  if (occupant && occupant.playerId !== playerId) {
    tracker.seatByPlayerId.delete(occupant.playerId);
  }
}

/**
 * @param {RecoveryTracker} tracker
 * @param {{ id: string, seat: number, name: string|null, starting_stack: number }} player
 * @param {Map<string, number>} endingStacks
 */
function upsertRecoveredSeat(tracker, player, endingStacks) {
  const seatIndex = Math.max(0, (player.seat || 1) - 1);
  const startingStack = cents(player.starting_stack);
  const playerId = player.id;

  clearPreviousSeatIfMoved(tracker, playerId, seatIndex);
  clearSeatIfReplaced(tracker, playerId, seatIndex);
  ensureInitialStack(tracker, playerId, startingStack);
  incrementHandsPlayed(tracker, playerId);

  tracker.seatsByIndex.set(seatIndex, {
    playerId,
    name: player.name ?? null,
    stack: endingStacks.get(playerId) ?? startingStack,
    totalBuyIn: tracker.initialStackByPlayer.get(playerId) || startingStack,
    handsPlayed: tracker.handsPlayedByPlayer.get(playerId) || 0,
  });
  tracker.seatByPlayerId.set(playerId, seatIndex);
}

/**
 * @param {OHHHand[]} hands
 * @returns {Map<number, RecoveredSeatState>}
 */
function buildRecoveredSeatStates(hands) {
  const tracker = createRecoveryTracker();

  for (const hand of hands) {
    const endingStacks = calculateEndingStacksForHand(hand);
    for (const player of hand.players || []) {
      upsertRecoveredSeat(tracker, player, endingStacks);
    }
  }

  return tracker.seatsByIndex;
}

/**
 * @param {PokerSeat[]} seats
 * @param {number} previousButton
 * @returns {number}
 */
function getNextButton(seats, previousButton) {
  if (seats.length === 0) return 0;

  const start = ((previousButton % seats.length) + seats.length) % seats.length;
  let next = (start + 1) % seats.length;

  while (next !== start) {
    const seat = seats[next];
    if (!seat.empty && !seat.sittingOut) {
      return next;
    }
    next = (next + 1) % seats.length;
  }

  return start;
}

/**
 * @param {{ ante_amount?: number, small_blind_amount?: number, big_blind_amount?: number }} hand
 * @returns {{ ante: number, small: number, big: number }}
 */
function getBlindsFromHand(hand) {
  return {
    ante: cents(hand.ante_amount),
    small: cents(hand.small_blind_amount),
    big: cents(hand.big_blind_amount),
  };
}

/**
 * @param {OHHHand} lastHand
 * @param {OTSSummary|null} summary
 * @returns {number}
 */
function getTournamentBuyIn(lastHand, summary) {
  const buyInDollars =
    lastHand.tournament_info?.buyin_amount ??
    summary?.buyin_amount ??
    Tournament.DEFAULT_BUYIN.amount / 100;
  return cents(buyInDollars);
}

/**
 * @param {OHHHand} lastHand
 * @param {OTSSummary|null} summary
 * @returns {number}
 */
function getTournamentInitialStack(lastHand, summary) {
  const initialStackDollars =
    lastHand.tournament_info?.initial_stack ??
    summary?.initial_stack ??
    Tournament.INITIAL_STACK / 100;
  return cents(initialStackDollars);
}

/**
 * @param {OHHHand} lastHand
 * @param {OTSSummary|null} summary
 * @returns {string|null}
 */
function getTournamentStartTime(lastHand, summary) {
  return (
    lastHand.tournament_info?.start_date_utc ??
    summary?.start_date_utc ??
    lastHand.start_date_utc ??
    null
  );
}

/**
 * @param {{ ante: number, small: number, big: number }} blinds
 * @returns {number}
 */
function getTournamentLevelFromBlinds(blinds) {
  const level = Tournament.BLIND_LEVELS.find(
    (entry) =>
      entry.ante === blinds.ante &&
      entry.small === blinds.small &&
      entry.big === blinds.big,
  );
  return level?.level || 1;
}

/**
 * @param {PokerGame} game
 * @param {OTSSummary|null} summary
 * @returns {number|null}
 */
function getWinnerSeatIndex(game, summary) {
  const winnerName = summary?.tournament_finishes_and_winnings?.find(
    (finish) => finish.finish_position === 1,
  )?.player_name;

  if (winnerName) {
    const byName = game.seats.findIndex(
      (seat) => !seat.empty && seat.player.name === winnerName,
    );
    if (byName !== -1) return byName;
  }

  const playersWithChips = game.seats.reduce((indices, seat, index) => {
    if (!seat.empty && seat.stack > 0) {
      indices.push(index);
    }
    return indices;
  }, /** @type {number[]} */ ([]));

  return playersWithChips.length === 1 ? playersWithChips[0] : null;
}

/**
 * @param {PokerGame} game
 * @param {Map<number, RecoveredSeatState>} recoveredSeats
 * @param {Set<string>} playersInLastHand
 * @param {boolean} isTournament
 * @param {number} tournamentInitialStack
 */
function applyRecoveredSeats(
  game,
  recoveredSeats,
  playersInLastHand,
  isTournament,
  tournamentInitialStack,
) {
  for (let i = 0; i < game.seats.length; i += 1) {
    const recoveredSeat = recoveredSeats.get(i);
    if (!recoveredSeat) continue;

    const occupied = Seat.occupied(
      { id: recoveredSeat.playerId, name: recoveredSeat.name },
      recoveredSeat.stack,
    );
    occupied.totalBuyIn = isTournament
      ? tournamentInitialStack
      : recoveredSeat.totalBuyIn;
    occupied.handsPlayed = recoveredSeat.handsPlayed;
    occupied.disconnected = true;
    occupied.sittingOut =
      occupied.stack <= 0 || !playersInLastHand.has(recoveredSeat.playerId);

    game.seats[i] = occupied;
  }
}

/**
 * @param {string} gameId
 * @param {OHHHand} lastHand
 * @param {OTSSummary|null} summary
 * @returns {{ game: PokerGame, isTournament: boolean, blinds: { ante: number, small: number, big: number }, tournamentInitialStack: number }}
 */
function createGameShell(gameId, lastHand, summary) {
  const tableSize = lastHand.table_size || 9;
  const blinds = getBlindsFromHand(lastHand);
  const isTournament = Boolean(
    lastHand.tournament || lastHand.tournament_info || summary,
  );
  const tournamentInitialStack = getTournamentInitialStack(lastHand, summary);

  const game = isTournament
    ? Game.createTournament({
        seats: tableSize,
        buyIn: getTournamentBuyIn(lastHand, summary),
      })
    : Game.create({ seats: tableSize, blinds });

  game.id = gameId;
  game.handNumber = parseHandNumber(lastHand.game_number);
  game.blinds = blinds;

  return { game, isTournament, blinds, tournamentInitialStack };
}

/**
 * @param {PokerGame} game
 * @param {OHHHand} lastHand
 * @param {OTSSummary|null} summary
 * @param {{ ante: number, small: number, big: number }} blinds
 */
function applyTournamentState(game, lastHand, summary, blinds) {
  if (!game.tournament) return;

  game.tournament.startTime = getTournamentStartTime(lastHand, summary);
  game.tournament.initialStack = getTournamentInitialStack(lastHand, summary);
  game.tournament.level = getTournamentLevelFromBlinds(blinds);
  game.tournament.levelTicks = 0;
  game.tournament.onBreak = false;
  game.tournament.pendingBreak = false;
  game.tournament.breakTicks = 0;
  game.tournament.winner = getWinnerSeatIndex(game, summary);
}

/**
 * @param {string} gameId
 * @returns {Promise<OHHHand[]>}
 */
async function readHandsFromFile(gameId) {
  const filePath = `${getDataDir()}/${gameId}.ohh`;
  if (!existsSync(filePath)) return [];

  const content = await readFile(filePath, "utf8");
  const blocks = content.split(/\n\s*\n/).map((line) => line.trim());
  /** @type {OHHHand[]} */
  const hands = [];

  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];
    if (!block) continue;

    try {
      const parsed = JSON.parse(block);
      if (parsed?.ohh?.game_number) {
        hands.push(parsed.ohh);
      }
    } catch (err) {
      logger.warn("invalid hand history entry ignored during recovery", {
        gameId,
        entryIndex: i,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  hands.sort(
    (a, b) => parseHandNumber(a.game_number) - parseHandNumber(b.game_number),
  );
  return hands;
}

/**
 * @param {string} gameId
 * @returns {Promise<OTSSummary|null>}
 */
async function readTournamentSummary(gameId) {
  const filePath = `${getDataDir()}/${gameId}.ots`;
  if (!existsSync(filePath)) return null;

  try {
    const content = await readFile(filePath, "utf8");
    const parsed = JSON.parse(content);
    return parsed?.ots || null;
  } catch (err) {
    logger.warn("invalid tournament summary ignored during recovery", {
      gameId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Rebuilds a game from parsed hand history.
 *
 * @param {string} gameId
 * @param {OHHHand[]} hands
 * @param {OTSSummary|null} summary
 * @returns {PokerGame|null}
 */
export function rebuildGameFromHistory(gameId, hands, summary = null) {
  if (hands.length === 0) return null;

  const lastHand = hands[hands.length - 1];
  const recoveredSeats = buildRecoveredSeatStates(hands);
  const playersInLastHand = new Set(
    (lastHand.players || []).map((player) => player.id),
  );
  const { game, isTournament, blinds, tournamentInitialStack } =
    createGameShell(gameId, lastHand, summary);

  applyRecoveredSeats(
    game,
    recoveredSeats,
    playersInLastHand,
    isTournament,
    tournamentInitialStack,
  );

  const previousDealer = (lastHand.dealer_seat || 1) - 1;
  game.button = getNextButton(game.seats, previousDealer);
  applyTournamentState(game, lastHand, summary, blinds);

  return game;
}

/**
 * Loads and rebuilds a missing game from hand history files.
 *
 * @param {string} gameId
 * @returns {Promise<PokerGame|null>}
 */
export async function recoverGameFromHistory(gameId) {
  if (!gameId) return null;

  const hands = await readHandsFromFile(gameId);
  if (hands.length === 0) return null;

  const summary = await readTournamentSummary(gameId);
  return rebuildGameFromHistory(gameId, hands, summary);
}
