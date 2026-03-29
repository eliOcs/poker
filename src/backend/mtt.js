import * as Id from "./id.js";
import * as PokerGame from "./poker/game.js";
import * as Seat from "./poker/seat.js";
import * as Tournament from "../shared/tournament.js";
import { TIMER_INTERVAL } from "./poker/game-constants.js";
import { tickClock } from "./poker/tournament-clock.js";
import {
  applyTournamentStateToTable,
  isTableWaiting,
  countActiveEntrants,
  syncWaitingTableState,
  getActiveTables,
  hasSettledWaitingHand,
  clearTableWinner,
  resetClosedTable,
  canStartPendingBreak,
} from "./mtt-table-state.js";
import { buildTournamentView } from "./mtt-view.js";
import {
  seatEntrantAtTable,
  getActiveSeatIndexes,
  getEntrantSeatContext,
  getContendingEntrants,
  compareForcedFinishEntrants,
  movePlayer,
} from "./mtt-seating.js";
import { rebalanceTournament } from "./mtt-collapse.js";

const FINAL_TABLE_NAME = "Final Table";

/**
 * @typedef {import('./user.js').User} User
 * @typedef {import('./poker/game.js').Game} Game
 * @typedef {"registration"|"running"|"finished"} TournamentStatus
 * @typedef {"registered"|"seated"|"eliminated"|"winner"} EntrantStatus
 *
 * @typedef {object} TournamentEntrant
 * @property {string} playerId
 * @property {string} name
 * @property {EntrantStatus} status
 * @property {number} stack
 * @property {string|null} tableId
 * @property {number|null} seatIndex
 * @property {number|null} finishPosition
 * @property {number} handsPlayed
 * @property {number} registrationOrder
 * @property {string} registeredAt
 * @property {string|null} eliminatedAt
 *
 * @typedef {object} ManagedTable
 * @property {string} tableId
 * @property {string} tableName
 * @property {number} createdOrder
 * @property {string} createdAt
 * @property {string|null} closedAt
 *
 * @typedef {object} ManagedTournament
 * @property {string} id
 * @property {TournamentStatus} status
 * @property {string} ownerId
 * @property {number} buyIn
 * @property {number} tableSize
 * @property {number} initialStack
 * @property {number} level
 * @property {number} levelTicks
 * @property {boolean} onBreak
 * @property {boolean} pendingBreak
 * @property {boolean} pendingCollapse
 * @property {number} breakTicks
 * @property {string} createdAt
 * @property {string|null} startedAt
 * @property {string|null} endedAt
 * @property {Map<string, TournamentEntrant>} entrants
 * @property {ManagedTable[]} tables
 * @property {number} nextRegistrationOrder
 * @property {NodeJS.Timeout|null} tickTimer
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
 * @property {string} name
 * @property {EntrantStatus} status
 * @property {number} stack
 * @property {string|null} tableId
 * @property {number|null} seatIndex
 * @property {number|null} finishPosition
 * @property {number|null} netWinnings
 *
 * @typedef {object} ManagedTournamentView
 * @property {string} id
 * @property {TournamentStatus} status
 * @property {string} ownerId
 * @property {number} buyIn
 * @property {number} tableSize
 * @property {number} level
 * @property {number} timeToNextLevel
 * @property {boolean} onBreak
 * @property {boolean} pendingBreak
 * @property {string} createdAt
 * @property {string|null} startedAt
 * @property {string|null} endedAt
 * @property {ManagedTournamentViewEntrant[]} entrants
 * @property {ManagedTournamentViewEntrant[]} standings
 * @property {ManagedTournamentViewTable[]} tables
 * @property {{ isOwner: boolean, status: EntrantStatus|"not_registered", tableId: string|null, seatIndex: number|null, finishPosition: number|null }} currentPlayer
 * @property {{ canRegister: boolean, canUnregister: boolean, canStart: boolean }} actions
 */

/**
 * @param {ManagedTournament} tournament
 * @param {Map<string, Game>} games
 * @param {(game: Game) => void} ensureTableTick
 * @param {() => string} now
 * @param {TournamentEntrant | null} [winnerEntrant]
 */
