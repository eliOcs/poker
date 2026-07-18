import { fixture, expect, html } from "@open-wc/testing";
import {
  BLIND_LEVELS,
  BREAK_AFTER_LEVEL,
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

    const timer = game.querySelector(".info-timer");
    expect(timer).to.exist;
    expect(timer.textContent.trim()).to.equal("Level 3: 3:05");

    infoBar.click();
    await game.updateComplete;

    const modal = game.querySelector("phg-modal");
    expect(modal).to.exist;
    expect(modal.shadowRoot.querySelector("h3").textContent).to.equal(
      "Tournament Levels",
    );

    const panel = modal.querySelector("phg-tournament-levels-panel");
    expect(panel).to.exist;
    await panel.updateComplete;
    expect(panel.querySelectorAll("tbody tr").length).to.equal(
      BLIND_LEVELS.length + 1,
    );
  });

  it("closes from the tournament levels modal close button", async () => {
    const game = await fixture(html`<phg-game game-id="test123"></phg-game>`);
    game.game = createMockTournamentGameState();
    game.showTournamentLevels = true;
    await game.updateComplete;

    const modal = game.querySelector("phg-modal");
    expect(modal).to.exist;

    modal.shadowRoot.querySelector(".close-btn").click();
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
    expect(modal.shadowRoot.querySelector("h3").textContent).to.equal(
      "Tournament Levels",
    );
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
    expect(modal.shadowRoot.querySelector("h3").textContent).to.equal(
      "Tournament Levels",
    );
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
  });

  it("renders the scheduled break after the configured level", async () => {
    const panel = await fixture(html`
      <phg-tournament-levels-panel
        .tournament=${{ level: 3 }}
      ></phg-tournament-levels-panel>
    `);

    const rows = [...panel.querySelectorAll("tbody tr")].map((row) =>
      [...row.querySelectorAll("td")].map((td) => td.textContent.trim()),
    );
    const breakIndex = rows.findIndex((cells) => cells[0] === "Break");

    expect(breakIndex).to.be.greaterThan(0);
    expect(rows[breakIndex - 1][0]).to.equal(String(BREAK_AFTER_LEVEL));
    expect(rows[breakIndex]).to.deep.equal(["Break", "-", "5 min"]);
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
        .tournament=${{ level: BREAK_AFTER_LEVEL, onBreak: true }}
      ></phg-tournament-levels-panel>
    `);

    const rows = [...panel.querySelectorAll("tbody tr")];
    const breakRow = rows.find((row) =>
      row.querySelector("td").textContent.includes("Break"),
    );
    const levelBeforeBreakRow = rows.find(
      (row) =>
        row.querySelector("td").textContent.trim() ===
        String(BREAK_AFTER_LEVEL),
    );
    const levelAfterBreakRow = rows.find(
      (row) =>
        row.querySelector("td").textContent.trim() ===
        String(BREAK_AFTER_LEVEL + 1),
    );

    expect(levelBeforeBreakRow.classList.contains("past")).to.be.true;
    expect(breakRow.classList.contains("current")).to.be.true;
    expect(levelAfterBreakRow.classList.contains("next")).to.be.true;
  });
});
