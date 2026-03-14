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
 * @typedef {import('./id.js').Id} Id
 */

/**
 * @typedef {object} RecentGame
 * @property {Id} gameId
 * @property {Id} tableId
 * @property {Id|null} tournamentId
 * @property {"cash"|"sitngo"|"mtt"} gameType
 * @property {Cents} netWinnings
 * @property {number} handsPlayed
 * @property {string} lastPlayedAt
 * @property {number} lastHandNumber
 */

/**
 * @typedef {object} PlayerProfile
 * @property {Id} id
 * @property {string} name
 * @property {boolean} online
 * @property {string|null} lastSeenAt
 * @property {string} joinedAt
 * @property {Cents} totalNetWinnings
 * @property {number} totalHands
 * @property {RecentGame[]} recentGames
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
    recentGames: totals.recentGames,
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
 * @returns {Promise<{ totalNetWinnings: Cents, totalHands: number, hands: OHHHand[], recentGames: RecentGame[] }>}
 */
async function summarizePlayerHistory(playerId) {
  /** @type {OHHHand[]} */
  const matchingHands = [];
  let totalNetWinnings = 0;
  /** @type {RecentGame[]} */
  const recentGames = [];
  const mttTournamentLinks = Store.listPlayerTournaments(playerId);
  const mttTournamentIds = new Set(
    mttTournamentLinks.map((link) => link.tournamentId),
  );

  for (const tableLink of listPlayerHistoryTables(playerId)) {
    if (
      tableLink.tournamentId &&
      mttTournamentIds.has(tableLink.tournamentId)
    ) {
      continue;
    }

    const summary = await summarizeTableHistory(tableLink, playerId);
    if (!summary) continue;

    matchingHands.push(...summary.hands);
    totalNetWinnings += summary.recentGame.netWinnings;
    recentGames.push(summary.recentGame);
  }

  for (const tournamentLink of mttTournamentLinks) {
    const summary = await summarizeMttHistory(tournamentLink, playerId);
    if (!summary) continue;

    matchingHands.push(...summary.hands);
    totalNetWinnings += summary.recentGame.netWinnings;
    recentGames.push(summary.recentGame);
  }

  recentGames.sort((a, b) => {
    const dateCompare = b.lastPlayedAt.localeCompare(a.lastPlayedAt);
    if (dateCompare !== 0) return dateCompare;
    return (b.tournamentId || b.tableId).localeCompare(
      a.tournamentId || a.tableId,
    );
  });

  return {
    totalNetWinnings,
    totalHands: matchingHands.length,
    hands: matchingHands,
    recentGames,
  };
}

/**
 * @param {OHHHand[]} hands
 * @returns {OHHHand|null}
 */
function findLatestHand(hands) {
  const [firstHand, ...remainingHands] = hands;
  if (!firstHand) return null;

  return remainingHands.reduce((latest, hand) => {
    const dateCompare = hand.start_date_utc.localeCompare(
      latest.start_date_utc,
    );
    if (dateCompare > 0) return hand;
    if (dateCompare < 0) return latest;
    return parseHandNumber(hand) > parseHandNumber(latest) ? hand : latest;
  }, firstHand);
}

/**
 * @param {OHHHand} hand
 * @returns {number}
 */
