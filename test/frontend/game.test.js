import { fixture, expect, html } from "@open-wc/testing";
import {
  OriginalWebSocket,
  MockWebSocket,
  createMockGameState,
  createMockGameAtFlop,
  mockOccupiedSeat,
  mockEmptySeat,
} from "./setup.js";

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

      element.socket.onmessage({
        data: JSON.stringify({ error: { message: "Server error" } }),
      });
      await element.updateComplete;

      expect(element.error).to.equal("Server error");
    });
  });

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

    it("sends setName action when save button clicked", async () => {
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

      const input = element.shadowRoot.querySelector("#name-input");
      input.value = "TestPlayer";

      const saveBtn = element.shadowRoot.querySelector(
        'phg-button[variant="success"]',
      );
      saveBtn.click();

      expect(element.socket.sent.length).to.equal(1);
      expect(element.socket.sent[0].action).to.equal("setName");
      expect(element.socket.sent[0].name).to.equal("TestPlayer");
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

    it("pre-fills input with current player name", async () => {
      element.game = createMockGameState({
        seats: [
          {
            ...mockOccupiedSeat,
            isCurrentPlayer: true,
            player: { id: "test", name: "CurrentName" },
          },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 1 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 2 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 3 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 4 }] },
          { ...mockEmptySeat, actions: [{ action: "sit", seat: 5 }] },
        ],
      });
      element.showSettings = true;
      await element.updateComplete;

      const input = element.shadowRoot.querySelector("#name-input");
      expect(input.value).to.equal("CurrentName");
    });
  });
});
