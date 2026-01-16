import { fixture, expect, html } from "@open-wc/testing";
import {
  MockWebSocket,
  createMockGameState,
  createMockGameWithPlayers,
  createMockGameAtFlop,
  createMockGameWithBuyIn,
  mockOpponentSeat,
  mockEmptySeat,
  mockOccupiedSeat,
  mockSittingOutSeat,
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
          { ...mockOpponentSeat, isCurrentPlayer: false },
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
      expect(buyInButton.textContent).to.include("Buy In");
    });

    it("displays buyIn amount as stack (BB count * big blind)", async () => {
      element.game = createMockGameWithBuyIn();
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      const buyInButton = actionPanel.shadowRoot.querySelector("button.buy-in");
      expect(buyInButton).to.exist;
      // default=80 BB, bigBlind=50, so initial display should be $4000
      expect(buyInButton.textContent).to.include("$4000");
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

      const buyInButton = actionPanel.shadowRoot.querySelector("button.buy-in");
      // 50 BB * $50 = $2500
      expect(buyInButton.textContent).to.include("$2500");
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

      const buyInButton = actionPanel.shadowRoot.querySelector("button.buy-in");
      // fallback: default=80 BB, bigBlind=50, so $4000
      expect(buyInButton.textContent).to.include("$4000");
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
      expect(betButton.textContent).to.include("Bet");
      expect(betButton.textContent).to.include("$"); // Now shows amount

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

      let sentMessage = null;
      element.addEventListener("game-action", (e) => {
        sentMessage = e.detail;
      });

      const buyInButton = actionPanel.shadowRoot.querySelector("button.buy-in");
      buyInButton.click();

      expect(sentMessage).to.exist;
      expect(sentMessage.action).to.equal("buyIn");
      expect(sentMessage.seat).to.be.a("number");
      expect(sentMessage.amount).to.be.a("number");
    });

    it("calls send() with seat when Check clicked", async () => {
      element.game = createMockGameAtFlop();
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      let sentMessage = null;
      element.addEventListener("game-action", (e) => {
        sentMessage = e.detail;
      });

      const checkButton = actionPanel.shadowRoot.querySelector("button.check");
      checkButton.click();

      expect(sentMessage).to.exist;
      expect(sentMessage.action).to.equal("check");
      expect(sentMessage.seat).to.be.a("number");
    });

    it("calls send() with seat when Call clicked", async () => {
      element.game = createMockGameWithPlayers();
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      let sentMessage = null;
      element.addEventListener("game-action", (e) => {
        sentMessage = e.detail;
      });

      const callButton = actionPanel.shadowRoot.querySelector("button.call");
      callButton.click();

      expect(sentMessage).to.exist;
      expect(sentMessage.action).to.equal("call");
      expect(sentMessage.seat).to.be.a("number");
    });

    it("calls send() with seat when Fold clicked", async () => {
      element.game = createMockGameWithPlayers();
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      let sentMessage = null;
      element.addEventListener("game-action", (e) => {
        sentMessage = e.detail;
      });

      const foldButton = actionPanel.shadowRoot.querySelector("button.fold");
      foldButton.click();

      expect(sentMessage).to.exist;
      expect(sentMessage.action).to.equal("fold");
      expect(sentMessage.seat).to.be.a("number");
    });

    it("calls send() with seat and amount when Bet clicked", async () => {
      element.game = createMockGameAtFlop();
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      let sentMessage = null;
      element.addEventListener("game-action", (e) => {
        sentMessage = e.detail;
      });

      const betButton = actionPanel.shadowRoot.querySelector("button.bet");
      betButton.click();

      expect(sentMessage).to.exist;
      expect(sentMessage.action).to.equal("bet");
      expect(sentMessage.seat).to.be.a("number");
      expect(sentMessage.amount).to.be.a("number");
    });

    it("calls send() with seat and amount when Raise clicked", async () => {
      element.game = createMockGameWithPlayers();
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      let sentMessage = null;
      element.addEventListener("game-action", (e) => {
        sentMessage = e.detail;
      });

      const raiseButton = actionPanel.shadowRoot.querySelector("button.raise");
      raiseButton.click();

      expect(sentMessage).to.exist;
      expect(sentMessage.action).to.equal("raise");
      expect(sentMessage.seat).to.be.a("number");
      expect(sentMessage.amount).to.be.a("number");
    });

    it("calls send() with allIn action when slider at max and button clicked", async () => {
      element.game = createMockGameWithPlayers();
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      actionPanel.betAmount = 1000; // Set to max
      await actionPanel.updateComplete;

      let sentMessage = null;
      element.addEventListener("game-action", (e) => {
        sentMessage = e.detail;
      });

      const allInButton = actionPanel.shadowRoot.querySelector("button.all-in");
      allInButton.click();

      expect(sentMessage).to.exist;
      expect(sentMessage.action).to.equal("allIn");
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

  describe("sit out actions", () => {
    it("renders Sit Out button when sitOut action available", async () => {
      element.game = createMockGameState({
        seats: [
          {
            ...mockOccupiedSeat,
            sittingOut: false,
            actions: [{ action: "start" }, { action: "sitOut" }],
          },
          { ...mockOpponentSeat, stack: 1000 },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 2 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 3 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 4 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 5 }] },
        ],
      });
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      const sitOutButton = actionPanel.shadowRoot.querySelector(
        'phg-button[variant="secondary"]',
      );
      expect(sitOutButton).to.exist;
      expect(sitOutButton.textContent.trim()).to.equal("Sit Out");
    });

    it("renders Sit In button when sitIn action available", async () => {
      element.game = createMockGameState({
        seats: [
          mockSittingOutSeat,
          { ...mockOpponentSeat, stack: 1000 },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 2 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 3 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 4 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 5 }] },
        ],
      });
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      const sitInButton = actionPanel.shadowRoot.querySelector(
        'phg-button[variant="success"]',
      );
      expect(sitInButton).to.exist;
      expect(sitInButton.textContent).to.include("Sit In");
    });

    it("calls send() with seat when Sit Out clicked", async () => {
      element.game = createMockGameState({
        seats: [
          {
            ...mockOccupiedSeat,
            sittingOut: false,
            actions: [{ action: "sitOut" }],
          },
          { ...mockOpponentSeat, stack: 1000 },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 2 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 3 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 4 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 5 }] },
        ],
      });
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      let sentMessage = null;
      element.addEventListener("game-action", (e) => {
        sentMessage = e.detail;
      });

      const sitOutButton = actionPanel.shadowRoot.querySelector(
        'phg-button[variant="secondary"]',
      );
      sitOutButton.click();

      expect(sentMessage).to.exist;
      expect(sentMessage.action).to.equal("sitOut");
      expect(sentMessage.seat).to.be.a("number");
    });

    it("calls send() with seat when Sit In clicked", async () => {
      element.game = createMockGameState({
        seats: [
          mockSittingOutSeat,
          { ...mockOpponentSeat, stack: 1000 },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 2 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 3 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 4 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 5 }] },
        ],
      });
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      let sentMessage = null;
      element.addEventListener("game-action", (e) => {
        sentMessage = e.detail;
      });

      const sitInButton = actionPanel.shadowRoot.querySelector(
        'phg-button[variant="success"]',
      );
      sitInButton.click();

      expect(sentMessage).to.exist;
      expect(sentMessage.action).to.equal("sitIn");
      expect(sentMessage.seat).to.be.a("number");
    });
  });

  describe("betAmount state management", () => {
    it("resets betAmount when switching from betting to buyIn", async () => {
      // Start with a raise action (betting context)
      element.game = createMockGameWithPlayers();
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      // Set a high bet amount (e.g., simulating an all-in)
      actionPanel.betAmount = 500;
      await actionPanel.updateComplete;

      expect(actionPanel.betAmount).to.equal(500);

      // Switch to buyIn context (e.g., after losing the hand)
      element.game = createMockGameWithBuyIn();
      await element.updateComplete;
      await actionPanel.updateComplete;

      // betAmount should be reset to 0 (will use default 80 BB)
      expect(actionPanel.betAmount).to.equal(0);
    });

    it("resets betAmount when switching from buyIn to betting", async () => {
      // Start with buyIn action
      element.game = createMockGameWithBuyIn();
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      // Set buy-in amount
      actionPanel.betAmount = 60;
      await actionPanel.updateComplete;

      expect(actionPanel.betAmount).to.equal(60);

      // Switch to betting context (raise min=100, max=1000)
      element.game = createMockGameWithPlayers();
      await element.updateComplete;
      await actionPanel.updateComplete;

      // betAmount is reset to 0, then set to min (100) by render logic
      expect(actionPanel.betAmount).to.equal(100);
    });

    it("uses default buyIn when betAmount exceeds max", async () => {
      element.game = createMockGameWithBuyIn();
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      // Manually set betAmount above max (100)
      actionPanel.betAmount = 500;
      await actionPanel.updateComplete;

      // The buy-in button should show default (80 BB * $50 = $4000)
      const buyInButton = actionPanel.shadowRoot.querySelector("button.buy-in");
      expect(buyInButton.textContent).to.include("$4000");
    });

    it("preserves betAmount when staying in same action context", async () => {
      // Start with betting
      element.game = createMockGameWithPlayers();
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      actionPanel.betAmount = 300;
      await actionPanel.updateComplete;

      // Update to different betting state (still has raise)
      element.game = createMockGameState({
        hand: { phase: "preflop", pot: 150, currentBet: 100, actingSeat: 0 },
        seats: [
          {
            ...mockOccupiedSeat,
            actions: [
              { action: "call", amount: 50 },
              { action: "raise", min: 200, max: 1000 },
              { action: "fold" },
            ],
          },
          mockOpponentSeat,
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 2 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 3 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 4 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 5 }] },
        ],
      });
      await element.updateComplete;
      await actionPanel.updateComplete;

      // betAmount should be preserved since we're still in betting context
      expect(actionPanel.betAmount).to.equal(300);
    });
  });
});
