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

  it("opens the hand rankings when the current hand rank is clicked", async () => {
    const game = createMockGameAtFlop();
    game.seats[0].handRank = "Pair of Aces";
    game.seats[0].handName = "pair";
    element.game = game;
    await element.updateComplete;

    const board = element.querySelector("phg-board");
    await board.updateComplete;
    expect(element.querySelector("phg-modal")).to.not.exist;

    board.querySelector(".current-hand-rank").click();
    await element.updateComplete;

    const modal = element.querySelector("phg-modal");
    await modal.updateComplete;
    expect(modal.querySelector("h3").textContent).to.equal("Hand Rankings");
    const hands = [...modal.querySelectorAll("li .hand-name")].map(
      (name) => name.textContent,
    );
    expect(hands).to.have.length(10);
    expect(hands[0]).to.equal("Royal Flush");
    expect(hands.at(-1)).to.equal("High Card");
    expect(modal.querySelector("li.current .hand-name").textContent).to.equal(
      "Pair",
    );

    modal.querySelector(".modal-close").click();
    await element.updateComplete;
    expect(element.querySelector("phg-modal")).to.not.exist;
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

    it("keeps the same community card elements so they do not replay the deal animation", async () => {
      const board = await fixture(
        html`<phg-board
          .board=${{ cards: ["3s", "5s", "Qc", "Ah", "Td"] }}
          .hand=${{ phase: "river" }}
        ></phg-board>`,
      );
      const cardsBefore = [...board.querySelectorAll("phg-card")];

      board.winnerMessage = {
        playerName: "Bot 1",
        handRank: "Pair of 5s",
        amount: 100,
      };
      board.winningCards = ["5s"];
      await board.updateComplete;

      const cardsAfter = [...board.querySelectorAll("phg-card")];
      expect(cardsAfter.every((card, i) => card === cardsBefore[i])).to.be.true;
    });
  });
});
