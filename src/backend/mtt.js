import * as Id from "./id.js";
import * as PokerGame from "./poker/game.js";
import * as Tournament from "../shared/tournament.js";
import { TIMER_INTERVAL } from "./poker/game-constants.js";
import { tickClock } from "./poker/tournament-clock.js";
import {
  DEFAULT_TOURNAMENT_NAME,
  normalizeTournamentName,
} from "./mtt-metadata.js";
import {
  applyTournamentStateToTable,
  isHandSettled,
  syncWaitingTableState,
  getOpenTables,
  getPopulatedOpenTables,
  hasSettledWaitingHand,
  clearTableWinner,
  resetClosedTable,
  canStartPendingBreak,
  canCoordinateTournament,
} from "./mtt-table-state.js";
import { finishTournament } from "./mtt-finish.js";
import { recoverFinishedMttFromSummary } from "./mtt-recovery.js";
import { buildTournamentView } from "./mtt-view.js";
import {
  seatEntrantAtTable,
  getActiveSeatIndexes,
  getSeatedContenders,
  movePlayer,
} from "./mtt-seating.js";
import { rebalanceTournament } from "./mtt-reconciliation.js";
import { allocateManagedTableIdentity } from "./mtt-table-names.js";
import { DEFAULT_MAX_REBUYS, isRebuyPeriodOpen } from "./mtt-rebuy-policy.js";
import {
  finalizeRebuyDecision,
  handleRebuyDecisionAction,
  processTableAfterHand,
} from "./mtt-rebuys.js";
import {
  applyRebuyPeriodTransition,
  callRebuyClock,
  tickRebuyDecisionClocks,
} from "./mtt-rebuy-clock.js";

/**
 * @typedef {import('./user.js').User} User
 * @typedef {import('./poker/game.js').Game} Game
 * @typedef {"registration"|"running"|"finished"} TournamentStatus
 * @typedef {"registered"|"seated"|"eliminated"|"winner"} EntrantStatus
 *
 * @typedef {object} TournamentEntrant
 * @property {string} playerId
 * @property {string} [name]
 * @property {EntrantStatus} status
 * @property {number} stack
 * @property {string} [tableId]
 * @property {number} [seatIndex]
 * @property {number} [finishPosition]
 * @property {number} handsPlayed
 * @property {number} rebuysUsed
 * @property {number} registrationOrder
 * @property {string} registeredAt
 * @property {string} [eliminatedAt]
 *
 * @typedef {object} ManagedTable
 * @property {string} tableId
 * @property {string} tableName
 * @property {number} createdOrder
 * @property {string} createdAt
 * @property {string} [closedAt]
 * @property {number} [handNumber]
 *
 * @typedef {object} ManagedTournament
 * @property {string} id
 * @property {string} name
 * @property {TournamentStatus} status
 * @property {string} ownerId
 * @property {string} [ownerName]
 * @property {number} buyIn
 * @property {number} tableSize
 * @property {number} initialStack
 * @property {number} maxRebuys
 * @property {number} level
 * @property {number} levelTicks
 * @property {boolean} onBreak
 * @property {boolean} pendingBreak
 * @property {boolean} pendingRebalance
 * @property {number} breakTicks
 * @property {string} createdAt
 * @property {string} [startedAt]
 * @property {string} [endedAt]
 * @property {Map<string, TournamentEntrant>} entrants
 * @property {ManagedTable[]} tables
 * @property {number} nextRegistrationOrder
 * @property {NodeJS.Timeout} [tickTimer]
 */

