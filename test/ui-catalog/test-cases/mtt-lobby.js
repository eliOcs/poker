import { html } from "lit";
import "/src/frontend/mtt-lobby.js";

const BASE_CREATED_AT = "2026-01-15T10:00:00.000Z";

function mttLobbyView({ tournament = null, loading = false, error = "" } = {}) {
  return html`
    <div style="min-height: 100vh; width: 100%;">
      <phg-mtt-lobby
        tournament-id="t1abc123"
        .tournament=${tournament}
        .user=${null}
        ?loading=${loading}
        .error=${error}
      ></phg-mtt-lobby>
    </div>
  `;
}

function makeEntrant(playerId, name, overrides = {}) {
  return {
    playerId,
    name,
    status: "registered",
    stack: 1000,
    tableId: null,
    seatIndex: null,
    finishPosition: null,
    netWinnings: null,
    ...overrides,
  };
}

function makeTable(tableId, tableName, overrides = {}) {
  return {
    tableId,
    tableName,
    playerCount: 6,
    handNumber: 5,
    waiting: false,
    closed: false,
    ...overrides,
  };
}

function makeBaseTournament(overrides = {}) {
  return {
    id: "t1abc123",
    status: "registration",
    ownerId: "owner1",
    buyIn: 500,
    tableSize: 6,
    level: 1,
    timeToNextLevel: 420,
    onBreak: false,
    pendingBreak: false,
    createdAt: BASE_CREATED_AT,
    startedAt: null,
    endedAt: null,
    entrants: [],
    standings: [],
    tables: [],
    currentPlayer: {
      isOwner: false,
      status: "not_registered",
      tableId: null,
      seatIndex: null,
      finishPosition: null,
    },
    actions: {
      canRegister: true,
      canUnregister: false,
      canStart: false,
    },
    ...overrides,
  };
}

const ENTRANTS_3 = [
  makeEntrant("owner1", "Alice"),
  makeEntrant("player2", "Bob"),
  makeEntrant("player3", "Charlie"),
];

