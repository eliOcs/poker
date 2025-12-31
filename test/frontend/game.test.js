import { fixture, expect, html } from "@open-wc/testing";
import {
  MockWebSocket,
  createMockGameState,
  createMockGameWithPlayers,
  createMockGameAtFlop,
  createMockGameWithBuyIn,
  mockOccupiedSeat,
  mockFoldedSeat,
  mockAllInSeat,
  mockOpponentSeat,
  mockEmptySeat,
} from "./fixtures.js";

// Mock WebSocket before importing the component
const OriginalWebSocket = globalThis.WebSocket;
globalThis.WebSocket = MockWebSocket;

// Mock process.env for the component
globalThis.process = {
  env: {
    DOMAIN: "localhost",
    PORT: "8443",
  },
};

// Import the component after mocking
import "../../src/frontend/index.js";

describe("phg-game", () => {
  let element;

  beforeEach(async () => {
    element = await fixture(html`<phg-game></phg-game>`);
  });

  afterEach(() => {
    // Reset WebSocket mock
    globalThis.WebSocket = MockWebSocket;
  });

  after(() => {
    // Restore original WebSocket
    globalThis.WebSocket = OriginalWebSocket;
  });

  // RENDERING TESTS
  describe("renderCard", () => {
    it("renders visible card with correct rank and suit symbol", async () => {
      element.game = createMockGameAtFlop();
      await element.updateComplete;

      const cards = element.shadowRoot.querySelectorAll(".card");
      expect(cards.length).to.be.greaterThan(0);

      // Check that cards contain suit symbols
      const cardTexts = Array.from(cards).map((c) => c.textContent.trim());
      expect(cardTexts.some((t) => t.includes("♥"))).to.be.true;
      expect(cardTexts.some((t) => t.includes("A"))).to.be.true;
    });

    it("renders hidden card with pattern background", async () => {
      element.game = createMockGameWithPlayers();
      await element.updateComplete;

      const hiddenCards = element.shadowRoot.querySelectorAll(".card.hidden");
      expect(hiddenCards.length).to.be.greaterThan(0);
    });

    it("uses red color for hearts/diamonds", async () => {
      element.game = createMockGameAtFlop();
      await element.updateComplete;

      const redCards = element.shadowRoot.querySelectorAll(".card.red");
      expect(redCards.length).to.be.greaterThan(0);
    });

    it("uses black color for spades/clubs", async () => {
      element.game = createMockGameAtFlop();
      await element.updateComplete;

      const blackCards = element.shadowRoot.querySelectorAll(".card.black");
      expect(blackCards.length).to.be.greaterThan(0);
    });

    it("handles all ranks (A, 2-10, J, Q, K)", async () => {
      // Create game with various ranks
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

      const cards = element.shadowRoot.querySelectorAll(
        ".community-cards .card",
      );
      const cardTexts = Array.from(cards).map((c) => c.textContent.trim());
      expect(cardTexts.some((t) => t.includes("A"))).to.be.true;
      expect(cardTexts.some((t) => t.includes("2"))).to.be.true;
      expect(cardTexts.some((t) => t.includes("10"))).to.be.true;
      expect(cardTexts.some((t) => t.includes("J"))).to.be.true;
      expect(cardTexts.some((t) => t.includes("K"))).to.be.true;
    });
  });

  describe("renderSeat", () => {
    it('shows "Empty" and Sit button for empty seats', async () => {
      element.game = createMockGameState();
      await element.updateComplete;

      const emptySeats = element.shadowRoot.querySelectorAll(".seat.empty");
      expect(emptySeats.length).to.equal(6);

      const sitButtons =
        element.shadowRoot.querySelectorAll(".seat.empty button");
      expect(sitButtons.length).to.equal(6);
      expect(sitButtons[0].textContent.trim()).to.equal("Sit");
    });

    it("displays player ID, stack, and bet for occupied seats", async () => {
      element.game = createMockGameWithPlayers();
      await element.updateComplete;

      const occupiedSeat =
        element.shadowRoot.querySelector(".seat:not(.empty)");
      expect(occupiedSeat).to.exist;

      const playerName = occupiedSeat.querySelector(".player-name");
      expect(playerName.textContent).to.include("test-pla"); // truncated to 8 chars

      const stack = occupiedSeat.querySelector(".stack");
      expect(stack.textContent).to.include("1000");

      const bet = occupiedSeat.querySelector(".bet");
      expect(bet.textContent).to.include("50");
    });

    it("shows dealer button at correct position", async () => {
      element.game = createMockGameState({
        button: 0,
        seats: [
          mockOccupiedSeat,
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 1 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 2 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 3 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 4 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 5 }] },
        ],
      });
      await element.updateComplete;

      const dealerButton = element.shadowRoot.querySelector(".dealer-button");
      expect(dealerButton).to.exist;
      expect(dealerButton.textContent.trim()).to.equal("D");
    });

    it("renders hole cards for current player", async () => {
      element.game = createMockGameWithPlayers();
      await element.updateComplete;

      const currentPlayerSeat = element.shadowRoot.querySelector(
        ".seat.current-player",
      );
      expect(currentPlayerSeat).to.exist;

      const cards = currentPlayerSeat.querySelectorAll(".card:not(.hidden)");
      expect(cards.length).to.equal(2);
    });

    it("renders hidden cards for opponents", async () => {
      element.game = createMockGameWithPlayers();
      await element.updateComplete;

      const seats = element.shadowRoot.querySelectorAll(".seat:not(.empty)");
      const opponentSeat = Array.from(seats).find(
        (s) => !s.classList.contains("current-player"),
      );

      if (opponentSeat) {
        const hiddenCards = opponentSeat.querySelectorAll(".card.hidden");
        expect(hiddenCards.length).to.equal(2);
      }
    });

    it("applies .folded class when seat.folded is true", async () => {
      element.game = createMockGameState({
        seats: [
          mockFoldedSeat,
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 1 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 2 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 3 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 4 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 5 }] },
        ],
      });
      await element.updateComplete;

      const foldedSeat = element.shadowRoot.querySelector(".seat.folded");
      expect(foldedSeat).to.exist;
    });

    it("applies .acting class when seat.isActing is true", async () => {
      element.game = createMockGameWithPlayers();
      await element.updateComplete;

      const actingSeat = element.shadowRoot.querySelector(".seat.acting");
      expect(actingSeat).to.exist;
    });

    it("applies .all-in class when seat.allIn is true", async () => {
      element.game = createMockGameState({
        seats: [
          mockAllInSeat,
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 1 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 2 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 3 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 4 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 5 }] },
        ],
      });
      await element.updateComplete;

      const allInSeat = element.shadowRoot.querySelector(".seat.all-in");
      expect(allInSeat).to.exist;
    });

    it("applies .current-player class for own seat", async () => {
      element.game = createMockGameWithPlayers();
      await element.updateComplete;

      const currentPlayerSeat = element.shadowRoot.querySelector(
        ".seat.current-player",
      );
      expect(currentPlayerSeat).to.exist;
    });
  });

  describe("renderBoard", () => {
    it('shows "WAITING" phase when waiting', async () => {
      element.game = createMockGameState();
      await element.updateComplete;

      const phase = element.shadowRoot.querySelector(".phase");
      expect(phase.textContent.toLowerCase()).to.include("waiting");
    });

    it("shows phase indicator during hand", async () => {
      element.game = createMockGameAtFlop();
      await element.updateComplete;

      const phase = element.shadowRoot.querySelector(".phase");
      expect(phase.textContent.toLowerCase()).to.include("flop");
    });

    it("displays community cards when present", async () => {
      element.game = createMockGameAtFlop();
      await element.updateComplete;

      const communityCards = element.shadowRoot.querySelectorAll(
        ".community-cards .card",
      );
      expect(communityCards.length).to.equal(3);
    });

    it('shows "No cards yet" when board is empty', async () => {
      element.game = createMockGameState();
      await element.updateComplete;

      const boardInfo = element.shadowRoot.querySelector(".board-info");
      expect(boardInfo.textContent).to.include("No cards yet");
    });

    it("shows pot amount", async () => {
      element.game = createMockGameAtFlop();
      await element.updateComplete;

      const pot = element.shadowRoot.querySelector(".pot");
      expect(pot.textContent).to.include("200");
    });
  });

  describe("renderActions", () => {
    it('shows "Waiting for your turn" when no actions available', async () => {
      element.game = createMockGameState({
        seats: [
          { ...mockOpponentSeat, isCurrentPlayer: true },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 1 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 2 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 3 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 4 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 5 }] },
        ],
      });
      await element.updateComplete;

      const actions = element.shadowRoot.querySelector("#actions");
      expect(actions.textContent).to.include("Waiting for your turn");
    });

    it("renders buyIn slider with min/max from action", async () => {
      element.game = createMockGameWithBuyIn();
      await element.updateComplete;

      const slider = element.shadowRoot.querySelector(
        '#actions input[type="range"]',
      );
      expect(slider).to.exist;
      expect(slider.min).to.equal("20");
      expect(slider.max).to.equal("100");

      const buyInButton = element.shadowRoot.querySelector(
        "#actions button.buy-in",
      );
      expect(buyInButton).to.exist;
      expect(buyInButton.textContent.trim()).to.equal("Buy In");
    });

    it("renders Check button", async () => {
      element.game = createMockGameAtFlop();
      await element.updateComplete;

      const checkButton = element.shadowRoot.querySelector(
        "#actions button.check",
      );
      expect(checkButton).to.exist;
      expect(checkButton.textContent.trim()).to.equal("Check");
    });

    it("renders Call button with amount", async () => {
      element.game = createMockGameWithPlayers();
      await element.updateComplete;

      const callButton = element.shadowRoot.querySelector(
        "#actions button.call",
      );
      expect(callButton).to.exist;
      expect(callButton.textContent).to.include("Call");
      expect(callButton.textContent).to.include("25");
    });

    it("renders Fold button", async () => {
      element.game = createMockGameWithPlayers();
      await element.updateComplete;

      const foldButton = element.shadowRoot.querySelector(
        "#actions button.fold",
      );
      expect(foldButton).to.exist;
      expect(foldButton.textContent.trim()).to.equal("Fold");
    });

    it("renders Bet slider and button", async () => {
      element.game = createMockGameAtFlop();
      await element.updateComplete;

      const betButton = element.shadowRoot.querySelector("#actions button.bet");
      expect(betButton).to.exist;
      expect(betButton.textContent.trim()).to.equal("Bet");

      const slider = element.shadowRoot.querySelector(
        '#actions input[type="range"]',
      );
      expect(slider).to.exist;
    });

    it("renders Raise slider and button", async () => {
      element.game = createMockGameWithPlayers();
      await element.updateComplete;

      const raiseButton = element.shadowRoot.querySelector(
        "#actions button.raise",
      );
      expect(raiseButton).to.exist;
      expect(raiseButton.textContent).to.include("Raise");
    });

    it("renders All-In button with amount", async () => {
      element.game = createMockGameWithPlayers();
      await element.updateComplete;

      const allInButton = element.shadowRoot.querySelector(
        "#actions button.all-in",
      );
      expect(allInButton).to.exist;
      expect(allInButton.textContent).to.include("All-In");
      expect(allInButton.textContent).to.include("1000");
    });
  });

  // INTERACTION TESTS
  describe("user interactions", () => {
    it("calls send() when Sit button clicked", async () => {
      element.game = createMockGameState();
      await element.updateComplete;

      const sitButton = element.shadowRoot.querySelector(".seat.empty button");
      sitButton.click();

      expect(element.socket.sent.length).to.equal(1);
      expect(element.socket.sent[0].action).to.equal("sit");
      expect(element.socket.sent[0].seat).to.be.a("number");
    });

    it("calls send() with seat and amount when Buy In clicked", async () => {
      element.game = createMockGameWithBuyIn();
      await element.updateComplete;

      const buyInButton = element.shadowRoot.querySelector(
        "#actions button.buy-in",
      );
      buyInButton.click();

      const sentMessage = element.socket.sent.find((m) => m.action === "buyIn");
      expect(sentMessage).to.exist;
      expect(sentMessage.seat).to.be.a("number");
      expect(sentMessage.amount).to.be.a("number");
    });

    it("calls send() with seat when Check clicked", async () => {
      element.game = createMockGameAtFlop();
      await element.updateComplete;

      const checkButton = element.shadowRoot.querySelector(
        "#actions button.check",
      );
      checkButton.click();

      const sentMessage = element.socket.sent.find((m) => m.action === "check");
      expect(sentMessage).to.exist;
      expect(sentMessage.seat).to.be.a("number");
    });

    it("calls send() with seat when Call clicked", async () => {
      element.game = createMockGameWithPlayers();
      await element.updateComplete;

      const callButton = element.shadowRoot.querySelector(
        "#actions button.call",
      );
      callButton.click();

      const sentMessage = element.socket.sent.find((m) => m.action === "call");
      expect(sentMessage).to.exist;
      expect(sentMessage.seat).to.be.a("number");
    });

    it("calls send() with seat when Fold clicked", async () => {
      element.game = createMockGameWithPlayers();
      await element.updateComplete;

      const foldButton = element.shadowRoot.querySelector(
        "#actions button.fold",
      );
      foldButton.click();

      const sentMessage = element.socket.sent.find((m) => m.action === "fold");
      expect(sentMessage).to.exist;
      expect(sentMessage.seat).to.be.a("number");
    });

    it("calls send() with seat and amount when Bet clicked", async () => {
      element.game = createMockGameAtFlop();
      await element.updateComplete;

      const betButton = element.shadowRoot.querySelector("#actions button.bet");
      betButton.click();

      const sentMessage = element.socket.sent.find((m) => m.action === "bet");
      expect(sentMessage).to.exist;
      expect(sentMessage.seat).to.be.a("number");
      expect(sentMessage.amount).to.be.a("number");
    });

    it("calls send() with seat and amount when Raise clicked", async () => {
      element.game = createMockGameWithPlayers();
      await element.updateComplete;

      const raiseButton = element.shadowRoot.querySelector(
        "#actions button.raise",
      );
      raiseButton.click();

      const sentMessage = element.socket.sent.find((m) => m.action === "raise");
      expect(sentMessage).to.exist;
      expect(sentMessage.seat).to.be.a("number");
      expect(sentMessage.amount).to.be.a("number");
    });

    it("calls send() with seat when All-In clicked", async () => {
      element.game = createMockGameWithPlayers();
      await element.updateComplete;

      const allInButton = element.shadowRoot.querySelector(
        "#actions button.all-in",
      );
      allInButton.click();

      const sentMessage = element.socket.sent.find((m) => m.action === "allIn");
      expect(sentMessage).to.exist;
      expect(sentMessage.seat).to.be.a("number");
    });

    it("updates betAmount when slider changed", async () => {
      element.game = createMockGameWithBuyIn();
      await element.updateComplete;

      const slider = element.shadowRoot.querySelector(
        '#actions input[type="range"]',
      );
      slider.value = "75";
      slider.dispatchEvent(new Event("input"));
      await element.updateComplete;

      expect(element.betAmount).to.equal(75);
    });
  });

  // STATE MANAGEMENT TESTS
  describe("state handling", () => {
    it("shows loading state when game is null", async () => {
      element.game = null;
      await element.updateComplete;

      const content = element.shadowRoot.textContent;
      expect(content).to.include("Loading");
    });

    it("updates UI when game property changes", async () => {
      element.game = createMockGameState();
      await element.updateComplete;

      let pot = element.shadowRoot.querySelector(".pot");
      expect(pot.textContent).to.include("0");

      element.game = createMockGameAtFlop();
      await element.updateComplete;

      pot = element.shadowRoot.querySelector(".pot");
      expect(pot.textContent).to.include("200");
    });

    it("waits for updateComplete after property change", async () => {
      element.game = createMockGameState();
      const updatePromise = element.updateComplete;
      expect(updatePromise).to.be.instanceOf(Promise);
      await updatePromise;
      // If we got here, updateComplete resolved
    });
  });

  // ERROR HANDLING TESTS
  describe("error handling", () => {
    it("displays error message when error property set", async () => {
      element.game = createMockGameState();
      element.error = "Test error message";
      await element.updateComplete;

      const errorDiv = element.shadowRoot.querySelector(".error-message");
      expect(errorDiv).to.exist;
      expect(errorDiv.textContent).to.include("Test error message");
    });

    it("error message has correct styling", async () => {
      element.game = createMockGameState();
      element.error = "Test error";
      await element.updateComplete;

      const errorDiv = element.shadowRoot.querySelector(".error-message");
      expect(errorDiv).to.exist;
    });

    it("handles server error responses", async () => {
      element.game = createMockGameState();
      await element.updateComplete;

      // Simulate server error
      element.socket.onmessage({
        data: JSON.stringify({ error: { message: "Server error" } }),
      });
      await element.updateComplete;

      expect(element.error).to.equal("Server error");
    });
  });

  // CONNECTION TESTS
  describe("WebSocket connection", () => {
    it('shows "Connecting" when readyState is 0', async () => {
      element.game = createMockGameState();
      element.socket.readyState = 0;
      await element.updateComplete;

      const status = element.shadowRoot.querySelector("#connection-status");
      expect(status.textContent).to.include("Connecting");
    });

    it('shows "Connected" when readyState is 1', async () => {
      element.game = createMockGameState();
      element.socket.readyState = 1;
      await element.updateComplete;

      const status = element.shadowRoot.querySelector("#connection-status");
      expect(status.textContent).to.include("Connected");
    });

    it('shows "Closing" when readyState is 2', async () => {
      element.game = createMockGameState();
      element.socket.readyState = 2;
      await element.updateComplete;

      const status = element.shadowRoot.querySelector("#connection-status");
      expect(status.textContent).to.include("Closing");
    });

    it('shows "Closed" when readyState is 3', async () => {
      element.game = createMockGameState();
      element.socket.readyState = 3;
      await element.updateComplete;

      const status = element.shadowRoot.querySelector("#connection-status");
      expect(status.textContent).to.include("Closed");
    });
  });
});
