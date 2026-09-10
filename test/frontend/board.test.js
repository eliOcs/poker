import { fixture, expect, html } from "@open-wc/testing";
import {
  MockWebSocket,
  createMockGameState,
  createMockGameAtFlop,
  createMockGameWithWinner,
} from "./setup.js";

describe("phg-board", () => {
  let element;

  beforeEach(async () => {
    element = await fixture(html`<phg-game game-id="test123"></phg-game>`);
  });

  afterEach(() => {
    globalThis.WebSocket = MockWebSocket;
  });

  it('shows "WAITING" phase when waiting', async () => {
    element.game = createMockGameState();
    await element.updateComplete;

    const board = element.querySelector("phg-board");
    await board.updateComplete;
    const phase = board.querySelector(".phase");
    expect(phase.textContent.toLowerCase()).to.include("waiting");
  });

  it("shows phase indicator during hand", async () => {
    element.game = createMockGameAtFlop();
    await element.updateComplete;

    const board = element.querySelector("phg-board");
    await board.updateComplete;
    const phase = board.querySelector(".phase");
    expect(phase.textContent.toLowerCase()).to.include("flop");
  });

  it("displays community cards when present", async () => {
    element.game = createMockGameAtFlop();
    await element.updateComplete;

    const board = element.querySelector("phg-board");
    await board.updateComplete;
    const cardElements = board.querySelectorAll("phg-card");
    expect(cardElements.length).to.equal(3);
    expect([...cardElements].every((card) => card.size === "large")).to.be.true;
  });

  it("shows no cards when board is empty", async () => {
    element.game = createMockGameState();
    await element.updateComplete;

    const board = element.querySelector("phg-board");
    await board.updateComplete;
    const cardElements = board.querySelectorAll("phg-card");
    expect(cardElements.length).to.equal(0);
  });

  it("shows pot amount", async () => {
    element.game = createMockGameAtFlop();
    await element.updateComplete;

    const board = element.querySelector("phg-board");
    await board.updateComplete;
    const pot = board.querySelector(".pot");
    expect(pot.textContent.trim()).to.equal("$200");
  });

  it("displays incoming chips only during collection without changing the hand amounts", async () => {
    const game = createMockGameAtFlop();
    game.hand.totalPot = 30000;
    game.seats[0].bet = 5000;
    game.seats[1].bet = 5000;
    element.game = game;
    await element.updateComplete;
    const board = element.querySelector("phg-board");
    await board.updateComplete;
    expect(board.querySelector(".pot").textContent.trim()).to.equal("$200");

    element.game = {
      ...game,
      hand: { ...game.hand, collectingBets: true },
    };
    await element.updateComplete;
    await board.updateComplete;
    expect(board.querySelector(".pot").textContent.trim()).to.equal("$300");
    expect(element.game.hand.collectedPot).to.equal(20000);
    expect(element.game.hand.totalPot).to.equal(30000);

    element.game = {
      ...game,
      hand: { ...game.hand, collectedPot: 30000, collectingBets: false },
      seats: game.seats.map((seat) => ({ ...seat, bet: 0 })),
    };
    await element.updateComplete;
    await board.updateComplete;
    expect(board.querySelector(".pot").textContent.trim()).to.equal("$300");
  });

  it("hides pot amount when pot is 0", async () => {
    element.game = createMockGameState({
      hand: {
        phase: "preflop",
        collectedPot: 0,
        currentBet: 5000,
        actingSeat: 0,
      },
    });
    await element.updateComplete;

    const board = element.querySelector("phg-board");
    await board.updateComplete;
    const pot = board.querySelector(".pot");
    expect(pot).to.be.null;
  });

  describe("winner message", () => {
    it("displays winner name when winnerMessage is set", async () => {
      element.game = createMockGameWithWinner({
        playerName: "player1",
        handRank: "Full House, Kings over 5s",
        amount: 20000, // $200 in cents
      });
      await element.updateComplete;

      const board = element.querySelector("phg-board");
      await board.updateComplete;
      const winnerName = board.querySelector(".winner-name");
      expect(winnerName).to.exist;
      expect(winnerName.textContent).to.include("player1");
      expect(winnerName.textContent).to.include("wins");
    });

    it("displays hand rank when winner has one", async () => {
      element.game = createMockGameWithWinner({
        playerName: "player1",
        handRank: "Straight Flush, K high",
        amount: 15000, // $150 in cents
      });
      await element.updateComplete;

      const board = element.querySelector("phg-board");
      await board.updateComplete;
      const winnerHand = board.querySelector(".winner-hand");
      expect(winnerHand).to.exist;
      expect(winnerHand.textContent).to.include("Straight Flush");
    });

    it("displays amount won", async () => {
      element.game = createMockGameWithWinner({
        playerName: "player1",
        handRank: "Pair of Aces",
        amount: 30000, // $300 in cents
      });
      await element.updateComplete;

      const board = element.querySelector("phg-board");
      await board.updateComplete;
      const winnerAmount = board.querySelector(".winner-amount");
      expect(winnerAmount).to.exist;
      expect(winnerAmount.textContent).to.include("$300");
    });

    it("does not display hand rank when won by fold", async () => {
      element.game = createMockGameWithWinner({
        playerName: "player1",
        handRank: null,
        amount: 10000, // $100 in cents
      });
      await element.updateComplete;

      const board = element.querySelector("phg-board");
      await board.updateComplete;
      const winnerHand = board.querySelector(".winner-hand");
      expect(winnerHand).to.not.exist;
    });

    it("shows community cards along with winner message", async () => {
      element.game = createMockGameWithWinner({
        playerName: "player1",
        handRank: "Royal Flush",
        amount: 50000, // $500 in cents
      });
      await element.updateComplete;

      const board = element.querySelector("phg-board");
      await board.updateComplete;
      const cardElements = board.querySelectorAll("phg-card");
      expect(cardElements.length).to.equal(5);
    });
  });
});