export const MTT_LOBBY_TEST_CASES = {
  // === LOADING / ERROR STATES ===

  "mtt-lobby-loading": () => mttLobbyView({ loading: true }),

  "mtt-lobby-error": () =>
    mttLobbyView({ error: "Could not load tournament. Please try again." }),

  // === REGISTRATION PHASE ===

  "mtt-lobby-registration-can-register": () =>
    mttLobbyView({
      tournament: makeBaseTournament({
        entrants: [makeEntrant("owner1", "Alice")],
        standings: [makeEntrant("owner1", "Alice")],
        currentPlayer: {
          isOwner: false,
          status: "not_registered",
          tableId: null,
          seatIndex: null,
          finishPosition: null,
        },
        actions: { canRegister: true, canUnregister: false, canStart: false },
      }),
    }),

  "mtt-lobby-registration-registered": () =>
    mttLobbyView({
      tournament: makeBaseTournament({
        entrants: [makeEntrant("owner1", "Alice"), makeEntrant("you", "You")],
        standings: [makeEntrant("owner1", "Alice"), makeEntrant("you", "You")],
        currentPlayer: {
          isOwner: false,
          status: "registered",
          tableId: null,
          seatIndex: null,
          finishPosition: null,
        },
        actions: { canRegister: false, canUnregister: true, canStart: false },
      }),
    }),

  "mtt-lobby-registration-owner-can-start": () =>
    mttLobbyView({
      tournament: makeBaseTournament({
        entrants: ENTRANTS_3,
        standings: ENTRANTS_3,
        currentPlayer: {
          isOwner: true,
          status: "registered",
          tableId: null,
          seatIndex: null,
          finishPosition: null,
        },
        actions: { canRegister: false, canUnregister: true, canStart: true },
      }),
    }),

  "mtt-lobby-registration-action-pending": () =>
    mttLobbyView({
      tournament: makeBaseTournament({
        entrants: ENTRANTS_3,
        standings: ENTRANTS_3,
        currentPlayer: {
          isOwner: true,
          status: "registered",
          tableId: null,
          seatIndex: null,
          finishPosition: null,
        },
        actions: { canRegister: false, canUnregister: true, canStart: true },
      }),
    }),

  // === RUNNING PHASE ===

  "mtt-lobby-running": () => {
    const entrants = [
      makeEntrant("owner1", "Alice", {
        status: "seated",
        stack: 1450,
        tableId: "table1",
        seatIndex: 0,
      }),
      makeEntrant("player2", "Bob", {
        status: "seated",
        stack: 820,
        tableId: "table1",
        seatIndex: 2,
      }),
      makeEntrant("player3", "Charlie", {
        status: "seated",
        stack: 730,
        tableId: "table1",
        seatIndex: 4,
      }),
    ];
    const tables = [makeTable("table1", "Table 1")];
    return mttLobbyView({
      tournament: makeBaseTournament({
        status: "running",
        startedAt: BASE_CREATED_AT,
        level: 2,
        timeToNextLevel: 185,
        entrants,
        standings: entrants,
        tables,
        currentPlayer: {
          isOwner: false,
          status: "seated",
          tableId: "table1",
          seatIndex: 2,
          finishPosition: null,
        },
        actions: { canRegister: false, canUnregister: false, canStart: false },
      }),
    });
  },

  "mtt-lobby-running-on-break": () => {
    const entrants = [
      makeEntrant("owner1", "Alice", {
        status: "seated",
        stack: 1200,
        tableId: "table1",
        seatIndex: 0,
      }),
      makeEntrant("player2", "Bob", {
        status: "seated",
        stack: 900,
        tableId: "table1",
        seatIndex: 2,
      }),
      makeEntrant("player3", "Charlie", {
        status: "seated",
        stack: 900,
        tableId: "table1",
        seatIndex: 4,
      }),
    ];
    const tables = [makeTable("table1", "Table 1", { handNumber: 12 })];
    return mttLobbyView({
      tournament: makeBaseTournament({
        status: "running",
        startedAt: BASE_CREATED_AT,
        level: 3,
        timeToNextLevel: 90,
        onBreak: true,
        pendingBreak: false,
        entrants,
        standings: entrants,
        tables,
        currentPlayer: {
          isOwner: false,
          status: "seated",
          tableId: "table1",
          seatIndex: 2,
          finishPosition: null,
        },
        actions: { canRegister: false, canUnregister: false, canStart: false },
      }),
    });
  },

  "mtt-lobby-running-pending-break": () => {
    const entrants = [
      makeEntrant("owner1", "Alice", {
        status: "seated",
        stack: 1100,
        tableId: "table1",
        seatIndex: 0,
      }),
      makeEntrant("player2", "Bob", {
        status: "seated",
        stack: 950,
        tableId: "table1",
        seatIndex: 2,
      }),
      makeEntrant("player3", "Charlie", {
        status: "seated",
        stack: 950,
        tableId: "table1",
        seatIndex: 4,
      }),
    ];
    const tables = [makeTable("table1", "Table 1", { handNumber: 8 })];
    return mttLobbyView({
      tournament: makeBaseTournament({
        status: "running",
        startedAt: BASE_CREATED_AT,
        level: 2,
        timeToNextLevel: 45,
        onBreak: false,
        pendingBreak: true,
        entrants,
        standings: entrants,
        tables,
        currentPlayer: {
          isOwner: false,
          status: "seated",
          tableId: "table1",
          seatIndex: 2,
          finishPosition: null,
        },
        actions: { canRegister: false, canUnregister: false, canStart: false },
      }),
    });
  },

  "mtt-lobby-running-multiple-tables": () => {
    const entrants = [
      makeEntrant("owner1", "Alice", {
        status: "seated",
        stack: 1800,
        tableId: "table1",
        seatIndex: 0,
      }),
      makeEntrant("player2", "Bob", {
        status: "seated",
        stack: 700,
        tableId: "table1",
        seatIndex: 3,
      }),
      makeEntrant("player3", "Charlie", {
        status: "eliminated",
        stack: 0,
        tableId: null,
        finishPosition: 6,
      }),
      makeEntrant("player4", "Dana", {
        status: "seated",
        stack: 1400,
        tableId: "table2",
        seatIndex: 1,
      }),
      makeEntrant("player5", "Eve", {
        status: "seated",
        stack: 900,
        tableId: "table2",
        seatIndex: 4,
      }),
      makeEntrant("player6", "Frank", {
        status: "eliminated",
        stack: 0,
        tableId: null,
        finishPosition: 5,
      }),
    ];
    const tables = [
      makeTable("table1", "Table 1", { playerCount: 2, handNumber: 20 }),
      makeTable("table2", "Table 2", { playerCount: 2, handNumber: 15 }),
      makeTable("table3", "Table 3", {
        playerCount: 0,
        handNumber: 7,
        closed: true,
      }),
    ];
    return mttLobbyView({
      tournament: makeBaseTournament({
        status: "running",
        startedAt: BASE_CREATED_AT,
        level: 4,
        timeToNextLevel: 310,
        entrants,
        standings: [...entrants].sort((a, b) => {
          if (a.status === "seated" && b.status !== "seated") return -1;
          if (a.status !== "seated" && b.status === "seated") return 1;
          return 0;
        }),
        tables,
        currentPlayer: {
          isOwner: false,
          status: "seated",
          tableId: "table1",
          seatIndex: 3,
          finishPosition: null,
        },
        actions: { canRegister: false, canUnregister: false, canStart: false },
      }),
    });
  },

  // === FINISHED PHASE ===

  "mtt-lobby-finished": () => {
    const standings = [
      makeEntrant("owner1", "Alice", {
        status: "winner",
        stack: 3000,
        tableId: "table1",
        finishPosition: 1,
        netWinnings: 1000,
      }),
      makeEntrant("player2", "Bob", {
        status: "eliminated",
        stack: 0,
        tableId: null,
        finishPosition: 2,
        netWinnings: -500,
      }),
      makeEntrant("player3", "Charlie", {
        status: "eliminated",
        stack: 0,
        tableId: null,
        finishPosition: 3,
        netWinnings: -500,
      }),
    ];
    const tables = [
      makeTable("table1", "Table 1", {
        playerCount: 0,
        handNumber: 42,
        closed: true,
      }),
    ];
    return mttLobbyView({
      tournament: makeBaseTournament({
        status: "finished",
        startedAt: BASE_CREATED_AT,
        endedAt: "2026-01-15T11:30:00.000Z",
        level: 5,
        timeToNextLevel: 0,
        entrants: standings,
        standings,
        tables,
        currentPlayer: {
          isOwner: false,
          status: "eliminated",
          tableId: "table1",
          seatIndex: null,
          finishPosition: 2,
        },
        actions: { canRegister: false, canUnregister: false, canStart: false },
      }),
    });
  },

  "mtt-lobby-finished-as-winner": () => {
    const standings = [
      makeEntrant("you", "You", {
        status: "winner",
        stack: 1500,
        tableId: "table1",
        finishPosition: 1,
        netWinnings: 500,
      }),
      makeEntrant("player2", "Bob", {
        status: "eliminated",
        stack: 0,
        tableId: null,
        finishPosition: 2,
        netWinnings: -500,
      }),
    ];
    const tables = [
      makeTable("table1", "Table 1", {
        playerCount: 0,
        handNumber: 28,
        closed: true,
      }),
    ];
    return mttLobbyView({
      tournament: makeBaseTournament({
        status: "finished",
        startedAt: BASE_CREATED_AT,
        endedAt: "2026-01-15T11:00:00.000Z",
        level: 4,
        timeToNextLevel: 0,
        buyIn: 500,
        entrants: standings,
        standings,
        tables,
        currentPlayer: {
          isOwner: false,
          status: "winner",
          tableId: "table1",
          seatIndex: null,
          finishPosition: 1,
        },
        actions: { canRegister: false, canUnregister: false, canStart: false },
      }),
    });
  },
};
