export function createTournamentView() {
  return {
    id: "mtt123",
    name: "Friday Deepstack",
    status: "running",
    ownerId: "owner",
    owner: { id: "owner", name: "Owner" },
    buyIn: 500,
    prizePool: 500,
    maxRebuys: 1,
    entryPeriodLevels: 4,
    entryPeriodOpen: true,
    tableSize: 6,
    speed: "normal",
    durationMinutes: 260,
    levelDurationTicks: 1200,
    level: 2,
    timeToNextLevel: 90,
    onBreak: false,
    pendingBreak: false,
    createdAt: "2026-03-14T10:00:00.000Z",
    startedAt: "2026-03-14T10:05:00.000Z",
    endedAt: null,
    entrants: [
      {
        playerId: "owner",
        name: "Owner",
        status: "seated",
        stack: 1500,
        tableId: "table1",
        seatIndex: 0,
        finishPosition: null,
      },
    ],
    standings: [
      {
        playerId: "owner",
        name: "Owner",
        status: "seated",
        stack: 1500,
        tableId: "table1",
        seatIndex: 0,
        finishPosition: null,
      },
    ],
    tables: [
      {
        tableId: "table1",
        tableName: "Table 1",
        playerCount: 6,
        handNumber: 4,
        waiting: false,
        closed: false,
      },
    ],
    currentPlayer: {
      isOwner: true,
      status: "seated",
      tableId: "table1",
      seatIndex: 0,
    },
    actions: {
      canRegister: false,
      canUnregister: false,
      canStart: false,
      canRename: true,
    },
  };
}

export function actionButtonLabels(element) {
  return [...element.querySelectorAll(".action-row button.button")].map(
    (button) => button.textContent.trim(),
  );
}

export function findActionButton(element, label) {
  return [...element.querySelectorAll(".action-row button.button")].find(
    (button) => button.textContent.trim() === label,
  );
}
