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
    element = await fixture(html`<phg-game game-id="test123"></phg-game>`);
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

      // Cards are now in phg-board -> phg-card components
      const board = element.shadowRoot.querySelector("phg-board");
      await board.updateComplete;
      const cardElements = board.shadowRoot.querySelectorAll("phg-card");
      expect(cardElements.length).to.be.greaterThan(0);

      // Check card contents
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

      // Hidden cards are in opponent's seat
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

  describe("renderSeat", () => {
    it('shows "Empty" and Sit button for empty seats', async () => {
      element.game = createMockGameState();
      await element.updateComplete;

      const seats = element.shadowRoot.querySelectorAll("phg-seat");
      expect(seats.length).to.equal(6);

      let emptyCount = 0;
      let sitButtonCount = 0;
      for (const seat of seats) {
        await seat.updateComplete;
        if (seat.classList.contains("empty")) emptyCount++;
        const sitBtn = seat.shadowRoot.querySelector("button");
        if (sitBtn && sitBtn.textContent.trim() === "Sit") sitButtonCount++;
      }
      expect(emptyCount).to.equal(6);
      expect(sitButtonCount).to.equal(6);
    });

    it("displays player ID, stack, and bet for occupied seats", async () => {
      element.game = createMockGameWithPlayers();
      await element.updateComplete;

      const seats = element.shadowRoot.querySelectorAll("phg-seat");
      let foundOccupied = false;
      for (const seat of seats) {
        await seat.updateComplete;
        if (!seat.classList.contains("empty")) {
          foundOccupied = true;
          const playerName = seat.shadowRoot.querySelector(".player-name");
          expect(playerName.textContent).to.include("test-pla");

          const stack = seat.shadowRoot.querySelector(".stack");
          expect(stack.textContent).to.include("1000");

          const bet = seat.shadowRoot.querySelector(".bet");
          expect(bet.textContent).to.include("50");
          break;
        }
      }
      expect(foundOccupied).to.be.true;
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

      const seats = element.shadowRoot.querySelectorAll("phg-seat");
      await seats[0].updateComplete;
      const dealerButton = seats[0].shadowRoot.querySelector(".dealer-button");
      expect(dealerButton).to.exist;
      expect(dealerButton.textContent.trim()).to.equal("D");
    });

    it("renders hole cards for current player", async () => {
      element.game = createMockGameWithPlayers();
      await element.updateComplete;

      const seats = element.shadowRoot.querySelectorAll("phg-seat");
      let foundCurrentPlayer = false;
      for (const seat of seats) {
        await seat.updateComplete;
        if (seat.classList.contains("current-player")) {
          foundCurrentPlayer = true;
          const cardElements = seat.shadowRoot.querySelectorAll("phg-card");
          let visibleCount = 0;
          for (const cardEl of cardElements) {
            const visibleCard =
              cardEl.shadowRoot.querySelector(".card:not(.hidden)");
            if (visibleCard) visibleCount++;
          }
          expect(visibleCount).to.equal(2);
          break;
        }
      }
      expect(foundCurrentPlayer).to.be.true;
    });

    it("renders hidden cards for opponents", async () => {
      element.game = createMockGameWithPlayers();
      await element.updateComplete;

      const seats = element.shadowRoot.querySelectorAll("phg-seat");
      for (const seat of seats) {
        await seat.updateComplete;
        if (
          !seat.classList.contains("empty") &&
          !seat.classList.contains("current-player")
        ) {
          const cardElements = seat.shadowRoot.querySelectorAll("phg-card");
          let hiddenCount = 0;
          for (const cardEl of cardElements) {
            const hiddenCard = cardEl.shadowRoot.querySelector(".card.hidden");
            if (hiddenCard) hiddenCount++;
          }
          expect(hiddenCount).to.equal(2);
        }
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

      const seats = element.shadowRoot.querySelectorAll("phg-seat");
      await seats[0].updateComplete;
      expect(seats[0].classList.contains("folded")).to.be.true;
    });

    it("applies .acting class when seat.isActing is true", async () => {
      element.game = createMockGameWithPlayers();
      await element.updateComplete;

      const seats = element.shadowRoot.querySelectorAll("phg-seat");
      let foundActing = false;
      for (const seat of seats) {
        await seat.updateComplete;
        if (seat.classList.contains("acting")) {
          foundActing = true;
          break;
        }
      }
      expect(foundActing).to.be.true;
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

      const seats = element.shadowRoot.querySelectorAll("phg-seat");
      await seats[0].updateComplete;
      expect(seats[0].classList.contains("all-in")).to.be.true;
    });

    it("applies .current-player class for own seat", async () => {
      element.game = createMockGameWithPlayers();
      await element.updateComplete;

      const seats = element.shadowRoot.querySelectorAll("phg-seat");
      let foundCurrentPlayer = false;
      for (const seat of seats) {
        await seat.updateComplete;
        if (seat.classList.contains("current-player")) {
          foundCurrentPlayer = true;
          break;
        }
      }
      expect(foundCurrentPlayer).to.be.true;
    });
  });

  describe("renderBoard", () => {
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

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;
      expect(actionPanel.shadowRoot.textContent).to.include(
        "Waiting for your turn",
      );
    });

    it("renders buyIn slider with min/max from action", async () => {
      element.game = createMockGameWithBuyIn();
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      const slider = actionPanel.shadowRoot.querySelector(
        'input[type="range"]',
      );
      expect(slider).to.exist;
      expect(slider.min).to.equal("20");
      expect(slider.max).to.equal("100");

      const buyInButton = actionPanel.shadowRoot.querySelector("button.buy-in");
      expect(buyInButton).to.exist;
      expect(buyInButton.textContent.trim()).to.equal("Buy In");
    });

    it("renders Check button", async () => {
      element.game = createMockGameAtFlop();
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      const checkButton = actionPanel.shadowRoot.querySelector("button.check");
      expect(checkButton).to.exist;
      expect(checkButton.textContent.trim()).to.equal("Check");
    });

    it("renders Call button with amount", async () => {
      element.game = createMockGameWithPlayers();
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      const callButton = actionPanel.shadowRoot.querySelector("button.call");
      expect(callButton).to.exist;
      expect(callButton.textContent).to.include("Call");
      expect(callButton.textContent).to.include("25");
    });

    it("renders Fold button", async () => {
      element.game = createMockGameWithPlayers();
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      const foldButton = actionPanel.shadowRoot.querySelector("button.fold");
      expect(foldButton).to.exist;
      expect(foldButton.textContent.trim()).to.equal("Fold");
    });

    it("renders Bet slider and button", async () => {
      element.game = createMockGameAtFlop();
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      const betButton = actionPanel.shadowRoot.querySelector("button.bet");
      expect(betButton).to.exist;
      expect(betButton.textContent.trim()).to.equal("Bet");

      const slider = actionPanel.shadowRoot.querySelector(
        'input[type="range"]',
      );
      expect(slider).to.exist;
    });

    it("renders Raise slider and button", async () => {
      element.game = createMockGameWithPlayers();
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      const raiseButton = actionPanel.shadowRoot.querySelector("button.raise");
      expect(raiseButton).to.exist;
      expect(raiseButton.textContent).to.include("Raise");
    });

    it("renders All-In button when slider is at max", async () => {
      element.game = createMockGameWithPlayers();
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      actionPanel.betAmount = 1000; // Set to max
      await actionPanel.updateComplete;

      const allInButton = actionPanel.shadowRoot.querySelector("button.all-in");
      expect(allInButton).to.exist;
      expect(allInButton.textContent).to.include("All-In");
    });
  });

  // INTERACTION TESTS
  describe("user interactions", () => {
    it("calls send() when Sit button clicked", async () => {
      element.game = createMockGameState();
      await element.updateComplete;

      const seats = element.shadowRoot.querySelectorAll("phg-seat");
      await seats[0].updateComplete;
      const sitButton = seats[0].shadowRoot.querySelector("button");
      sitButton.click();

      expect(element.socket.sent.length).to.equal(1);
      expect(element.socket.sent[0].action).to.equal("sit");
      expect(element.socket.sent[0].seat).to.be.a("number");
    });

    it("calls send() with seat and amount when Buy In clicked", async () => {
      element.game = createMockGameWithBuyIn();
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      const buyInButton = actionPanel.shadowRoot.querySelector("button.buy-in");
      buyInButton.click();

      const sentMessage = element.socket.sent.find((m) => m.action === "buyIn");
      expect(sentMessage).to.exist;
      expect(sentMessage.seat).to.be.a("number");
      expect(sentMessage.amount).to.be.a("number");
    });

    it("calls send() with seat when Check clicked", async () => {
      element.game = createMockGameAtFlop();
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      const checkButton = actionPanel.shadowRoot.querySelector("button.check");
      checkButton.click();

      const sentMessage = element.socket.sent.find((m) => m.action === "check");
      expect(sentMessage).to.exist;
      expect(sentMessage.seat).to.be.a("number");
    });

    it("calls send() with seat when Call clicked", async () => {
      element.game = createMockGameWithPlayers();
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      const callButton = actionPanel.shadowRoot.querySelector("button.call");
      callButton.click();

      const sentMessage = element.socket.sent.find((m) => m.action === "call");
      expect(sentMessage).to.exist;
      expect(sentMessage.seat).to.be.a("number");
    });

    it("calls send() with seat when Fold clicked", async () => {
      element.game = createMockGameWithPlayers();
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      const foldButton = actionPanel.shadowRoot.querySelector("button.fold");
      foldButton.click();

      const sentMessage = element.socket.sent.find((m) => m.action === "fold");
      expect(sentMessage).to.exist;
      expect(sentMessage.seat).to.be.a("number");
    });

    it("calls send() with seat and amount when Bet clicked", async () => {
      element.game = createMockGameAtFlop();
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      const betButton = actionPanel.shadowRoot.querySelector("button.bet");
      betButton.click();

      const sentMessage = element.socket.sent.find((m) => m.action === "bet");
      expect(sentMessage).to.exist;
      expect(sentMessage.seat).to.be.a("number");
      expect(sentMessage.amount).to.be.a("number");
    });

    it("calls send() with seat and amount when Raise clicked", async () => {
      element.game = createMockGameWithPlayers();
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      const raiseButton = actionPanel.shadowRoot.querySelector("button.raise");
      raiseButton.click();

      const sentMessage = element.socket.sent.find((m) => m.action === "raise");
      expect(sentMessage).to.exist;
      expect(sentMessage.seat).to.be.a("number");
      expect(sentMessage.amount).to.be.a("number");
    });

    it("calls send() with allIn action when slider at max and button clicked", async () => {
      element.game = createMockGameWithPlayers();
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      actionPanel.betAmount = 1000; // Set to max
      await actionPanel.updateComplete;

      const allInButton = actionPanel.shadowRoot.querySelector("button.all-in");
      allInButton.click();

      const sentMessage = element.socket.sent.find((m) => m.action === "allIn");
      expect(sentMessage).to.exist;
      expect(sentMessage.seat).to.be.a("number");
    });

    it("updates betAmount when slider changed", async () => {
      element.game = createMockGameWithBuyIn();
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      const slider = actionPanel.shadowRoot.querySelector(
        'input[type="range"]',
      );
      slider.value = "75";
      slider.dispatchEvent(new Event("input"));
      await actionPanel.updateComplete;

      expect(actionPanel.betAmount).to.equal(75);
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

      const board = element.shadowRoot.querySelector("phg-board");
      await board.updateComplete;
      let pot = board.shadowRoot.querySelector(".pot");
      expect(pot.textContent).to.include("0");

      element.game = createMockGameAtFlop();
      await element.updateComplete;
      await board.updateComplete;

      pot = board.shadowRoot.querySelector(".pot");
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
