import { aTimeout, fixture, expect, html, oneEvent } from "@open-wc/testing";
import "../../src/frontend/mtt-lobby.js";

function createTournamentView() {
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

    expect(element.querySelector("phg-edit-label").value).to.equal(
      "Friday Deepstack",
    );
    expect(element.textContent).to.include("#mtt123");
    expect(element.textContent).to.include("Open My Table");
    expect(element.textContent).to.include("Table 1");
    expect(element.textContent).to.include("Standings");
    expect(element.textContent).to.include("Lobby");
    const rebuyStat = [...element.querySelectorAll(".stat")].find(
      (stat) =>
        stat.querySelector(".label > span")?.textContent.trim() === "Rebuys",
    );
    expect(rebuyStat.querySelector(".value").textContent.trim()).to.equal("1");
  });

  it("shows late registration with accessible dynamic tooltips", async () => {
    const view = createTournamentView();
    view.currentPlayer = {
      isOwner: false,
      status: "not_registered",
      tableId: null,
      seatIndex: null,
    };
    view.actions.canRegister = true;

    const element = await fixture(html`
      <phg-mtt-lobby tournament-id="mtt123" .tournament=${view}></phg-mtt-lobby>
    `);

    const lateRegister = [
      ...element.querySelectorAll(".action-row button.button"),
    ].find((button) => button.textContent.includes("Late Register"));
    expect(lateRegister).to.exist;
    const tooltipCases = [
      {
        triggerLabel: "Rebuy period details",
        tooltipId: "rebuy-period-tooltip",
        text: "Rebuys are allowed through level 4.",
      },
      {
        triggerLabel: "Late registration details",
        tooltipId: "late-registration-tooltip",
        text: "Late registration is allowed through level 4.",
      },
    ];

    for (const tooltipCase of tooltipCases) {
      const trigger = element.querySelector(
        `[aria-label="${tooltipCase.triggerLabel}"]`,
      );
      const tooltip = element.querySelector(`#${tooltipCase.tooltipId}`);
      expect(trigger.tagName).to.equal("BUTTON");
      expect(trigger.getAttribute("aria-describedby")).to.equal(
        tooltipCase.tooltipId,
      );
      expect(trigger.querySelector("svg")).to.exist;
      expect(trigger.querySelector("path").getAttribute("d")).to.equal(
        "M18 22H6V20H18V22ZM6 20H4V18H6V20ZM20 20H18V18H20V20ZM4 18H2V6H4V18ZM13 18H11V16H13V18ZM22 18H20V6H22V18ZM15 13H13V15H11V11H15V13ZM17 11H15V8H17V11ZM9 10H7V8H9V10ZM15 8H9V6H15V8ZM6 6H4V4H6V6ZM20 6H18V4H20V6ZM18 4H6V2H18V4Z",
      );
      expect(tooltip.getAttribute("role")).to.equal("tooltip");
      expect(tooltip.textContent.replace(/\s+/g, " ").trim()).to.equal(
        tooltipCase.text,
      );
      expect(getComputedStyle(tooltip).visibility).to.equal("hidden");

      trigger.focus();
      expect(document.activeElement).to.equal(trigger);
      expect(trigger.parentElement.matches(":focus-within")).to.equal(true);
      await aTimeout(150);
      expect(getComputedStyle(tooltip).visibility).to.equal("visible");
      trigger.blur();
    }
  });

  it("hides registration actions after the entry period closes", async () => {
    const view = createTournamentView();
    view.entryPeriodOpen = false;
    view.currentPlayer = {
      isOwner: false,
      status: "not_registered",
      tableId: null,
      seatIndex: null,
    };
    view.actions.canRegister = false;

    const element = await fixture(html`
      <phg-mtt-lobby tournament-id="mtt123" .tournament=${view}></phg-mtt-lobby>
    `);

    expect(element.textContent).not.to.include("Late Register");
    expect(element.textContent).not.to.include("Late registration is allowed");
  });

  it("shows a queued running entrant as waiting for a table", async () => {
    const view = createTournamentView();
    const waitingEntrant = {
      playerId: "waiting",
      name: "Waiting Player",
      status: "registered",
      stack: 5000,
      tableId: null,
      seatIndex: null,
      finishPosition: null,
      netWinnings: -500,
    };
    view.entrants.push(waitingEntrant);
    view.standings.push(waitingEntrant);
    view.currentPlayer = {
      isOwner: false,
      status: "registered",
      tableId: null,
      seatIndex: null,
    };

    const element = await fixture(html`
      <phg-mtt-lobby tournament-id="mtt123" .tournament=${view}></phg-mtt-lobby>
    `);

    expect(element.textContent).to.include("Waiting for table");
  });

  it("renders payouts from the backend-provided prize pool", async () => {
    const view = createTournamentView();
    view.entrants = Array.from({ length: 5 }, (_, index) => ({
      playerId: `p${index + 1}`,
    }));
    view.prizePool = 3000;

    const element = await fixture(html`
      <phg-mtt-lobby tournament-id="mtt123" .tournament=${view}></phg-mtt-lobby>
    `);

    expect(element.textContent).to.include("1st: $24, 2nd: $6");
  });

  it("does not show a history drawer item in the lobby", async () => {
    const element = await fixture(html`
      <phg-mtt-lobby
        tournament-id="mtt123"
        .tournament=${createTournamentView()}
      ></phg-mtt-lobby>
    `);

    const drawerItems = Array.from(
      element.querySelectorAll("phg-navigation-drawer .drawer-main > *"),
    );
    expect(
      drawerItems.some((item) => item.textContent.includes("History")),
    ).to.equal(false);
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

    expect(element.textContent).to.include("#mp9hladed7d1");
  });

  it("shows the owner name in the lobby header when available", async () => {
    const element = await fixture(html`
      <phg-mtt-lobby
        tournament-id="mtt123"
        .tournament=${createTournamentView()}
      ></phg-mtt-lobby>
    `);

    expect(element.textContent).to.include("Owner: Owner");
    expect(element.textContent).not.to.include("Owner: owner");
  });

  it("prefixes the owner id in the lobby header when no name is available", async () => {
    const view = createTournamentView();
    view.ownerId = "mp9hladed7d1";
    view.owner = { id: "mp9hladed7d1", name: undefined };
    view.entrants = [
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

    expect(element.textContent).to.include("Owner: #mp9hladed7d1");
  });

  it("uses the backend-provided owner name when available", async () => {
    const view = createTournamentView();
    view.ownerId = "mp9hladed7d1";
    view.owner = { id: "mp9hladed7d1", name: "Mika" };
    view.entrants = [
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
      <phg-mtt-lobby
        tournament-id="mtt123"
        .tournament=${view}
        .user=${{ id: "someone-else", name: "Current User" }}
      ></phg-mtt-lobby>
    `);

    expect(element.textContent).to.include("Owner: Mika");
  });

  it("links players in the MTT player table to their profile", async () => {
    const element = await fixture(html`
      <phg-mtt-lobby
        tournament-id="mtt123"
        .tournament=${createTournamentView()}
      ></phg-mtt-lobby>
    `);

    const playerLink = element.querySelector(".player-link");
    expect(playerLink.getAttribute("href")).to.equal("/players/owner");
  });

  it("dispatches navigation when opening a table", async () => {
    const element = await fixture(html`
      <phg-mtt-lobby
        tournament-id="mtt123"
        .tournament=${createTournamentView()}
      ></phg-mtt-lobby>
    `);

    setTimeout(() => {
      const buttons = Array.from(element.querySelectorAll("button.button"));
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

    const buttons = element.querySelectorAll(".action-row button.button");
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
      element.querySelector(".action-row button.button").click();
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
      element.querySelector(".action-row button.button").click();
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
      element.querySelector("phg-edit-label").dispatchEvent(
        new CustomEvent("value-changed", {
          detail: { value: "Saturday Major" },
          bubbles: true,
        }),
      );
    });

    const event = await oneEvent(element, "mtt-rename");
    expect(event.detail).to.deep.equal({ name: "Saturday Major" });
  });
});
