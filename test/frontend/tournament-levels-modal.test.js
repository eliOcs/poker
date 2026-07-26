import { fixture, expect, html } from "@open-wc/testing";
import {
  BLIND_LEVELS,
  BREAK_AFTER_LEVELS,
} from "../../src/shared/tournament.js";
import { createMockTournamentGameState } from "./setup.js";
import "../../src/frontend/tournament-levels-panel.js";

describe("tournament levels modal", () => {
  function findButtonByText(root, text) {
    return [...root.querySelectorAll("button")].find((button) =>
      button.textContent.includes(text),
    );
  }

  it("opens from the tournament game info bar", async () => {
    const game = await fixture(html`<phg-game game-id="test123"></phg-game>`);
    game.game = createMockTournamentGameState({
      tournament: {
        level: 3,
        timeToNextLevel: 185,
        onBreak: false,
        pendingBreak: false,
        winner: null,
        buyIn: 500,
      },
    });
    await game.updateComplete;

    const infoBar = game.querySelector("#info-bar");
    expect(infoBar).to.exist;
    expect(infoBar.tagName.toLowerCase()).to.equal("button");
    const infoBarStyle = getComputedStyle(infoBar);
    expect(infoBarStyle.fontSize).to.equal(
      infoBarStyle.getPropertyValue("--font-sm").trim(),
    );

    const timer = game.querySelector(".info-timer");
    expect(timer).to.exist;
    expect(timer.textContent.trim()).to.equal("Level 3: 3:05");

    infoBar.click();
    await game.updateComplete;

    const modal = game.querySelector("phg-modal");
    expect(modal).to.exist;
    expect(modal.querySelector("h3").textContent).to.equal("Tournament Levels");

    const panel = modal.querySelector("phg-tournament-levels-panel");
    expect(panel).to.exist;
    await panel.updateComplete;
    expect(panel.querySelectorAll("tbody tr").length).to.equal(
      BLIND_LEVELS.length + BREAK_AFTER_LEVELS.length,
    );
  });

  it("closes from the tournament levels modal close button", async () => {
    const game = await fixture(html`<phg-game game-id="test123"></phg-game>`);
    game.game = createMockTournamentGameState();
    game.showTournamentLevels = true;
    await game.updateComplete;

    const modal = game.querySelector("phg-modal");
    expect(modal).to.exist;

    modal.querySelector(".modal-close").click();
    await game.updateComplete;

    expect(game.querySelector("phg-modal")).to.not.exist;
  });

  it("opens from the Levels drawer item", async () => {
    const game = await fixture(html`<phg-game game-id="test123"></phg-game>`);
    game.game = createMockTournamentGameState();
    await game.updateComplete;

    const entries = game.querySelectorAll("a, button");
    const historyIndex = [...entries].findIndex((entry) =>
      entry.textContent.includes("History"),
    );
    const levelsButton = findButtonByText(game, "Levels");

    expect(levelsButton).to.exist;
    expect([...entries].indexOf(levelsButton)).to.equal(historyIndex + 1);

    levelsButton.click();
    await game.updateComplete;

    const modal = game.querySelector("phg-modal");
    expect(modal).to.exist;
    expect(modal.querySelector("h3").textContent).to.equal("Tournament Levels");
  });

  it("opens from the Levels drawer item on an MTT table", async () => {
    const game = await fixture(html`<phg-game game-id="table1"></phg-game>`);
    game.gameKind = "mtt";
    game.tournamentId = "mtt123";
    game.game = createMockTournamentGameState();
    game.mttTournament = {
      tables: [
        {
          tableId: "table1",
          tableName: "Table 1",
          closed: false,
        },
      ],
      currentPlayer: { tableId: "table1" },
    };
    await game.updateComplete;

    const levelsButton = findButtonByText(game, "Levels");
    expect(levelsButton).to.exist;

    levelsButton.click();
    await game.updateComplete;

    const modal = game.querySelector("phg-modal");
    expect(modal).to.exist;
    expect(modal.querySelector("h3").textContent).to.equal("Tournament Levels");
  });
});

describe("phg-tournament-levels-panel", () => {
  it("renders level, blinds, and time columns without ante", async () => {
    const panel = await fixture(html`
      <phg-tournament-levels-panel
        .tournament=${{ level: 3 }}
      ></phg-tournament-levels-panel>
    `);

    const headers = [...panel.querySelectorAll("th")].map((th) =>
      th.textContent.trim(),
    );
    expect(headers).to.deep.equal(["Level", "Blinds", "Time"]);
    expect(headers).to.not.include("Ante");
    expect(
      panel.querySelector("tbody tr td:last-child").textContent.trim(),
    ).to.equal("20 min");
  });

  it("renders each scheduled break after its configured level", async () => {
    const panel = await fixture(html`
      <phg-tournament-levels-panel
        .tournament=${{ level: 3 }}
      ></phg-tournament-levels-panel>
    `);

    const rows = [...panel.querySelectorAll("tbody tr")].map((row) =>
      [...row.querySelectorAll("td")].map((td) => td.textContent.trim()),
    );
    const breakIndexes = rows.flatMap((cells, index) =>
      cells[0] === "Break" ? [index] : [],
    );

    expect(breakIndexes).to.have.length(BREAK_AFTER_LEVELS.length);
    expect(
      breakIndexes.map((index) => Number(rows[index - 1][0])),
    ).to.deep.equal(BREAK_AFTER_LEVELS);
    for (const index of breakIndexes) {
      expect(rows[index]).to.deep.equal(["Break", "-", "5 min"]);
    }
  });

  it("marks past, current, and next levels", async () => {
    const panel = await fixture(html`
      <phg-tournament-levels-panel
        .tournament=${{ level: 3 }}
      ></phg-tournament-levels-panel>
    `);

    const rows = panel.querySelectorAll("tbody tr");
    expect(rows[0].classList.contains("past")).to.be.true;
    expect(rows[1].classList.contains("past")).to.be.true;
    expect(rows[2].classList.contains("current")).to.be.true;
    expect(rows[3].classList.contains("next")).to.be.true;
  });

  it("marks the break as current while the tournament is on break", async () => {
    const panel = await fixture(html`
      <phg-tournament-levels-panel
        .tournament=${{ level: BREAK_AFTER_LEVELS[1], onBreak: true }}
      ></phg-tournament-levels-panel>
    `);

    const rows = [...panel.querySelectorAll("tbody tr")];
    const levelBeforeBreakIndex = rows.findIndex(
      (row) =>
        row.querySelector("td").textContent.trim() ===
        String(BREAK_AFTER_LEVELS[1]),
    );
    const levelBeforeBreakRow = rows[levelBeforeBreakIndex];
    const breakRow = rows[levelBeforeBreakIndex + 1];
    const levelAfterBreakRow = rows.find(
      (row) =>
        row.querySelector("td").textContent.trim() ===
        String(BREAK_AFTER_LEVELS[1] + 1),
    );

    expect(levelBeforeBreakRow.classList.contains("past")).to.be.true;
    expect(breakRow.classList.contains("current")).to.be.true;
    expect(levelAfterBreakRow.classList.contains("next")).to.be.true;
  });
});
