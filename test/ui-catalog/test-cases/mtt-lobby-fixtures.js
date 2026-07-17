import { html } from "lit";

export const BASE_CREATED_AT = "2026-01-15T10:00:00.000Z";

export function mttLobbyView({
  tournament = null,
  loading = false,
  error = "",
} = {}) {
  return html`
    <div style="height: 100%; width: 100%;">
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
    status: "registration",
    ownerId: "owner1",
    buyIn: 500,
    maxRebuys: 1,
    entryPeriodLevels: 4,
    entryPeriodOpen: false,
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

  return {
    ...tournament,
    prizePool:
      overrides.prizePool ?? tournament.entrants.length * tournament.buyIn,
  };
}