function parseHandNumber(hand) {
  return parseInt(hand.game_number.split("-").pop() || "0", 10);
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
 * @param {string} tournamentId
 * @param {string} playerId
 * @param {string} [fallbackTableId]
 * @returns {Promise<Cents>}
 */
async function calculateTournamentNetResult(
  tournamentId,
  playerId,
  fallbackTableId = tournamentId,
) {
  const summary = await readTournamentSummary(tournamentId);
  if (summary) {
    return calculateTournamentSummaryNetResult(summary, playerId);
  }

  const game = await recoverGameFromHistory(fallbackTableId);
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
 * @param {Id} playerId
 * @returns {Store.PlayerTableLink[]}
 */
function listPlayerHistoryTables(playerId) {
  const tableLinks = Store.listPlayerTables(playerId);
  const tableIds = new Set(tableLinks.map((link) => link.tableId));

  for (const gameId of Store.listPlayerGameIds(playerId)) {
    if (tableIds.has(gameId)) continue;
    tableLinks.push({
      tableId: gameId,
      tournamentId: null,
      lastHandNumber: 0,
      lastPlayedAt: new Date(0).toISOString(),
    });
  }

  return tableLinks;
}

/**
 * @param {Store.PlayerTableLink} tableLink
 * @param {Id} playerId
 * @returns {Promise<{ hands: OHHHand[], recentGame: RecentGame }|null>}
 */
async function summarizeTableHistory(tableLink, playerId) {
  const hands = await readHandsFromFile(tableLink.tableId);
  const playerHands = hands.filter((hand) =>
    hand.players.some((player) => player.id === playerId),
  );
  if (playerHands.length === 0) return null;

  const lastPlayedHand = findLatestHand(playerHands);
  if (!lastPlayedHand) return null;

  const gameType = resolveGameType(tableLink.tableId, playerHands);
  const netWinnings =
    gameType === "cash"
      ? playerHands.reduce(
          (total, hand) => total + calculateNetResult(hand, playerId),
          0,
        )
      : await calculateTournamentNetResult(
          tableLink.tournamentId || tableLink.tableId,
          playerId,
          tableLink.tableId,
        );

  return {
    hands: playerHands,
    recentGame: {
      gameId: tableLink.tableId,
      tableId: tableLink.tableId,
      tournamentId: gameType === "mtt" ? tableLink.tournamentId : null,
      gameType,
      netWinnings,
      handsPlayed: playerHands.length,
      lastPlayedAt:
        tableLink.lastPlayedAt !== new Date(0).toISOString()
          ? tableLink.lastPlayedAt
          : lastPlayedHand.start_date_utc,
      lastHandNumber:
        tableLink.lastHandNumber || parseHandNumber(lastPlayedHand),
    },
  };
}

/**
 * @param {Store.PlayerTournamentLink} tournamentLink
 * @param {Id} playerId
 * @returns {Promise<{ hands: OHHHand[], recentGame: RecentGame }|null>}
 */
async function summarizeMttHistory(tournamentLink, playerId) {
  const tableLinks = Store.listPlayerTablesForTournament(
    playerId,
    tournamentLink.tournamentId,
  );
  const sourceTableLinks =
    tableLinks.length > 0
      ? tableLinks
      : [
          {
            tableId: tournamentLink.lastTableId,
            tournamentId: tournamentLink.tournamentId,
            lastHandNumber: tournamentLink.lastHandNumber,
            lastPlayedAt: tournamentLink.lastPlayedAt,
          },
        ];

  /** @type {OHHHand[]} */
  const playerHands = [];
  for (const tableLink of sourceTableLinks) {
    const hands = await readHandsFromFile(tableLink.tableId);
    playerHands.push(
      ...hands.filter((hand) =>
        hand.players.some((player) => player.id === playerId),
      ),
    );
  }

  if (playerHands.length === 0) return null;

  return {
    hands: playerHands,
    recentGame: {
      gameId: tournamentLink.lastTableId,
      tableId: tournamentLink.lastTableId,
      tournamentId: tournamentLink.tournamentId,
      gameType: "mtt",
      netWinnings: await calculateTournamentNetResult(
        tournamentLink.tournamentId,
        playerId,
        tournamentLink.lastTableId,
      ),
      handsPlayed: playerHands.length,
      lastPlayedAt: tournamentLink.lastPlayedAt,
      lastHandNumber: tournamentLink.lastHandNumber,
    },
  };
}

/**
 * @param {Id} tableId
 * @param {OHHHand[]} hands
 * @returns {"cash"|"sitngo"|"mtt"}
 */
function resolveGameType(tableId, hands) {
  const table = Store.loadTable(tableId);
  if (table?.kind === "sitngo" || table?.kind === "mtt") {
    return table.kind;
  }
  if (hands.some((hand) => hand.tournament_info?.type === "MTT")) {
    return "mtt";
  }
  if (hands.some((hand) => hand.tournament || hand.tournament_info)) {
    return "sitngo";
  }
  return "cash";
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
