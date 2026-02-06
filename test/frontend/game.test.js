import { fixture, expect, html } from "@open-wc/testing";
import {
  OriginalWebSocket,
  MockWebSocket,
  createMockGameState,
  createMockGameAtFlop,
  mockOccupiedSeat,
  mockEmptySeat,
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

describe("phg-game", () => {
  let element;

  beforeEach(async () => {
    element = await fixture(html`<phg-game game-id="test123"></phg-game>`);
  });

  afterEach(() => {
    globalThis.WebSocket = MockWebSocket;
  });

  after(() => {
    globalThis.WebSocket = OriginalWebSocket;
  });

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
    });
  });

  describe("event handling", () => {
    it("emits only one game-action event per action (no double-send)", async () => {
      element.game = createMockGameState();
      await element.updateComplete;

      let eventCount = 0;
      element.addEventListener("game-action", () => {
        eventCount++;
      });

      // Trigger a seat action via the phg-seat component
      const seats = element.shadowRoot.querySelectorAll("phg-seat");
      await seats[0].updateComplete;
      const sitButton = seats[0].shadowRoot.querySelector("phg-button");
      sitButton.click();

      // Should receive exactly one event, not two
      expect(eventCount).to.equal(1);
    });

    it("emits only one game-action event for action panel actions", async () => {
      element.game = createMockGameAtFlop();
      await element.updateComplete;

      let eventCount = 0;
      element.addEventListener("game-action", () => {
        eventCount++;
      });

      const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
      await actionPanel.updateComplete;
      const checkButton = findButtonByText(actionPanel.shadowRoot, "Check");
      checkButton.click();

      // Should receive exactly one event, not two
      expect(eventCount).to.equal(1);
    });
  });

  describe("settings", () => {
    it("shows settings button", async () => {
      element.game = createMockGameState();
      await element.updateComplete;

      const settingsBtn = element.shadowRoot.querySelector("#settings-btn");
      expect(settingsBtn).to.exist;
    });

    it("opens settings modal when settings button clicked", async () => {
      element.game = createMockGameState();
      await element.updateComplete;

      const settingsBtn = element.shadowRoot.querySelector("#settings-btn");
      settingsBtn.click();
      await element.updateComplete;

      const modal = element.shadowRoot.querySelector("phg-modal");
      expect(modal).to.exist;
    });

    it("settings modal contains name input", async () => {
      element.game = createMockGameState();
      element.showSettings = true;
      await element.updateComplete;

      const input = element.shadowRoot.querySelector("#name-input");
      expect(input).to.exist;
      expect(input.getAttribute("placeholder")).to.include("name");
    });

    it("closes modal when cancel button clicked", async () => {
      element.game = createMockGameState();
      element.showSettings = true;
      await element.updateComplete;

      const cancelBtn = element.shadowRoot.querySelector(
        'phg-button[variant="secondary"]',
      );
      cancelBtn.click();
      await element.updateComplete;

      const modal = element.shadowRoot.querySelector("phg-modal");
      expect(modal).to.not.exist;
    });

    it("closes modal when overlay clicked", async () => {
      element.game = createMockGameState();
      element.showSettings = true;
      await element.updateComplete;

      const modal = element.shadowRoot.querySelector("phg-modal");
      const overlay = modal.shadowRoot.querySelector(".overlay");
      overlay.click();
      await element.updateComplete;

      const closedModal = element.shadowRoot.querySelector("phg-modal");
      expect(closedModal).to.not.exist;
    });

    it("sends update-user event when save button clicked", async () => {
      element.game = createMockGameState({
        seats: [
          { ...mockOccupiedSeat, isCurrentPlayer: true },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 1 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 2 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 3 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 4 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 5 }] },
        ],
      });
      element.showSettings = true;
      await element.updateComplete;

      let sentMessage = null;
      element.addEventListener("update-user", (e) => {
        sentMessage = e.detail;
      });

      const input = element.shadowRoot.querySelector("#name-input");
      input.value = "TestPlayer";

      const saveBtn = element.shadowRoot.querySelector(
        'phg-button[variant="success"]',
      );
      saveBtn.click();

      expect(sentMessage).to.exist;
      expect(sentMessage.name).to.equal("TestPlayer");
    });

    it("closes modal after saving", async () => {
      element.game = createMockGameState();
      element.showSettings = true;
      await element.updateComplete;

      const saveBtn = element.shadowRoot.querySelector(
        'phg-button[variant="success"]',
      );
      saveBtn.click();
      await element.updateComplete;

      const modal = element.shadowRoot.querySelector("phg-modal");
      expect(modal).to.not.exist;
    });

    it("pre-fills input with current user name", async () => {
      element.game = createMockGameState();
      element.user = {
        id: "test",
        name: "CurrentName",
        settings: { volume: 0.75 },
      };
      element.showSettings = true;
      await element.updateComplete;

      const input = element.shadowRoot.querySelector("#name-input");
      expect(input.value).to.equal("CurrentName");
    });
  });
});
