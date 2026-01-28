import { fixture, expect, html } from "@open-wc/testing";
import "../../src/frontend/ranking-panel.js";

describe("phg-ranking-panel", () => {
  const mockRankings = [
    {
      seatIndex: 0,
      playerId: "p1",
      playerName: "Alice",
      stack: 1200,
      totalBuyIn: 1000,
      netWinnings: 200,
      handsPlayed: 50,
      winRate: 8.0,
    },
    {
      seatIndex: 2,
      playerId: "p2",
      playerName: null,
      stack: 800,
      totalBuyIn: 1000,
      netWinnings: -200,
      handsPlayed: 50,
      winRate: -8.0,
    },
    {
      seatIndex: 4,
      playerId: "p3",
      playerName: "Bob",
      stack: 1000,
      totalBuyIn: 1000,
      netWinnings: 0,
      handsPlayed: 5,
      winRate: null,
    },
  ];

  it("renders ranking table with players", async () => {
    const el = await fixture(html`
      <phg-ranking-panel .rankings=${mockRankings}></phg-ranking-panel>
    `);

    const rows = el.shadowRoot.querySelectorAll("tbody tr");
    expect(rows.length).to.equal(3);
  });

  it("displays player name or seat fallback", async () => {
    const el = await fixture(html`
      <phg-ranking-panel .rankings=${mockRankings}></phg-ranking-panel>
    `);

    const names = el.shadowRoot.querySelectorAll(".player-name");
    expect(names[0].textContent.trim()).to.equal("Alice");
    expect(names[1].textContent.trim()).to.equal("Seat 3"); // seatIndex 2 + 1
  });

  it("shows positive values in green", async () => {
    const el = await fixture(html`
      <phg-ranking-panel .rankings=${mockRankings}></phg-ranking-panel>
    `);

    const firstRow = el.shadowRoot.querySelector("tbody tr");
    const netCell = firstRow.querySelectorAll("td")[2];
    expect(netCell.classList.contains("positive")).to.be.true;
    expect(netCell.textContent).to.include("+$2");
  });

  it("shows negative values in red", async () => {
    const el = await fixture(html`
      <phg-ranking-panel .rankings=${mockRankings}></phg-ranking-panel>
    `);

    const rows = el.shadowRoot.querySelectorAll("tbody tr");
    const netCell = rows[1].querySelectorAll("td")[2];
    expect(netCell.classList.contains("negative")).to.be.true;
    expect(netCell.textContent).to.include("-$2");
  });

  it("shows dash for null winRate", async () => {
    const el = await fixture(html`
      <phg-ranking-panel .rankings=${mockRankings}></phg-ranking-panel>
    `);

    const rows = el.shadowRoot.querySelectorAll("tbody tr");
    const winRateCell = rows[2].querySelectorAll("td")[3];
    expect(winRateCell.textContent.trim()).to.equal("-");
    expect(winRateCell.classList.contains("na")).to.be.true;
  });

  it("renders nothing when rankings is empty", async () => {
    const el = await fixture(html`
      <phg-ranking-panel .rankings=${[]}></phg-ranking-panel>
    `);

    const table = el.shadowRoot.querySelector("table");
    expect(table).to.be.null;
  });

  it("renders nothing when rankings is undefined", async () => {
    const el = await fixture(html` <phg-ranking-panel></phg-ranking-panel> `);

    const table = el.shadowRoot.querySelector("table");
    expect(table).to.be.null;
  });

  it("displays rank numbers correctly", async () => {
    const el = await fixture(html`
      <phg-ranking-panel .rankings=${mockRankings}></phg-ranking-panel>
    `);

    const rows = el.shadowRoot.querySelectorAll("tbody tr");
    expect(rows[0].querySelectorAll("td")[0].textContent.trim()).to.equal("1");
    expect(rows[1].querySelectorAll("td")[0].textContent.trim()).to.equal("2");
    expect(rows[2].querySelectorAll("td")[0].textContent.trim()).to.equal("3");
  });

  it("formats win rate with one decimal place", async () => {
    const el = await fixture(html`
      <phg-ranking-panel .rankings=${mockRankings}></phg-ranking-panel>
    `);

    const firstRow = el.shadowRoot.querySelector("tbody tr");
    const winRateCell = firstRow.querySelectorAll("td")[3];
    expect(winRateCell.textContent.trim()).to.equal("+8.0");
  });

  it("shows zero values as neutral", async () => {
    const el = await fixture(html`
      <phg-ranking-panel .rankings=${mockRankings}></phg-ranking-panel>
    `);

    const rows = el.shadowRoot.querySelectorAll("tbody tr");
    const netCell = rows[2].querySelectorAll("td")[2];
    expect(netCell.classList.contains("neutral")).to.be.true;
    expect(netCell.textContent).to.include("$0");
  });

  it("displays table header with tooltips", async () => {
    const el = await fixture(html`
      <phg-ranking-panel .rankings=${mockRankings}></phg-ranking-panel>
    `);

    const headers = el.shadowRoot.querySelectorAll("th");
    expect(headers[2].textContent).to.include("Net");
    expect(headers[2].textContent).to.include("profit/loss");
    expect(headers[3].textContent).to.include("BB/100");
    expect(headers[3].textContent).to.include("win rate");
  });
});
