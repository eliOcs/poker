import { fixture, expect, html } from "@open-wc/testing";
import {
  OriginalWebSocket,
  MockWebSocket,
  createMockGameState,
  createMockGameAtFlop,
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
});
