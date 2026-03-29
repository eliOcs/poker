import { fixture, expect, html, oneEvent } from "@open-wc/testing";
import "../../src/frontend/mtt-lobby.js";

function createTournamentView() {
  return {
    id: "mtt123",
    status: "running",
    ownerId: "owner",
    buyIn: 500,
    tableSize: 6,
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
    },
  };
}

describe("phg-mtt-lobby", () => {
  it("renders tournament details and current table assignment", async () => {
    const element = await fixture(html`
      <phg-mtt-lobby
        tournament-id="mtt123"
        .tournament=${createTournamentView()}
      ></phg-mtt-lobby>
    `);

    expect(element.shadowRoot.textContent).to.include("Tournament #mtt123");
    expect(element.shadowRoot.textContent).to.include("Current Table");
    expect(element.shadowRoot.textContent).to.include("Table 1");
    expect(element.shadowRoot.textContent).to.include("Standings");
    expect(element.shadowRoot.textContent).to.include("Lobby");
    expect(element.shadowRoot.textContent).to.include("Open My Table");
  });

  it("dispatches navigation when opening a table", async () => {
    const element = await fixture(html`
      <phg-mtt-lobby
        tournament-id="mtt123"
        .tournament=${createTournamentView()}
      ></phg-mtt-lobby>
    `);

    setTimeout(() => {
      element.shadowRoot.querySelector(".assignment phg-button").click();
    });

    const event = await oneEvent(element, "navigate");
    expect(event.detail).to.deep.equal({
      path: "/mtt/mtt123/tables/table1",
    });
  });

  it("dispatches MTT actions from lobby controls", async () => {
    const view = createTournamentView();
    view.status = "registration";
    view.currentPlayer = {
      isOwner: true,
      status: "registered",
      tableId: null,
      seatIndex: null,
    };
    view.actions = {
      canRegister: false,
      canUnregister: true,
      canStart: true,
    };

    const element = await fixture(html`
      <phg-mtt-lobby tournament-id="mtt123" .tournament=${view}></phg-mtt-lobby>
    `);

    const buttons = element.shadowRoot.querySelectorAll(
      ".action-row phg-button",
    );
    setTimeout(() => {
      buttons[0].click();
    });

    const event = await oneEvent(element, "mtt-action");
    expect(event.detail).to.deep.equal({ action: "unregister" });
  });
});
