import { fixture, expect, html } from "@open-wc/testing";
import {
  MockWebSocket,
  createMockGameState,
  createMockGameWithPlayers,
  createMockGameAtFlop,
  createMockGameWithBuyIn,
  createMockTournamentGameState,
  mockOpponentSeat,
  mockEmptySeat,
  mockOccupiedSeat,
  mockSittingOutSeat,
} from "./setup.js";

function findButtonByText(root, text) {
  const buttons = root.querySelectorAll("phg-button");
  for (const btn of buttons) {
    if (btn.textContent.includes(text)) {
      return btn;
    }
  }
  return null;
}

describe("phg-action-panel", () => {
  let element;

  beforeEach(async () => {
    element = await fixture(html`<phg-game game-id="test123"></phg-game>`);
  });

  afterEach(() => {
    globalThis.WebSocket = MockWebSocket;
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

      const buyInButton = findButtonByText(actionPanel.shadowRoot, "Buy In");
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

      const checkButton = findButtonByText(actionPanel.shadowRoot, "Check");
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

      const callButton = findButtonByText(actionPanel.shadowRoot, "Call");
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

      const foldButton = findButtonByText(actionPanel.shadowRoot, "Fold");
      foldButton.click();

      expect(sentMessage).to.exist;
      expect(sentMessage.action).to.equal("fold");
      expect(sentMessage.seat).to.be.a("number");
    });

    it("calls send() with seat when Show card button is clicked", async () => {
      element.game = createMockGameState({
        hand: { phase: "waiting", pot: 0, currentBet: 0, actingSeat: -1 },
        seats: [
          {
            ...mockOccupiedSeat,
            actions: [
              { action: "showCard1", cards: ["As"] },
              { action: "showCard2", cards: ["Kh"] },
              { action: "showBothCards", cards: ["As", "Kh"] },
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

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      let sentMessage = null;
      element.addEventListener("game-action", (e) => {
        sentMessage = e.detail;
      });

      const showButton = [
        ...actionPanel.shadowRoot.querySelectorAll("phg-button"),
      ].find((btn) => btn.textContent.includes("Show"));
      showButton.click();

      expect(sentMessage).to.exist;
      expect(sentMessage.action).to.equal("showCard1");
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

      const betButton = findButtonByText(actionPanel.shadowRoot, "Bet");
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

      const raiseButton = findButtonByText(actionPanel.shadowRoot, "Raise");
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
      actionPanel.betAmount = 100000; // Set to max ($1,000 in cents)
      await actionPanel.updateComplete;

      let sentMessage = null;
      element.addEventListener("game-action", (e) => {
        sentMessage = e.detail;
      });

      const allInButton = findButtonByText(actionPanel.shadowRoot, "All-In");
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

      const currencySlider = actionPanel.shadowRoot.querySelector(
        "phg-currency-slider",
      );
      // 75 BB * 5000 cents = 375000 cents = $3,750
      currencySlider.dispatchEvent(
        new CustomEvent("value-changed", { detail: { value: 375000 } }),
      );
      await actionPanel.updateComplete;

      expect(actionPanel.betAmount).to.equal(375000);
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
        'phg-button[variant="muted"]',
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
        'phg-button[variant="muted"]',
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
      actionPanel.betAmount = 50000; // $500 in cents
      await actionPanel.updateComplete;

      expect(actionPanel.betAmount).to.equal(50000);

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

      // Set buy-in amount (now in cents: 60 BB * 5000 = 300000)
      actionPanel.betAmount = 300000;
      await actionPanel.updateComplete;

      expect(actionPanel.betAmount).to.equal(300000);

      // Switch to betting context (raise min=10000, max=100000 cents)
      element.game = createMockGameWithPlayers();
      await element.updateComplete;
      await actionPanel.updateComplete;

      // betAmount is reset to 0, then set to min (10000 cents) by render logic
      expect(actionPanel.betAmount).to.equal(10000);
    });

    it("uses default buyIn when betAmount exceeds max", async () => {
      element.game = createMockGameWithBuyIn();
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      // Manually set betAmount above max (100 BB * 5000 = 500000, so 600000 exceeds)
      actionPanel.betAmount = 600000;
      await actionPanel.updateComplete;

      // The buy-in button should show default (80 BB * $50 = $4,000)
      const buyInButton = findButtonByText(actionPanel.shadowRoot, "Buy In");
      expect(buyInButton.textContent).to.include("$4,000");
    });

    it("preserves betAmount when staying in same action context", async () => {
      // Start with betting
      element.game = createMockGameWithPlayers();
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      actionPanel.betAmount = 30000; // $300 in cents
      await actionPanel.updateComplete;

      // Update to different betting state (still has raise)
      element.game = createMockGameState({
        hand: {
          phase: "preflop",
          pot: 15000,
          currentBet: 10000,
          actingSeat: 0,
        }, // $150/$100 in cents
        seats: [
          {
            ...mockOccupiedSeat,
            actions: [
              { action: "call", amount: 5000 }, // $50 in cents
              { action: "raise", min: 20000, max: 100000 }, // $200-$1,000 in cents
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
      expect(actionPanel.betAmount).to.equal(30000);
    });
  });

  describe("sit button in waiting panel", () => {
    it('shows "Sit" without buy-in for cash games', async () => {
      element.game = createMockGameState();
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      const sitButton = findButtonByText(actionPanel.shadowRoot, "Sit");
      expect(sitButton).to.exist;
      expect(sitButton.textContent.trim()).to.equal("Sit");
    });

    it('shows "Sit $5" with buy-in for tournaments', async () => {
      element.game = createMockTournamentGameState();
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      const sitButton = findButtonByText(actionPanel.shadowRoot, "Sit");
      expect(sitButton).to.exist;
      expect(sitButton.textContent.trim()).to.equal("Sit $5");
    });
  });
});
