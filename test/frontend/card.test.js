import { fixture, expect, html } from "@open-wc/testing";
import {
  MockWebSocket,
  createMockGameState,
  createMockGameWithPlayers,
  createMockGameAtFlop,
} from "./setup.js";

describe("phg-card", () => {
  let element;

  beforeEach(async () => {
    element = await fixture(html`<phg-game game-id="test123"></phg-game>`);
  });

  afterEach(() => {
    globalThis.WebSocket = MockWebSocket;
  });

  it("renders visible card with correct rank and suit symbol", async () => {
    element.game = createMockGameAtFlop();
    await element.updateComplete;

    const board = element.shadowRoot.querySelector("phg-board");
    await board.updateComplete;
    const cardElements = board.shadowRoot.querySelectorAll("phg-card");
    expect(cardElements.length).to.be.greaterThan(0);

    const cardTexts = Array.from(cardElements).map((c) => {
      const card = c.shadowRoot.querySelector(".card");
      return card ? card.textContent.trim() : "";
    });
    expect(cardTexts.some((t) => t.includes("♥"))).to.be.true;
    expect(cardTexts.some((t) => t.includes("A"))).to.be.true;
  });

  it("renders hidden card with pattern background", async () => {
    element.game = createMockGameWithPlayers();
    await element.updateComplete;

    const seats = element.shadowRoot.querySelectorAll("phg-seat");
    let foundHidden = false;
    for (const seat of seats) {
      await seat.updateComplete;
      const cardElements = seat.shadowRoot.querySelectorAll("phg-card");
      for (const cardEl of cardElements) {
        const hiddenCard = cardEl.shadowRoot.querySelector(".card.hidden");
        if (hiddenCard) foundHidden = true;
      }
    }
    expect(foundHidden).to.be.true;
  });

  it("uses red color for hearts/diamonds", async () => {
    element.game = createMockGameAtFlop();
    await element.updateComplete;

    const board = element.shadowRoot.querySelector("phg-board");
    await board.updateComplete;
    const cardElements = board.shadowRoot.querySelectorAll("phg-card");

    let foundRed = false;
    for (const cardEl of cardElements) {
      const redCard = cardEl.shadowRoot.querySelector(".card.red");
      if (redCard) foundRed = true;
    }
    expect(foundRed).to.be.true;
  });

  it("uses black color for spades/clubs", async () => {
    element.game = createMockGameAtFlop();
    await element.updateComplete;

    const board = element.shadowRoot.querySelector("phg-board");
    await board.updateComplete;
    const cardElements = board.shadowRoot.querySelectorAll("phg-card");

    let foundBlack = false;
    for (const cardEl of cardElements) {
      const blackCard = cardEl.shadowRoot.querySelector(".card.black");
      if (blackCard) foundBlack = true;
    }
    expect(foundBlack).to.be.true;
  });

  it("handles all ranks (A, 2-10, J, Q, K)", async () => {
    const gameWithRanks = createMockGameState({
      board: {
        cards: [
          { rank: "ace", suit: "spades" },
          { rank: "2", suit: "hearts" },
          { rank: "10", suit: "diamonds" },
          { rank: "jack", suit: "clubs" },
          { rank: "king", suit: "spades" },
        ],
      },
      hand: { phase: "river", pot: 100, currentBet: 0, actingSeat: -1 },
    });
    element.game = gameWithRanks;
    await element.updateComplete;

    const board = element.shadowRoot.querySelector("phg-board");
    await board.updateComplete;
    const cardElements = board.shadowRoot.querySelectorAll("phg-card");

    const cardTexts = Array.from(cardElements).map((c) => {
      const card = c.shadowRoot.querySelector(".card");
      return card ? card.textContent.trim() : "";
    });
    expect(cardTexts.some((t) => t.includes("A"))).to.be.true;
    expect(cardTexts.some((t) => t.includes("2"))).to.be.true;
    expect(cardTexts.some((t) => t.includes("10"))).to.be.true;
    expect(cardTexts.some((t) => t.includes("J"))).to.be.true;
    expect(cardTexts.some((t) => t.includes("K"))).to.be.true;
  });
});
