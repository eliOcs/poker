import {
  BASE_CREATED_AT,
  makeBaseTournament,
  makeEntrant,
  makeTable,
  mttLobbyView,
} from "./mtt-lobby-fixtures.js";

function makeLateRegistrationTournament({
  queued = false,
  entryPeriodOpen = true,
} = {}) {
  const entrants = [
    makeEntrant("owner1", "Alice", {
      status: "seated",
      stack: 2900,
      tableId: "table1",
      seatIndex: 0,
      netWinnings: -500,
    }),
    makeEntrant("player2", "Bob", {
      status: "seated",
      stack: 2100,
      tableId: "table1",
      seatIndex: 2,
      netWinnings: -500,
    }),
  ];
  if (queued) {
    entrants.push(
      makeEntrant("you", "You", {
        status: "registered",
        stack: 5000,
        netWinnings: -500,
      }),
    );
  }

  return makeBaseTournament({
    status: "running",
    entryPeriodOpen,
    startedAt: BASE_CREATED_AT,
    level: 2,
    timeToNextLevel: 240,
    entrants,
    standings: entrants,
    tables: [makeTable("table1", "Table 1", { playerCount: 2 })],
    currentPlayer: {
      isOwner: false,
      status: queued ? "registered" : "not_registered",
      tableId: null,
      seatIndex: null,
      finishPosition: null,
    },
    actions: {
      canRegister: entryPeriodOpen && !queued,
      canUnregister: false,
      canStart: false,
    },
  });
}

export const LATE_REGISTRATION_MTT_LOBBY_TEST_CASES = {
  "mtt-lobby-running-can-late-register": () =>
    mttLobbyView({ user: null, tournament: makeLateRegistrationTournament() }),

  "mtt-lobby-running-late-register-tooltip": () =>
    mttLobbyView({ user: null, tournament: makeLateRegistrationTournament() }),

  "mtt-lobby-running-registration-closed-guest": () =>
    mttLobbyView({
      user: null,
      tournament: makeLateRegistrationTournament({ entryPeriodOpen: false }),
    }),

  "mtt-lobby-running-waiting-for-table": () =>
    mttLobbyView({
      tournament: makeLateRegistrationTournament({ queued: true }),
    }),
};