function finishTournament(
  tournament,
  games,
  ensureTableTick,
  now,
  winnerEntrant = null,
) {
  const activeEntrants = [...tournament.entrants.values()].filter(
    (entrant) => entrant.status === "seated",
  );
  const resolvedWinner = winnerEntrant ?? activeEntrants[0];
  if (!resolvedWinner) return;

  const forcedEliminations = activeEntrants
    .filter((entrant) => entrant.playerId !== resolvedWinner.playerId)
    .sort((a, b) => compareForcedFinishEntrants(tournament, a, b));

  forcedEliminations.forEach((entrant, index) => {
    const finishPosition = index + 2;
    const seatContext = getEntrantSeatContext(games, entrant);
    if (seatContext) {
      seatContext.seat.bustedPosition = finishPosition;
      seatContext.seat.stack = 0;
      seatContext.seat.bet = 0;
      seatContext.seat.sittingOut = true;
    }
    entrant.status = "eliminated";
    entrant.stack = 0;
    entrant.tableId = null;
    entrant.seatIndex = null;
    entrant.finishPosition = finishPosition;
    entrant.eliminatedAt = now();
  });

  const winnerSeatContext = getEntrantSeatContext(games, resolvedWinner);
  if (!winnerSeatContext) return;

  const winnerEndedAt = now();
  resolvedWinner.status = "winner";
  resolvedWinner.finishPosition = 1;
  resolvedWinner.tableId = winnerSeatContext.game.id;
  tournament.status = "finished";
  tournament.endedAt = winnerEndedAt;

  for (const table of tournament.tables) {
    table.closedAt = tournament.endedAt;
    const game = games.get(table.tableId);
    if (!game) continue;
    clearTableWinner(game);
    applyTournamentStateToTable(tournament, game);
    if (
      game.tournament &&
      resolvedWinner.tableId === table.tableId &&
      resolvedWinner.seatIndex !== null
    ) {
      game.tournament.winner = resolvedWinner.seatIndex;
    }
    game.countdown = null;
    ensureTableTick(game);
  }
}

/**
 * @param {ManagedTournament} tournament
 * @returns {number}
 */
function getNextTableCreatedOrder(tournament) {
  return (
    tournament.tables.reduce(
      (maxCreatedOrder, table) => Math.max(maxCreatedOrder, table.createdOrder),
      -1,
    ) + 1
  );
}

