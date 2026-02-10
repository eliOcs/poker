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
} from "./setup.js";

// Helper to find phg-button by text content
function findButtonByText(root, text) {
  const buttons = root.querySelectorAll("phg-button");
  for (const btn of buttons) {
    if (btn.textContent.includes(text)) {
      return btn;
    }
  }
  return null;
}

// Helper to get currency slider's internal range input
async function getCurrencySliderRange(actionPanel) {
  const currencySlider = actionPanel.shadowRoot.querySelector(
    "phg-currency-slider",
  );
  if (!currencySlider) return null;
  await currencySlider.updateComplete;
  return currencySlider.shadowRoot.querySelector('input[type="range"]');
}

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

      const slider = await getCurrencySliderRange(actionPanel);
      expect(slider).to.exist;
      // min=20 BB * 5000 cents = 100000, max=100 BB * 5000 cents = 500000
      expect(slider.min).to.equal("100000");
      expect(slider.max).to.equal("500000");

      const buyInButton = findButtonByText(actionPanel.shadowRoot, "Buy In");
      expect(buyInButton).to.exist;
      expect(buyInButton.textContent).to.include("Buy In");
    });

    it("displays buyIn amount as stack (BB count * big blind)", async () => {
      element.game = createMockGameWithBuyIn();
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      const buyInButton = findButtonByText(actionPanel.shadowRoot, "Buy In");
      expect(buyInButton).to.exist;
      // default=80 BB, bigBlind=50, so initial display should be $4,000
      expect(buyInButton.textContent).to.include("$4,000");
    });

    it("updates buyIn stack display when slider changes", async () => {
      element.game = createMockGameWithBuyIn();
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      const currencySlider = actionPanel.shadowRoot.querySelector(
        "phg-currency-slider",
      );
      // 50 BB * 5000 cents = 250000 cents = $2,500
      currencySlider.dispatchEvent(
        new CustomEvent("value-changed", { detail: { value: 250000 } }),
      );
      await actionPanel.updateComplete;

      const buyInButton = findButtonByText(actionPanel.shadowRoot, "Buy In");
      expect(buyInButton.textContent).to.include("$2,500");
    });

    it("uses fallback values for buyIn when action properties missing", async () => {
      element.game = createMockGameWithBuyIn();
      // Remove optional properties to test fallbacks
      element.game.seats[0].actions = [{ action: "buyIn" }];
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      const slider = await getCurrencySliderRange(actionPanel);
      expect(slider).to.exist;
      // fallback: min=20 BB * 5000 cents = 100000, max=100 BB * 5000 cents = 500000
      expect(slider.min).to.equal("100000");
      expect(slider.max).to.equal("500000");

      const buyInButton = findButtonByText(actionPanel.shadowRoot, "Buy In");
      // fallback: default=80 BB * $50 = $4,000
      expect(buyInButton.textContent).to.include("$4,000");
    });

    it("renders Check button", async () => {
      element.game = createMockGameAtFlop();
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      const checkButton = findButtonByText(actionPanel.shadowRoot, "Check");
      expect(checkButton).to.exist;
      expect(checkButton.textContent).to.include("Check");
    });

    it("renders Call button with amount", async () => {
      element.game = createMockGameWithPlayers();
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      const callButton = findButtonByText(actionPanel.shadowRoot, "Call");
      expect(callButton).to.exist;
      expect(callButton.textContent).to.include("Call");
      expect(callButton.textContent).to.include("$25"); // $25 from 2500 cents
    });

    it("renders Fold button", async () => {
      element.game = createMockGameWithPlayers();
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      const foldButton = findButtonByText(actionPanel.shadowRoot, "Fold");
      expect(foldButton).to.exist;
      expect(foldButton.textContent).to.include("Fold");
    });

    it("renders Bet slider and button", async () => {
      element.game = createMockGameAtFlop();
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      const betButton = findButtonByText(actionPanel.shadowRoot, "Bet");
      expect(betButton).to.exist;
      expect(betButton.textContent).to.include("Bet");
      expect(betButton.textContent).to.include("$"); // Now shows amount

      const slider = await getCurrencySliderRange(actionPanel);
      expect(slider).to.exist;
    });

    it("renders Raise slider and button", async () => {
      element.game = createMockGameWithPlayers();
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;

      const raiseButton = findButtonByText(actionPanel.shadowRoot, "Raise");
      expect(raiseButton).to.exist;
      expect(raiseButton.textContent).to.include("Raise");
    });

    it("renders All-In button when slider is at max", async () => {
      element.game = createMockGameWithPlayers();
      await element.updateComplete;

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      actionPanel.betAmount = 100000; // Set to max ($1,000 in cents)
      await actionPanel.updateComplete;

      const allInButton = findButtonByText(actionPanel.shadowRoot, "All-In");
      expect(allInButton).to.exist;
      expect(allInButton.textContent).to.include("All-In");
    });

    it("renders show-card buttons with card components", async () => {
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

      const showButtons = [
        ...actionPanel.shadowRoot.querySelectorAll("phg-button"),
      ].filter((btn) => btn.textContent.includes("Show"));
      expect(showButtons.length).to.equal(3);

      const cards = actionPanel.shadowRoot.querySelectorAll(
        ".show-cards phg-card",
      );
      expect(cards.length).to.equal(4);
    });
  });
});