/**
 * @typedef {object} ManagedTournamentViewTable
 * @property {string} tableId
 * @property {string} tableName
 * @property {number} playerCount
 * @property {number} handNumber
 * @property {boolean} waiting
 * @property {boolean} closed
 *
 * @typedef {object} ManagedTournamentViewEntrant
 * @property {string} playerId
 * @property {string} [name]
 * @property {EntrantStatus} status
 * @property {number} stack
 * @property {string} [tableId]
 * @property {number} [seatIndex]
 * @property {number} [finishPosition]
 * @property {number} [netWinnings]
 *
 * @typedef {object} ManagedTournamentView
 * @property {string} id
 * @property {string} name
 * @property {TournamentStatus} status
 * @property {string} ownerId
 * @property {{ id: string, name?: string }} owner
 * @property {number} buyIn
 * @property {number} prizePool
 * @property {number} maxRebuys
 * @property {number} tableSize
 * @property {number} level
 * @property {number} timeToNextLevel
 * @property {boolean} onBreak
 * @property {boolean} pendingBreak
 * @property {string} createdAt
 * @property {string} [startedAt]
 * @property {string} [endedAt]
 * @property {ManagedTournamentViewEntrant[]} entrants
 * @property {ManagedTournamentViewEntrant[]} standings
 * @property {ManagedTournamentViewTable[]} tables
 * @property {{ isOwner: boolean, status: EntrantStatus|"not_registered", tableId?: string, seatIndex?: number, finishPosition?: number }} currentPlayer
 * @property {{ canRegister: boolean, canUnregister: boolean, canStart: boolean, canRename: boolean }} actions
 */

/**
 * @param {{
 *   games: Map<string, Game>,
 *   broadcastTableState?: (tableId: string) => void,
 *   broadcastTournamentState?: (tournamentId: string, playerMoves?: import('./mtt-seating.js').PlayerMovedEvent[]) => void,
 *   ensureTableTick?: (game: Game) => void,
 *   finalizePendingTableHand?: (game: Game) => boolean,
 *   now?: () => string,
 *   setIntervalFn?: typeof setInterval,
 *   clearIntervalFn?: typeof clearInterval,
 * }} params
 */