/**
 * @param {{
 *   games: Map<string, Game>,
 *   broadcastTableState?: (tableId: string) => void,
 *   broadcastTournamentState?: (tournamentId: string) => void,
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
   * @param {ManagedTournament} tournament
   */
  function broadcastTournament(tournament) {
    broadcastTournamentState(tournament.id);
  }

  /**
   * @param {ManagedTournament} tournament
   * @param {Iterable<string>} tableIds
   */
  function broadcastTables(tournament, tableIds) {
    for (const tableId of tableIds) {
      broadcastTableState(tableId);
    }
    broadcastTournament(tournament);
  }

  /**
   * @param {ManagedTournament} tournament
   */
  function stopTicking(tournament) {
    if (tournament.tickTimer) {
      clearIntervalFn(tournament.tickTimer);
      tournament.tickTimer = null;
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
   * @param {string} tableName
   * @returns {{ table: ManagedTable, game: Game }}
   */
  function createManagedTable(tournament, tableName) {
    const game = PokerGame.createMttTable({
      seats: tournament.tableSize,
      buyIn: tournament.buyIn,
      tournamentId: tournament.id,
      tableName,
      startTime: tournament.startedAt,
      level: tournament.level,
    });

    applyTournamentStateToTable(tournament, game);
    const table = {
      tableId: game.id,
      tableName,
      createdOrder: getNextTableCreatedOrder(tournament),
      createdAt: tournament.startedAt || now(),
      closedAt: null,
    };
    tournament.tables.push(table);
    games.set(game.id, game);
    return { table, game };
  }

  /**
   * @param {ManagedTournament} tournament
   * @param {Array<{ table: ManagedTable, game: Game, activePlayers: number }>} activeTables
   * @param {Set<string>} changedTables
   */
  function mergeIntoFinalTable(tournament, activeTables, changedTables) {
    const { game: finalGame } = createManagedTable(
      tournament,
      FINAL_TABLE_NAME,
    );
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
        movePlayer(tournament, entry.game, seatIndex, finalGame);
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

    tableSizes.forEach((tableSize, index) => {
      const { game } = createManagedTable(tournament, `Table ${index + 1}`);
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
   * @param {Game} game
   * @returns {Array<{ seat: import("./poker/seat.js").OccupiedSeat, entrant: TournamentEntrant, seatIndex: number }>}
   */
  function getBustedEntrantsForTable(tournament, game) {
    /** @type {Array<{ seat: import("./poker/seat.js").OccupiedSeat, entrant: TournamentEntrant, seatIndex: number }>} */
    const bustedEntrants = [];

    for (let i = 0; i < game.seats.length; i += 1) {
      const seat = game.seats[i];
      if (!seat || seat.empty) continue;

      const occupiedSeat =
        /** @type {import("./poker/seat.js").OccupiedSeat} */ (seat);

      const entrant = tournament.entrants.get(occupiedSeat.player.id);
      if (!entrant) continue;
      entrant.name = occupiedSeat.player.name || entrant.name;
      entrant.handsPlayed = occupiedSeat.handsPlayed;

      if (occupiedSeat.stack > 0 && !occupiedSeat.sittingOut) {
        occupiedSeat.bustedPosition = null;
        entrant.status = "seated";
        entrant.stack = occupiedSeat.stack;
        entrant.tableId = game.id;
        entrant.seatIndex = i;
        continue;
      }

      if (entrant.status === "seated") {
        bustedEntrants.push({ seat: occupiedSeat, entrant, seatIndex: i });
      }
    }

    return bustedEntrants;
  }

  /**
   * @param {Game} game
   * @param {Array<{ seat: import("./poker/seat.js").OccupiedSeat, entrant: TournamentEntrant, seatIndex: number }>} bustedEntrants
   * @param {number} activeBefore
   */
  function markBustedEntrants(game, bustedEntrants, activeBefore) {
    bustedEntrants
      .sort((a, b) => a.seatIndex - b.seatIndex)
      .forEach(({ seat, entrant, seatIndex }, index) => {
        const finishPosition = activeBefore - index;
        seat.bustedPosition = finishPosition;
        seat.stack = 0;
        seat.bet = 0;
        seat.sittingOut = true;
        entrant.status = "eliminated";
        entrant.stack = 0;
        entrant.tableId = null;
        entrant.seatIndex = null;
        entrant.finishPosition = finishPosition;
        entrant.eliminatedAt = now();
        game.seats[seatIndex] = Seat.empty();
      });
  }

  /**
   * @param {ManagedTournament} tournament
   * @param {Set<string>} changedTableIds
   */
  function syncChangedTables(tournament, changedTableIds) {
    for (const tableId of changedTableIds) {
      const changedGame = games.get(tableId);
      if (!changedGame) continue;
      clearTableWinner(changedGame);
      syncWaitingTableState(tournament, changedGame, ensureTableTick);
    }
  }

  /**
   * @param {ManagedTournament} tournament
   * @param {Game} game
   */
  function processTableAfterHand(tournament, game) {
    const activeBefore = countActiveEntrants(tournament);
    const bustedEntrants = getBustedEntrantsForTable(tournament, game);
    markBustedEntrants(game, bustedEntrants, activeBefore);
  }

  /**
   * @param {ManagedTournament} tournament
   * @param {Set<string>} changedTableIds
   */
  function maybeStartPendingBreak(tournament, changedTableIds) {
    if (!canStartPendingBreak(tournament, games)) {
      return;
    }

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
    for (const entry of getActiveTables(tournament, games)) {
      if (!hasSettledWaitingHand(entry.game)) {
        continue;
      }
      if (finalizePendingTableHand(entry.game)) {
        processTableAfterHand(tournament, entry.game);
        changedTableIds.add(entry.game.id);
      }
    }
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
    finalizeSettledWaitingTables(tournament, changedTableIds);

    const canStartBreak = getActiveTables(tournament, games).every((entry) =>
      isTableWaiting(entry.game),
    );
    tickClock(tournament, canStartBreak);

    const balancedTables = rebalanceTournament(
      tournament,
      games,
      ensureTableTick,
      now,
      (activeTables, changedTables) => {
        mergeIntoFinalTable(tournament, activeTables, changedTables);
      },
    );
    for (const tableId of balancedTables) {
      changedTableIds.add(tableId);
    }

    for (const table of tournament.tables) {
      const game = games.get(table.tableId);
      if (!game) continue;
      if (table.closedAt !== null) {
        continue;
      }
      syncWaitingTableState(tournament, game, ensureTableTick);
      broadcastTableState(table.tableId);
    }
    broadcastTournament(tournament);
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
    if (tournament.entrants.has(user.id)) {
      throw new Error("player already registered");
    }

    tournament.entrants.set(user.id, {
      playerId: user.id,
      name: user.name || user.id,
      status: "registered",
      stack: tournament.initialStack,
      tableId: null,
      seatIndex: null,
      finishPosition: null,
      handsPlayed: 0,
      registrationOrder: tournament.nextRegistrationOrder,
      registeredAt: now(),
      eliminatedAt: null,
    });
    tournament.nextRegistrationOrder += 1;
    broadcastTournament(tournament);
    return buildTournamentView(tournament, games, user.id);
  }

  return {
    /**
     * @param {{ owner: User, buyIn: number, tableSize: number }} options
     */
    createTournament({ owner, buyIn, tableSize }) {
      if (!Tournament.isValidBuyin(buyIn)) {
        throw new Error("invalid tournament buy-in");
      }

      const createdAt = now();
      /** @type {ManagedTournament} */
      const tournament = {
        id: Id.generate(),
        status: "registration",
        ownerId: owner.id,
        buyIn,
        tableSize,
        initialStack: Tournament.INITIAL_STACK,
        level: 1,
        levelTicks: 0,
        onBreak: false,
        pendingBreak: false,
        pendingCollapse: false,
        breakTicks: 0,
        createdAt,
        startedAt: null,
        endedAt: null,
        entrants: new Map(),
        tables: [],
        nextRegistrationOrder: 0,
        tickTimer: null,
      };

      tournaments.set(tournament.id, tournament);
      registerPlayer(tournament.id, owner);
      return tournament.id;
    },

    /**
     * @param {string} tournamentId
     * @returns {ManagedTournament|null}
     */
    getTournament(tournamentId) {
      return tournaments.get(tournamentId) || null;
    },

    registerPlayer,

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
      const tournament = requireTournament(tournamentId);
      return buildTournamentView(tournament, games, playerId);
    },

    /**
     * @param {User} user
     */
    syncUser(user) {
      for (const tournament of tournaments.values()) {
        const entrant = tournament.entrants.get(user.id);
        if (!entrant) continue;
        entrant.name = user.name || user.id;
        if (entrant.tableId) {
          const game = games.get(entrant.tableId);
          const seat =
            game && entrant.seatIndex !== null
              ? game.seats[entrant.seatIndex]
              : null;
          if (game && seat && !seat.empty) {
            seat.player.name = entrant.name;
            broadcastTableState(game.id);
          }
        }
        broadcastTournament(tournament);
      }
    },

    /**
     * @param {Game} game
     */
    handleHandFinalized(game) {
      if (game.kind !== "mtt" || !game.tournamentId) {
        return;
      }

      const tournament = tournaments.get(game.tournamentId);
      if (!tournament || tournament.status !== "running") {
        return;
      }

      /** @type {Set<string>} */
      const changedTableIds = new Set([game.id]);
      finalizeSettledWaitingTables(tournament, changedTableIds);
      processTableAfterHand(tournament, game);
      maybeStartPendingBreak(tournament, changedTableIds);

      const contenders = getContendingEntrants(tournament, games);
      if (contenders.length === 1) {
        finishTournament(
          tournament,
          games,
          ensureTableTick,
          now,
          contenders[0],
        );
        stopTicking(tournament);
        for (const table of tournament.tables) {
          changedTableIds.add(table.tableId);
        }
        broadcastTables(tournament, changedTableIds);
        return;
      }

      const balancedTables = rebalanceTournament(
        tournament,
        games,
        ensureTableTick,
        now,
        (activeTables, changedTableIds) => {
          mergeIntoFinalTable(tournament, activeTables, changedTableIds);
        },
      );
      for (const tableId of balancedTables) {
        changedTableIds.add(tableId);
      }

      syncChangedTables(tournament, changedTableIds);
      broadcastTables(tournament, changedTableIds);
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
