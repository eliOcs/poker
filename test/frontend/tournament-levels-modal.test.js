import { fixture, expect, html } from "@open-wc/testing";
import { BLIND_LEVELS } from "../../src/shared/tournament.js";
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

    const infoBar = game.shadowRoot.querySelector("#info-bar");
    expect(infoBar).to.exist;
    expect(infoBar.getAttribute("role")).to.equal("button");

    const timer = game.shadowRoot.querySelector(".info-timer");
    expect(timer).to.exist;
    expect(timer.textContent.trim()).to.equal("Level 3: 3:05");

    infoBar.click();
    await game.updateComplete;

    const modal = game.shadowRoot.querySelector("phg-modal");
    expect(modal).to.exist;
    expect(modal.shadowRoot.querySelector("h3").textContent).to.equal(
      "Tournament Levels",
    );

    const panel = modal.querySelector("phg-tournament-levels-panel");
    expect(panel).to.exist;
    await panel.updateComplete;
    expect(panel.shadowRoot.querySelectorAll("tbody tr").length).to.equal(
      BLIND_LEVELS.length,
    );
  });

  it("closes from the tournament levels modal close button", async () => {
    const game = await fixture(html`<phg-game game-id="test123"></phg-game>`);
    game.game = createMockTournamentGameState();
    game.showTournamentLevels = true;
    await game.updateComplete;

    const modal = game.shadowRoot.querySelector("phg-modal");
    expect(modal).to.exist;

    modal.shadowRoot.querySelector(".close-btn").click();
    await game.updateComplete;

    expect(game.shadowRoot.querySelector("phg-modal")).to.not.exist;
  });

  it("opens from the Levels drawer item", async () => {
    const game = await fixture(html`<phg-game game-id="test123"></phg-game>`);
    game.game = createMockTournamentGameState();
    await game.updateComplete;

    const buttons = game.shadowRoot.querySelectorAll("button");
    const historyIndex = [...buttons].findIndex((button) =>
      button.textContent.includes("History"),
    );
    const levelsButton = findButtonByText(game.shadowRoot, "Levels");

    expect(levelsButton).to.exist;
    expect([...buttons].indexOf(levelsButton)).to.equal(historyIndex + 1);

    levelsButton.click();
    await game.updateComplete;

    const modal = game.shadowRoot.querySelector("phg-modal");
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

    const levelsButton = findButtonByText(game.shadowRoot, "Levels");
    expect(levelsButton).to.exist;

    levelsButton.click();
    await game.updateComplete;

    const modal = game.shadowRoot.querySelector("phg-modal");
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

    const headers = [...panel.shadowRoot.querySelectorAll("th")].map((th) =>
      th.textContent.trim(),
    );
    expect(headers).to.deep.equal(["Level", "Blinds", "Time"]);
    expect(headers).to.not.include("Ante");
  });

  it("marks past, current, and next levels", async () => {
    const panel = await fixture(html`
      <phg-tournament-levels-panel
        .tournament=${{ level: 3 }}
      ></phg-tournament-levels-panel>
    `);

    const rows = panel.shadowRoot.querySelectorAll("tbody tr");
    expect(rows[0].classList.contains("past")).to.be.true;
    expect(rows[1].classList.contains("past")).to.be.true;
    expect(rows[2].classList.contains("current")).to.be.true;
    expect(rows[3].classList.contains("next")).to.be.true;
  });
});