export function createMttManager({
  games,
  broadcastTableState = () => {},
  broadcastTournamentState = () => {},
  ensureTableTick = () => {},
  finalizePendingTableHand = () => false,
  now = () => new Date().toISOString(),
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
}) {
  /** @type {Map<string, ManagedTournament>} */
  const tournaments = new Map();

  /**
   * @param {string} tournamentId
   * @returns {ManagedTournament}
   */
  function requireTournament(tournamentId) {
    const tournament = tournaments.get(tournamentId);
    if (!tournament) {
      throw new Error("tournament not found");
    }
    return tournament;
  }

  /**
   * @param {string} tournamentId
   * @returns {ManagedTournament}
   */
  function requireTournamentViewState(tournamentId) {
    const tournament = tournaments.get(tournamentId);
    if (tournament) return tournament;

    const recoveredTournament = recoverFinishedMttFromSummary(tournamentId);
    if (!recoveredTournament) {
      throw new Error("tournament not found");
    }

    tournaments.set(tournamentId, recoveredTournament);
    return recoveredTournament;
  }

  /**
   * @param {ManagedTournament} tournament
   * @param {import('./mtt-seating.js').PlayerMovedEvent[]} [playerMoves]
   */
  function broadcastTournament(tournament, playerMoves = []) {
    broadcastTournamentState(tournament.id, playerMoves);
  }

  /**
   * @param {TournamentEntrant} entrant
   */
  function syncEntrantNameToTable(entrant) {
    if (!entrant.tableId || entrant.seatIndex === undefined) return;

    const game = games.get(entrant.tableId);
    if (!game) return;

    const seat = game.seats[entrant.seatIndex];
    if (!seat || seat.empty) return;

    seat.player.name = entrant.name;
    broadcastTableState(game.id);
  }

  /**
   * @param {ManagedTournament} tournament
   * @param {Iterable<string>} tableIds
   * @param {import('./mtt-seating.js').PlayerMovedEvent[]} [playerMoves]
   */
  function broadcastTables(tournament, tableIds, playerMoves = []) {
    for (const tableId of tableIds) {
      broadcastTableState(tableId);
    }
    broadcastTournament(tournament, playerMoves);
  }

  /**
   * @param {ManagedTournament} tournament
   */
  function stopTicking(tournament) {
    if (tournament.tickTimer) {
      clearIntervalFn(tournament.tickTimer);
      delete tournament.tickTimer;
    }
  }

  /**
   * @param {ManagedTournament} tournament
   */
  function startTicking(tournament) {
    stopTicking(tournament);
    const tickTimer = setIntervalFn(() => {
      tickTournament(tournament.id);
    }, TIMER_INTERVAL);
    if ("unref" in tickTimer && typeof tickTimer.unref === "function") {
      tickTimer.unref();
    }
    tournament.tickTimer = /** @type {NodeJS.Timeout} */ (tickTimer);
  }

  /**
   * @param {ManagedTournament} tournament
   * @param {number} entrantCount
   * @returns {number[]}
   */
  function buildTableSizes(tournament, entrantCount) {
    const tableCount = Math.ceil(entrantCount / tournament.tableSize);
    const base = Math.floor(entrantCount / tableCount);
    const remainder = entrantCount % tableCount;
    /** @type {number[]} */
    const sizes = [];
    for (let i = 0; i < tableCount; i += 1) {
      sizes.push(base + (i < remainder ? 1 : 0));
    }
    return sizes;
  }

  /**
   * @param {ManagedTournament} tournament
   * @param {{ finalTable: boolean }} options
   * @returns {{ table: ManagedTable, game: Game }}
   */
  function createManagedTable(tournament, options) {
    const { tableName, createdOrder } = allocateManagedTableIdentity(
      tournament,
      options,
    );
    const game = PokerGame.createMttTable({
      seats: tournament.tableSize,
      buyIn: tournament.buyIn,
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      tableName,
      startTime: tournament.startedAt,
      level: tournament.level,
    });

    applyTournamentStateToTable(tournament, game);
    const table = {
      tableId: game.id,
      tableName,
      createdOrder,
      createdAt: tournament.startedAt ?? now(),
    };
    tournament.tables.push(table);
    games.set(game.id, game);
    return { table, game };
  }

  /**
   * @param {ManagedTournament} tournament
   * @param {Array<{ table: ManagedTable, game: Game, activePlayers: number }>} activeTables
   * @param {Set<string>} changedTables
   * @param {import('./mtt-seating.js').PlayerMovedEvent[]} playerMoves
   */
  function mergeIntoFinalTable(
    tournament,
    activeTables,
    changedTables,
    playerMoves,
  ) {
    const { game: finalGame } = createManagedTable(tournament, {
      finalTable: true,
    });
    changedTables.add(finalGame.id);

    const tablesInMoveOrder = [...activeTables].sort(
      (a, b) => a.table.createdOrder - b.table.createdOrder,
    );

    for (const entry of tablesInMoveOrder) {
      const activeSeatIndexes = getActiveSeatIndexes(
        tournament,
        entry.game,
      ).sort((a, b) => a - b);
      for (const seatIndex of activeSeatIndexes) {
        playerMoves.push(
          movePlayer(tournament, entry.game, seatIndex, finalGame),
        );
      }

      changedTables.add(entry.game.id);
      entry.table.closedAt = now();
      clearTableWinner(entry.game);
      resetClosedTable(entry.game);
      applyTournamentStateToTable(tournament, entry.game);
    }
  }

  /**
   * @param {ManagedTournament} tournament
   * @returns {string[]}
   */
  function startManagedTables(tournament) {
    const entrants = [...tournament.entrants.values()].sort(
      (a, b) => a.registrationOrder - b.registrationOrder,
    );
    const tableSizes = buildTableSizes(tournament, entrants.length);
    /** @type {string[]} */
    const createdTableIds = [];
    let entrantIndex = 0;

    tableSizes.forEach((tableSize) => {
      const { game } = createManagedTable(tournament, {
        finalTable: tableSizes.length === 1,
      });
      createdTableIds.push(game.id);

      for (let seatIndex = 0; seatIndex < tableSize; seatIndex += 1) {
        const entrant = entrants[entrantIndex];
        if (!entrant) break;
        entrant.stack = tournament.initialStack;
        seatEntrantAtTable(tournament, game, entrant, seatIndex);
        entrantIndex += 1;
      }

      syncWaitingTableState(tournament, game, ensureTableTick);
    });

    return createdTableIds;
  }

  /**
   * @param {ManagedTournament} tournament
   * @param {Iterable<string>} tableIds
   */
  function syncTables(tournament, tableIds) {
    for (const tableId of tableIds) {
      const game = games.get(tableId);
      if (!game) continue;
      clearTableWinner(game);
      syncWaitingTableState(tournament, game, ensureTableTick);
    }
  }

  /**
   * @param {ManagedTournament} tournament
   * @param {Set<string>} changedTableIds
   */
  function maybeStartPendingBreak(tournament, changedTableIds) {
    if (!canStartPendingBreak(tournament, games)) return;

    tournament.pendingBreak = false;
    tournament.onBreak = true;
    tournament.breakTicks = 0;
    for (const table of tournament.tables) {
      changedTableIds.add(table.tableId);
    }
  }

  /**
   * @param {ManagedTournament} tournament
   * @param {Set<string>} changedTableIds
   */
  function finalizeSettledWaitingTables(tournament, changedTableIds) {
    for (const entry of getPopulatedOpenTables(tournament, games)) {
      if (!hasSettledWaitingHand(entry.game)) {
        continue;
      }
      if (finalizePendingTableHand(entry.game)) {
        processTableAfterHand(tournament, entry.game, now);
        changedTableIds.add(entry.game.id);
      }
    }
  }

  /**
   * @param {ManagedTournament} tournament
   * @param {Set<string>} changedTableIds
   * @returns {boolean}
   */
  function maybeFinishTournament(tournament, changedTableIds) {
    const contenders = getSeatedContenders(tournament, games);
    if (contenders.length !== 1) {
      return false;
    }

    finishTournament(tournament, games, ensureTableTick, now, contenders[0]);
    stopTicking(tournament);
    for (const table of tournament.tables) {
      changedTableIds.add(table.tableId);
    }
    return true;
  }

  /**
   * @param {ManagedTournament} tournament
   * @param {Set<string>} changedTableIds
   * @param {{ broadcastAllOpenTables?: boolean, detectWinner?: boolean }} [options]
   */
  function reconcileTournament(
    tournament,
    changedTableIds,
    { broadcastAllOpenTables = false, detectWinner = true } = {},
  ) {
    /** @type {import('./mtt-seating.js').PlayerMovedEvent[]} */
    const playerMoves = [];

    if (canCoordinateTournament(tournament, games)) {
      if (detectWinner && maybeFinishTournament(tournament, changedTableIds)) {
        broadcastTables(tournament, changedTableIds);
        return;
      }

      const balancedTables = rebalanceTournament(
        tournament,
        games,
        now,
        (activeTables, changedTables) => {
          mergeIntoFinalTable(
            tournament,
            activeTables,
            changedTables,
            playerMoves,
          );
        },
        playerMoves,
      );
      for (const tableId of balancedTables) {
        changedTableIds.add(tableId);
      }
    }

    const tableIds = broadcastAllOpenTables
      ? getOpenTables(tournament, games).map((entry) => entry.table.tableId)
      : changedTableIds;
    syncTables(tournament, tableIds);
    broadcastTables(tournament, tableIds, playerMoves);
  }

  /**
   * @param {string} tournamentId
   */
  function tickTournament(tournamentId) {
    const tournament = tournaments.get(tournamentId);
    if (!tournament || tournament.status !== "running") {
      return;
    }

    /** @type {Set<string>} */
    const changedTableIds = new Set();
    const finalizedRebuyDecision = tickRebuyDecisionClocks(
      tournament,
      games,
      now,
      changedTableIds,
    );

    const rebuyPeriodWasOpen = isRebuyPeriodOpen(tournament);
    const canStartBreak = getPopulatedOpenTables(tournament, games).every(
      (entry) => isHandSettled(entry.game),
    );
    tickClock(tournament, canStartBreak);
    applyRebuyPeriodTransition(
      tournament,
      games,
      rebuyPeriodWasOpen,
      changedTableIds,
    );
    finalizeSettledWaitingTables(tournament, changedTableIds);

    reconcileTournament(tournament, changedTableIds, {
      broadcastAllOpenTables: true,
      detectWinner: finalizedRebuyDecision,
    });
  }

  /**
   * @param {string} tournamentId
   * @param {User} user
   * @returns {ManagedTournamentView}
   */
  function registerPlayer(tournamentId, user) {
    const tournament = requireTournament(tournamentId);
    if (tournament.status !== "registration") {
      throw new Error("registration is closed");
    }
    if (!user.email) {
      throw new Error("sign up required to register");
    }
    if (tournament.entrants.has(user.id)) {
      throw new Error("player already registered");
    }

    tournament.entrants.set(user.id, {
      playerId: user.id,
      name: user.name,
      status: "registered",
      stack: tournament.initialStack,
      handsPlayed: 0,
      rebuysUsed: 0,
      registrationOrder: tournament.nextRegistrationOrder,
      registeredAt: now(),
    });
    tournament.nextRegistrationOrder += 1;
    broadcastTournament(tournament);
    return buildTournamentView(tournament, games, user.id);
  }

  return {
    /**
     * @param {{ owner: User, buyIn: number, tableSize: number, maxRebuys?: unknown }} options
     */
    createTournament({
      owner,
      buyIn,
      tableSize,
      maxRebuys = DEFAULT_MAX_REBUYS,
    }) {
      if (!Tournament.isValidBuyin(buyIn)) {
        throw new Error("invalid tournament buy-in");
      }
      if (
        typeof maxRebuys !== "number" ||
        !Number.isInteger(maxRebuys) ||
        maxRebuys < 0
      ) {
        throw new Error("invalid maximum rebuys");
      }

      const createdAt = now();
      /** @type {ManagedTournament} */
      const tournament = {
        id: Id.generate(),
        name: DEFAULT_TOURNAMENT_NAME,
        status: "registration",
        ownerId: owner.id,
        ownerName: owner.name,
        buyIn,
        tableSize,
        initialStack: Tournament.INITIAL_STACK,
        maxRebuys,
        level: 1,
        levelTicks: 0,
        onBreak: false,
        pendingBreak: false,
        pendingRebalance: false,
        breakTicks: 0,
        createdAt,
        entrants: new Map(),
        tables: [],
        nextRegistrationOrder: 0,
      };

      tournaments.set(tournament.id, tournament);
      registerPlayer(tournament.id, owner);
      return tournament.id;
    },

    /**
     * @param {string} tournamentId
     * @returns {ManagedTournament|undefined}
     */
    getTournament(tournamentId) {
      return tournaments.get(tournamentId);
    },

    registerPlayer,

    /**
     * @param {string} tournamentId
     * @param {unknown} name
     * @param {string} actorId
     * @returns {ManagedTournamentView}
     */
    renameTournament(tournamentId, name, actorId) {
      const tournament = requireTournament(tournamentId);
      if (tournament.ownerId !== actorId) {
        throw new Error("only the tournament owner can rename");
      }

      tournament.name = normalizeTournamentName(name);
      for (const table of tournament.tables) {
        const game = games.get(table.tableId);
        if (game?.tournament) {
          game.tournament.name = tournament.name;
        }
      }
      broadcastTournament(tournament);
      return buildTournamentView(tournament, games, actorId);
    },

    /**
     * @param {string} tournamentId
     * @param {string} playerId
     * @param {string} actorId
     * @returns {ManagedTournamentView}
     */
    unregisterPlayer(tournamentId, playerId, actorId) {
      const tournament = requireTournament(tournamentId);
      if (tournament.status !== "registration") {
        throw new Error("registration is closed");
      }
      if (playerId !== actorId) {
        throw new Error("cannot unregister another player");
      }
      const entrant = tournament.entrants.get(playerId);
      if (!entrant || entrant.status !== "registered") {
        throw new Error("player is not registered");
      }

      tournament.entrants.delete(playerId);
      broadcastTournament(tournament);
      return buildTournamentView(tournament, games, actorId);
    },

    /**
     * @param {string} tournamentId
     * @param {string} actorId
     * @returns {ManagedTournamentView}
     */
    startTournament(tournamentId, actorId) {
      const tournament = requireTournament(tournamentId);
      if (tournament.ownerId !== actorId) {
        throw new Error("only the tournament owner can start");
      }
      if (tournament.status !== "registration") {
        throw new Error("tournament already started");
      }
      if (tournament.entrants.size < 2) {
        throw new Error("need at least 2 registered players");
      }

      tournament.status = "running";
      tournament.startedAt = now();
      const createdTableIds = startManagedTables(tournament);
      startTicking(tournament);
      broadcastTables(tournament, createdTableIds);
      return buildTournamentView(tournament, games, actorId);
    },

    /**
     * @param {string} tournamentId
     * @param {string} playerId
     * @returns {ManagedTournamentView}
     */
    getTournamentView(tournamentId, playerId) {
      const tournament = requireTournamentViewState(tournamentId);
      return buildTournamentView(tournament, games, playerId);
    },

    /**
     * @param {User} user
     */
    syncUser(user) {
      for (const tournament of tournaments.values()) {
        const isOwner = tournament.ownerId === user.id;
        const entrant = tournament.entrants.get(user.id);
        if (!isOwner && !entrant) continue;

        if (isOwner) {
          tournament.ownerName = user.name;
        }
        if (entrant) {
          entrant.name = user.name;
          syncEntrantNameToTable(entrant);
        }
        broadcastTournament(tournament);
      }
    },

    /**
     * @param {import('./poker/seat.js').Player} player
     * @param {Game} game
     * @param {string} action
     * @returns {boolean}
     */
    handleTableAction(player, game, action) {
      if (game.kind !== "mtt") {
        return false;
      }

      const tournament = tournaments.get(game.tournamentId);
      if (!tournament) {
        throw new Error("managed tournament not found");
      }
      if (action === "callClock" && callRebuyClock(game, player.id)) {
        reconcileTournament(tournament, new Set([game.id]), {
          detectWinner: false,
        });
        return true;
      }

      if (!handleRebuyDecisionAction(tournament, game, player.id, action)) {
        return false;
      }

      const changedTableIds = new Set([game.id]);
      finalizeRebuyDecision(tournament, game, now);
      reconcileTournament(tournament, changedTableIds);
      return true;
    },

    /**
     * @param {Game} game
     */
    handleHandFinalized(game) {
      if (game.kind !== "mtt") {
        return;
      }

      const tournament = tournaments.get(game.tournamentId);
      if (!tournament || tournament.status !== "running") {
        return;
      }

      /** @type {Set<string>} */
      const changedTableIds = new Set([game.id]);
      const rebuyPeriodWasOpen = isRebuyPeriodOpen(tournament);
      maybeStartPendingBreak(tournament, changedTableIds);
      applyRebuyPeriodTransition(
        tournament,
        games,
        rebuyPeriodWasOpen,
        changedTableIds,
      );
      finalizeSettledWaitingTables(tournament, changedTableIds);
      processTableAfterHand(tournament, game, now);
      reconcileTournament(tournament, changedTableIds);
    },

    /**
     * @param {string} tournamentId
     */
    tickTournament,

    close() {
      for (const tournament of tournaments.values()) {
        stopTicking(tournament);
      }
    },
  };
}
