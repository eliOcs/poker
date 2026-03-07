import * as Store from "./store.js";
import * as Ranking from "./poker/ranking.js";
import { recoverGameFromHistory } from "./poker/recovery.js";
import {
  readHandsFromFile,
  readTournamentSummary,
  toCents,
} from "./poker/hand-history/io.js";

const contributionActions = new Set([
  "Post SB",
  "Post BB",
  "Post Ante",
  "Bet",
  "Raise",
  "Call",
]);

/**
 * @typedef {import('./poker/game.js').Game} Game
 * @typedef {import('./poker/hand-history/index.js').OHHHand} OHHHand
 * @typedef {import('./poker/types.js').Cents} Cents
 */

/**
 * @typedef {object} PlayerProfile
 * @property {string} id
 * @property {string} name
 * @property {boolean} online
 * @property {string|null} lastSeenAt
 * @property {string} joinedAt
 * @property {Cents} totalNetWinnings
 * @property {number} totalHands
 */

/**
 * @param {Map<string, Game>} games
 * @param {string} playerId
 * @returns {Promise<PlayerProfile|null>}
 */
export async function getPlayerProfile(games, playerId) {
  const user = Store.loadUserProfile(playerId);
  const totals = await summarizePlayerHistory(playerId);

  if (!user && totals.totalHands === 0) return null;

  return {
    id: playerId,
    name: resolvePlayerName(user, totals.hands, playerId),
    online: isPlayerOnline(games, playerId),
    lastSeenAt: user?.updatedAt || null,
    joinedAt: resolveJoinedAt(user, totals.hands),
    totalNetWinnings: totals.totalNetWinnings,
    totalHands: totals.totalHands,
  };
}

/**
 * @param {Store.UserProfile|null} user
 * @param {OHHHand[]} hands
 * @param {string} playerId
 * @returns {string}
 */
function resolvePlayerName(user, hands, playerId) {
  return user?.name || findLatestPlayerName(hands, playerId) || playerId;
}

/**
 * @param {Store.UserProfile|null} user
 * @param {OHHHand[]} hands
 * @returns {string}
 */
function resolveJoinedAt(user, hands) {
  return user?.createdAt || findFirstSeenAt(hands) || new Date(0).toISOString();
}

/**
 * @param {Map<string, Game>} games
 * @param {string} playerId
 * @returns {boolean}
 */
function isPlayerOnline(games, playerId) {
  for (const game of games.values()) {
    for (const seat of game.seats) {
      if (!seat.empty && seat.player.id === playerId && !seat.disconnected) {
        return true;
      }
    }
  }

  return false;
}

/**
 * @param {string} playerId
 * @returns {Promise<{ totalNetWinnings: Cents, totalHands: number, hands: OHHHand[] }>}
 */
async function summarizePlayerHistory(playerId) {
  const files = Store.listPlayerGameIds(playerId).map(
    (gameId) => `${gameId}.ohh`,
  );
  /** @type {OHHHand[]} */
  const matchingHands = [];
  let totalNetWinnings = 0;

  for (const file of files) {
    const gameId = file.slice(0, -4);
    const hands = await readHandsFromFile(gameId);
    const playerHands = hands.filter((hand) =>
      hand.players.some((player) => player.id === playerId),
    );

    if (playerHands.length === 0) continue;

    matchingHands.push(...playerHands);

    if (isTournamentHistory(hands)) {
      totalNetWinnings += await calculateTournamentNetResult(gameId, playerId);
      continue;
    }

    for (const hand of playerHands) {
      totalNetWinnings += calculateNetResult(hand, playerId);
    }
  }

  return {
    totalNetWinnings,
    totalHands: matchingHands.length,
    hands: matchingHands,
  };
}

/**
 * @param {OHHHand[]} hands
 * @returns {boolean}
 */
function isTournamentHistory(hands) {
  return hands.some((hand) => hand.tournament || hand.tournament_info);
}

/**
 * @param {OHHHand[]} hands
 * @param {string} playerId
 * @returns {string|null}
 */
function findLatestPlayerName(hands, playerId) {
  for (let i = hands.length - 1; i >= 0; i -= 1) {
    const hand = hands[i];
    if (!hand) continue;
    const player = hand.players.find((entry) => entry.id === playerId);
    if (player?.name) return player.name;
  }

  return null;
}

/**
 * @param {OHHHand[]} hands
 * @returns {string|null}
 */
function findFirstSeenAt(hands) {
  if (hands.length === 0) return null;

  const sorted = [...hands].sort((a, b) =>
    a.start_date_utc.localeCompare(b.start_date_utc),
  );
  return sorted[0]?.start_date_utc || null;
}

/**
 * @param {OHHHand} hand
 * @param {string} playerId
 * @returns {Cents}
 */
function calculateNetResult(hand, playerId) {
  const contributions =
    buildContributionsByPlayer(hand.rounds).get(playerId) || 0;
  let winnings = 0;

  for (const pot of hand.pots) {
    for (const win of pot.player_wins) {
      if (win.player_id === playerId) {
        winnings += toCents(win.win_amount);
      }
    }
  }

  return winnings - contributions;
}

/**
 * @param {string} gameId
 * @param {string} playerId
 * @returns {Promise<Cents>}
 */
async function calculateTournamentNetResult(gameId, playerId) {
  const summary = await readTournamentSummary(gameId);
  if (summary) {
    return calculateTournamentSummaryNetResult(summary, playerId);
  }

  const game = await recoverGameFromHistory(gameId);
  if (!game?.tournament?.active) {
    return 0;
  }

  return (
    Ranking.computeRankings(game).find(
      (ranking) => ranking.playerId === playerId,
    )?.netWinnings || 0
  );
}

/**
 * @param {import('./poker/tournament-summary.js').OTSSummary} summary
 * @param {string} playerId
 * @returns {Cents}
 */
function calculateTournamentSummaryNetResult(summary, playerId) {
  const buyIn = toCents(summary.buyin_amount || 0);
  const finish = summary.tournament_finishes_and_winnings.find(
    (entry) => entry.player_name === playerId,
  );

  if (!finish) {
    return 0;
  }

  return toCents(finish.prize || 0) - buyIn;
}

/**
 * @param {OHHHand["rounds"]} rounds
 * @returns {Map<string, Cents>}
 */
function buildContributionsByPlayer(rounds) {
  /** @type {Map<string, Cents>} */
  const contributions = new Map();

  for (const round of rounds) {
    /** @type {Map<string, Cents>} */
    const roundTotals = new Map();

    for (const action of round.actions) {
      if (
        !contributionActions.has(action.action) ||
        action.amount === undefined
      ) {
        continue;
      }

      const actionAmount = toCents(action.amount);
      const previousTotal = roundTotals.get(action.player_id) || 0;
      const delta = Math.max(0, actionAmount - previousTotal);
      roundTotals.set(action.player_id, Math.max(previousTotal, actionAmount));
      contributions.set(
        action.player_id,
        (contributions.get(action.player_id) || 0) + delta,
      );
    }
  }

  return contributions;
}
