import { fixture, expect, html, oneEvent } from "@open-wc/testing";
import "../../src/frontend/mtt-lobby.js";

function createTournamentView() {
  return {
    id: "mtt123",
    name: "Friday Deepstack",
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
      canRename: true,
    },
  };
}

describe("phg-mtt-lobby", () => {
  const originalLocation = window.location.href;

  afterEach(() => {
    history.replaceState({}, "", originalLocation);
  });

  it("renders tournament details and current table assignment", async () => {
    const element = await fixture(html`
      <phg-mtt-lobby
        tournament-id="mtt123"
        .tournament=${createTournamentView()}
      ></phg-mtt-lobby>
    `);

    expect(element.shadowRoot.querySelector("phg-edit-label").value).to.equal(
      "Friday Deepstack",
    );
    expect(element.shadowRoot.textContent).to.include("#mtt123");
    expect(element.shadowRoot.textContent).to.include("Open My Table");
    expect(element.shadowRoot.textContent).to.include("Table 1");
    expect(element.shadowRoot.textContent).to.include("Standings");
    expect(element.shadowRoot.textContent).to.include("Lobby");
  });

  it("prefixes fallback player ids with #", async () => {
    const view = createTournamentView();
    view.standings = [
      {
        playerId: "mp9hladed7d1",
        name: "mp9hladed7d1",
        status: "seated",
        stack: 1500,
        tableId: "table1",
        seatIndex: 0,
        finishPosition: null,
      },
    ];

    const element = await fixture(html`
      <phg-mtt-lobby tournament-id="mtt123" .tournament=${view}></phg-mtt-lobby>
    `);

    expect(element.shadowRoot.textContent).to.include("#mp9hladed7d1");
  });

  it("links players in the MTT player table to their profile", async () => {
    const element = await fixture(html`
      <phg-mtt-lobby
        tournament-id="mtt123"
        .tournament=${createTournamentView()}
      ></phg-mtt-lobby>
    `);

    const playerLink = element.shadowRoot.querySelector(".player-link");
    expect(playerLink.getAttribute("href")).to.equal("/players/owner");

    setTimeout(() => {
      playerLink.click();
    });

    const event = await oneEvent(element, "navigate");
    expect(event.detail).to.deep.equal({ path: "/players/owner" });
  });

  it("dispatches navigation when opening a table", async () => {
    const element = await fixture(html`
      <phg-mtt-lobby
        tournament-id="mtt123"
        .tournament=${createTournamentView()}
      ></phg-mtt-lobby>
    `);

    setTimeout(() => {
      const buttons = Array.from(
        element.shadowRoot.querySelectorAll("phg-button"),
      );
      const openButton = buttons.find((b) =>
        b.textContent.includes("Open My Table"),
      );
      openButton.click();
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
      canRename: true,
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

  it("opens sign-up instead of registering when the user has no email", async () => {
    const view = createTournamentView();
    view.status = "registration";
    view.currentPlayer = {
      isOwner: false,
      status: "not_registered",
      tableId: null,
      seatIndex: null,
    };
    view.actions = {
      canRegister: true,
      canUnregister: false,
      canStart: false,
      canRename: false,
    };

    const element = await fixture(html`
      <phg-mtt-lobby
        tournament-id="mtt123"
        .tournament=${view}
        .user=${{ name: "Guest" }}
      ></phg-mtt-lobby>
    `);

    setTimeout(() => {
      element.shadowRoot.querySelector(".action-row phg-button").click();
    });

    const event = await oneEvent(element, "open-sign-up");
    expect(event).to.exist;
    expect(window.location.pathname).to.equal("/mtt/mtt123");
    expect(window.location.search).to.equal("?action=register");
  });

  it("allows signed-up users to register from the lobby controls", async () => {
    const view = createTournamentView();
    view.status = "registration";
    view.currentPlayer = {
      isOwner: false,
      status: "not_registered",
      tableId: null,
      seatIndex: null,
    };
    view.actions = {
      canRegister: true,
      canUnregister: false,
      canStart: false,
      canRename: false,
    };

    const element = await fixture(html`
      <phg-mtt-lobby
        tournament-id="mtt123"
        .tournament=${view}
        .user=${{ email: "player@example.com" }}
      ></phg-mtt-lobby>
    `);

    setTimeout(() => {
      element.shadowRoot.querySelector(".action-row phg-button").click();
    });

    const event = await oneEvent(element, "mtt-action");
    expect(event.detail).to.deep.equal({ action: "register" });
  });

  it("dispatches rename requests from the editable title", async () => {
    const element = await fixture(html`
      <phg-mtt-lobby
        tournament-id="mtt123"
        .tournament=${createTournamentView()}
      ></phg-mtt-lobby>
    `);

    setTimeout(() => {
      element.shadowRoot.querySelector("phg-edit-label").dispatchEvent(
        new CustomEvent("value-changed", {
          detail: { value: "Saturday Major" },
          bubbles: true,
          composed: true,
        }),
      );
    });

    const event = await oneEvent(element, "mtt-rename");
    expect(event.detail).to.deep.equal({ name: "Saturday Major" });
  });
});
