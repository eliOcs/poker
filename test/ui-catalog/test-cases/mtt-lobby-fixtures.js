import { renderShellPageView } from "/src/frontend/app-render.js";

export const BASE_CREATED_AT = "2026-01-15T10:00:00.000Z";

export function mttLobbyView({
  tournament = null,
  loading = false,
  error = "",
} = {}) {
  return renderShellPageView(
    {
      path: "/mtt/t1abc123",
      user: null,
      _mttTournamentId: "t1abc123",
      _mttView: tournament,
      _mttLoading: loading,
      _mttError: error,
      _mttActionPending: false,
    },
    "mtt_lobby",
  );
}

export function makeEntrant(playerId, name, overrides = {}) {
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

export function makeTable(tableId, tableName, overrides = {}) {
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

export function makeBaseTournament(overrides = {}) {
  const tournament = {
    id: "t1abc123",
    name: "Multi-Table Tournament",
    status: "registration",
    ownerId: "owner1",
    buyIn: 500,
    maxRebuys: 1,
    entryPeriodLevels: 4,
    entryPeriodOpen: false,
    tableSize: 6,
    speed: "normal",
    durationMinutes: 260,
    levelDurationTicks: 1200,
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
      canRename: false,
    },
    ...overrides,
  };

  return {
    ...tournament,
    prizePool:
      overrides.prizePool ?? tournament.entrants.length * tournament.buyIn,
  };
}
