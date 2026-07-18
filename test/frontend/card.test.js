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

    const board = element.querySelector("phg-board");
    await board.updateComplete;
    const cardElements = board.querySelectorAll("phg-card");
    expect(cardElements.length).to.be.greaterThan(0);

    const cardTexts = Array.from(cardElements).map((c) => {
      const card = c.querySelector(".card.front");
      return card ? card.textContent.trim() : "";
    });
    expect(cardTexts.some((t) => t.includes("♥"))).to.be.true;
    expect(cardTexts.some((t) => t.includes("A"))).to.be.true;
  });

  it("renders hidden card with pattern background", async () => {
    element.game = createMockGameWithPlayers();
    await element.updateComplete;

    const seats = element.querySelectorAll("phg-seat");
    let foundHidden = false;
    for (const seat of seats) {
      await seat.updateComplete;
      const cardElements = seat.querySelectorAll("phg-card");
      for (const cardEl of cardElements) {
        const hiddenCard = cardEl.querySelector(".card.back");
        if (hiddenCard) foundHidden = true;
      }
    }
    expect(foundHidden).to.be.true;
  });

  it("uses red color for hearts/diamonds", async () => {
    element.game = createMockGameAtFlop();
    await element.updateComplete;

    const board = element.querySelector("phg-board");
    await board.updateComplete;
    const cardElements = board.querySelectorAll("phg-card");

    let foundRed = false;
    for (const cardEl of cardElements) {
      const redCard = cardEl.querySelector(".card.red");
      if (redCard) foundRed = true;
    }
    expect(foundRed).to.be.true;
  });

  it("uses black color for spades/clubs", async () => {
    element.game = createMockGameAtFlop();
    await element.updateComplete;

    const board = element.querySelector("phg-board");
    await board.updateComplete;
    const cardElements = board.querySelectorAll("phg-card");

    let foundBlack = false;
    for (const cardEl of cardElements) {
      const blackCard = cardEl.querySelector(".card.black");
      if (blackCard) foundBlack = true;
    }
    expect(foundBlack).to.be.true;
  });

  it("handles all ranks (A, 2-10, J, Q, K)", async () => {
    const gameWithRanks = createMockGameState({
      board: {
        cards: ["As", "2h", "Td", "Jc", "Ks"],
      },
      hand: { phase: "river", pot: 100, currentBet: 0, actingSeat: -1 },
    });
    element.game = gameWithRanks;
    await element.updateComplete;

    const board = element.querySelector("phg-board");
    await board.updateComplete;
    const cardElements = board.querySelectorAll("phg-card");

    const cardTexts = Array.from(cardElements).map((c) => {
      const card = c.querySelector(".card.front");
      return card ? card.textContent.trim() : "";
    });
    expect(cardTexts.some((t) => t.includes("A"))).to.be.true;
    expect(cardTexts.some((t) => t.includes("2"))).to.be.true;
    expect(cardTexts.some((t) => t.includes("10"))).to.be.true;
    expect(cardTexts.some((t) => t.includes("J"))).to.be.true;
    expect(cardTexts.some((t) => t.includes("K"))).to.be.true;
  });

  it("applies winning class when winning prop is true", async () => {
    const winningCards = ["As", "Ah", "Ac", "Kd", "Qc"];
    const gameWithWinner = createMockGameState({
      hand: { phase: "showdown", pot: 0, currentBet: 0, actingSeat: -1 },
      board: {
        cards: ["Ac", "Kd", "Qc", "Js", "Th"],
      },
      winnerMessage: {
        playerName: "Player 1",
        handRank: "Three of a Kind",
        amount: 100,
      },
      seats: [
        {
          empty: false,
          player: { id: "test-player-123", name: null },
          stack: 1100,
          bet: 0,
          folded: false,
          allIn: false,
          sittingOut: false,
          disconnected: false,
          cards: ["As", "Ah"],
          actions: [],
          isCurrentPlayer: true,
          isActing: false,
          lastAction: null,
          handResult: 100,
          handRank: "Three of a Kind, Aces",
          winningCards,
        },
        { empty: true, actions: [] },
        { empty: true, actions: [] },
        { empty: true, actions: [] },
        { empty: true, actions: [] },
        { empty: true, actions: [] },
      ],
    });
    element.game = gameWithWinner;
    await element.updateComplete;

    const seats = element.querySelectorAll("phg-seat");
    const playerSeat = seats[0];
    await playerSeat.updateComplete;

    const cardElements = playerSeat.querySelectorAll("phg-card");
    let foundWinning = false;
    for (const cardEl of cardElements) {
      await cardEl.updateComplete;
      const winningCard = cardEl.querySelector(".card.winning");
      if (winningCard) foundWinning = true;
    }
    expect(foundWinning).to.be.true;
  });

  it("does not apply winning class when winning prop is false", async () => {
    element.game = createMockGameAtFlop();
    await element.updateComplete;

    const board = element.querySelector("phg-board");
    await board.updateComplete;
    const cardElements = board.querySelectorAll("phg-card");

    let foundWinning = false;
    for (const cardEl of cardElements) {
      const winningCard = cardEl.querySelector(".card.winning");
      if (winningCard) foundWinning = true;
    }
    expect(foundWinning).to.be.false;
  });
});
