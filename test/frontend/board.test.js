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

    const board = element.shadowRoot.querySelector("phg-board");
    await board.updateComplete;
    const phase = board.shadowRoot.querySelector(".phase");
    expect(phase.textContent.toLowerCase()).to.include("waiting");
  });

  it("shows phase indicator during hand", async () => {
    element.game = createMockGameAtFlop();
    await element.updateComplete;

    const board = element.shadowRoot.querySelector("phg-board");
    await board.updateComplete;
    const phase = board.shadowRoot.querySelector(".phase");
    expect(phase.textContent.toLowerCase()).to.include("flop");
  });

  it("displays community cards when present", async () => {
    element.game = createMockGameAtFlop();
    await element.updateComplete;

    const board = element.shadowRoot.querySelector("phg-board");
    await board.updateComplete;
    const cardElements = board.shadowRoot.querySelectorAll("phg-card");
    expect(cardElements.length).to.equal(3);
  });

  it("shows no cards when board is empty", async () => {
    element.game = createMockGameState();
    await element.updateComplete;

    const board = element.shadowRoot.querySelector("phg-board");
    await board.updateComplete;
    const cardElements = board.shadowRoot.querySelectorAll("phg-card");
    expect(cardElements.length).to.equal(0);
  });

  it("shows pot amount", async () => {
    element.game = createMockGameAtFlop();
    await element.updateComplete;

    const board = element.shadowRoot.querySelector("phg-board");
    await board.updateComplete;
    const pot = board.shadowRoot.querySelector(".pot");
    expect(pot.textContent).to.include("200");
  });

  describe("winner message", () => {
    it("displays winner name when winnerMessage is set", async () => {
      element.game = createMockGameWithWinner({
        playerName: "player1",
        handRank: "Full House, Kings over 5s",
        amount: 20000, // $200 in cents
      });
      await element.updateComplete;

      const board = element.shadowRoot.querySelector("phg-board");
      await board.updateComplete;
      const winnerName = board.shadowRoot.querySelector(".winner-name");
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

      const board = element.shadowRoot.querySelector("phg-board");
      await board.updateComplete;
      const winnerHand = board.shadowRoot.querySelector(".winner-hand");
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

      const board = element.shadowRoot.querySelector("phg-board");
      await board.updateComplete;
      const winnerAmount = board.shadowRoot.querySelector(".winner-amount");
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

      const board = element.shadowRoot.querySelector("phg-board");
      await board.updateComplete;
      const winnerHand = board.shadowRoot.querySelector(".winner-hand");
      expect(winnerHand).to.not.exist;
    });

    it("shows community cards along with winner message", async () => {
      element.game = createMockGameWithWinner({
        playerName: "player1",
        handRank: "Royal Flush",
        amount: 50000, // $500 in cents
      });
      await element.updateComplete;

      const board = element.shadowRoot.querySelector("phg-board");
      await board.updateComplete;
      const cardElements = board.shadowRoot.querySelectorAll("phg-card");
      expect(cardElements.length).to.equal(5);
    });
  });
});
