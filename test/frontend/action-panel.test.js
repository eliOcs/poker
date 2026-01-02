import { fixture, expect, html } from "@open-wc/testing";
import {
  MockWebSocket,
  createMockGameState,
  createMockGameWithPlayers,
  createMockGameAtFlop,
  createMockGameWithBuyIn,
  mockOpponentSeat,
  mockEmptySeat,
} from "./setup.js";

describe("phg-action-panel", () => {
  let element;

  beforeEach(async () => {
    element = await fixture(html`<phg-game game-id="test123"></phg-game>`);
  });

  afterEach(() => {
    globalThis.WebSocket = MockWebSocket;
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

    it("displays buyIn amount as stack (BB count * big blind)", async () => {
      element.game = createMockGameWithBuyIn();
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      const amountDisplay =
        actionPanel.shadowRoot.querySelector(".amount-display");
      expect(amountDisplay).to.exist;
      // min=20, bigBlind=50, so initial display should be $1000
      expect(amountDisplay.textContent).to.equal("$1000");
    });

    it("updates buyIn stack display when slider changes", async () => {
      element.game = createMockGameWithBuyIn();
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      const slider = actionPanel.shadowRoot.querySelector(
        'input[type="range"]',
      );
      slider.value = "50";
      slider.dispatchEvent(new Event("input"));
      await actionPanel.updateComplete;

      const amountDisplay =
        actionPanel.shadowRoot.querySelector(".amount-display");
      // 50 BB * $50 = $2500
      expect(amountDisplay.textContent).to.equal("$2500");
    });

    it("uses fallback values for buyIn when action properties missing", async () => {
      element.game = createMockGameWithBuyIn();
      // Remove optional properties to test fallbacks
      element.game.seats[0].actions = [{ action: "buyIn" }];
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      const slider = actionPanel.shadowRoot.querySelector(
        'input[type="range"]',
      );
      expect(slider).to.exist;
      expect(slider.min).to.equal("20"); // fallback
      expect(slider.max).to.equal("100"); // fallback

      const amountDisplay =
        actionPanel.shadowRoot.querySelector(".amount-display");
      // fallback: min=20, bigBlind=50, so $1000
      expect(amountDisplay.textContent).to.equal("$1000");
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

  describe("user interactions", () => {
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
});
