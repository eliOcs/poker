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
      expect(pot).to.be.null;

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
    it("shows homepage logo link as the first drawer item", async () => {
      element.game = createMockGameState();
      await element.updateComplete;

      const drawer = element.shadowRoot.querySelector("phg-navigation-drawer");
      const drawerNav = drawer.shadowRoot.querySelector("nav");
      const firstItem = drawerNav.firstElementChild;
      expect(firstItem).to.exist;
      expect(firstItem.matches(".home-link")).to.be.true;
      expect(firstItem.getAttribute("href")).to.equal("/");
      expect(firstItem.getAttribute("target")).to.equal("_blank");
      expect(firstItem.getAttribute("rel")).to.equal("noopener noreferrer");
    });

    it("shows settings button", async () => {
      element.game = createMockGameState();
      await element.updateComplete;

      const settingsBtn = Array.from(
        element.shadowRoot.querySelectorAll("button"),
      ).find((button) => button.textContent.includes("Settings"));
      expect(settingsBtn).to.exist;
    });

    it("keeps drawer icons sized and tinted on the game page", async () => {
      element.game = createMockGameState();
      await element.updateComplete;

      const settingsIcon = Array.from(
        element.shadowRoot.querySelectorAll("button"),
      )
        .find((button) => button.textContent.includes("Settings"))
        ?.querySelector("svg");
      expect(settingsIcon).to.exist;

      const styles = getComputedStyle(settingsIcon);
      expect(styles.width).to.equal("20px");
      expect(styles.height).to.equal("20px");
      expect(styles.minWidth).to.equal("20px");
      expect(styles.fill).to.not.equal("rgb(0, 0, 0)");
    });

    it("opens settings modal when settings button clicked", async () => {
      element.game = createMockGameState();
      await element.updateComplete;

      const settingsBtn = Array.from(
        element.shadowRoot.querySelectorAll("button"),
      ).find((button) => button.textContent.includes("Settings"));
      settingsBtn.click();
      await element.updateComplete;

      const modal = element.shadowRoot.querySelector("phg-modal");
      expect(modal).to.exist;
    });

    it("opens sign-in modal when sign-in button clicked", async () => {
      element.game = createMockGameState();
      await element.updateComplete;

      const signInBtn = Array.from(
        element.shadowRoot.querySelectorAll("button"),
      ).find((button) => button.textContent.includes("Sign in"));
      signInBtn.click();
      await element.updateComplete;

      const modal = element.shadowRoot.querySelector("phg-modal");
      expect(modal).to.exist;
      expect(modal.shadowRoot.querySelector("h3").textContent).to.equal(
        "Sign in",
      );
    });

    it("disables rankings and history before the first hand", async () => {
      element.game = createMockGameState({ handNumber: 0 });
      await element.updateComplete;

      const buttons = Array.from(element.shadowRoot.querySelectorAll("button"));
      const rankingsBtn = buttons.find((button) =>
        button.textContent.includes("Rankings"),
      );
      const historyBtn = buttons.find((button) =>
        button.textContent.includes("History"),
      );

      expect(rankingsBtn).to.exist;
      expect(historyBtn).to.exist;
      expect(rankingsBtn.disabled).to.equal(true);
      expect(historyBtn.disabled).to.equal(true);

      let navigated = false;
      element.addEventListener("navigate", () => {
        navigated = true;
      });

      rankingsBtn.click();
      historyBtn.click();
      await element.updateComplete;

      const modal = element.shadowRoot.querySelector("phg-modal");
      expect(modal).to.not.exist;
      expect(navigated).to.equal(false);
    });

    it("settings modal contains name input", async () => {
      element.game = createMockGameState();
      element.showSettings = true;
      await element.updateComplete;

      const input = element.shadowRoot.querySelector("#name-input");
      expect(input).to.exist;
      expect(input.getAttribute("placeholder")).to.include("name");
    });

    it("sign-in modal contains email input and benefit copy", async () => {
      element.game = createMockGameState();
      element.showSignIn = true;
      await element.updateComplete;

      const input = element.shadowRoot.querySelector("#sign-in-email");
      const modalText = element.shadowRoot
        .querySelector("phg-modal")
        .textContent.replace(/\s+/g, " ");

      expect(input).to.exist;
      expect(input.getAttribute("type")).to.equal("email");
      expect(modalText).to.include("one-time sign-in link");
      expect(modalText).to.include("Keep your setup");
      expect(modalText).to.include("Review previous games");
    });

    it("closes modal when cancel button clicked", async () => {
      element.game = createMockGameState();
      element.showSettings = true;
      await element.updateComplete;

      const cancelBtn = element.shadowRoot.querySelector(
        'phg-button[variant="muted"]',
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
        'phg-button[variant="action"]',
      );
      saveBtn.click();

      expect(sentMessage).to.exist;
      expect(sentMessage.name).to.equal("TestPlayer");
    });

    it("closes modal after saving", async () => {
      element.game = createMockGameState();
      element.showSettings = true;
      await element.updateComplete;

      let toast = null;
      element.addEventListener("toast", (e) => {
        toast = e.detail;
      });

      const saveBtn = element.shadowRoot.querySelector(
        'phg-button[variant="action"]',
      );
      saveBtn.click();
      await element.updateComplete;

      const modal = element.shadowRoot.querySelector("phg-modal");
      expect(modal).to.not.exist;
      expect(toast).to.deep.equal({
        message: "Settings saved",
        variant: "success",
      });
    });

    it("dispatches request-sign-in event with the email", async () => {
      element.game = createMockGameState();
      element.showSignIn = true;
      await element.updateComplete;

      let request = null;
      element.addEventListener("request-sign-in", (e) => {
        request = e.detail;
      });

      const input = /** @type {HTMLInputElement} */ (
        element.shadowRoot.querySelector("#sign-in-email")
      );
      input.value = "player@example.com";

      element.requestSignIn();
      await element.updateComplete;

      expect(request).to.deep.equal({ email: "player@example.com" });
      expect(element.shadowRoot.querySelector("phg-modal")).to.not.exist;
    });

    it("marks sign-in email invalid and focuses it when submitted empty", async () => {
      element.game = createMockGameState();
      element.showSignIn = true;
      await element.updateComplete;

      const input = /** @type {HTMLInputElement} */ (
        element.shadowRoot.querySelector("#sign-in-email")
      );

      element.requestSignIn();
      await element.updateComplete;

      expect(element._signInInvalid).to.equal(true);
      expect(input.getAttribute("aria-invalid")).to.equal("true");
      expect(element.shadowRoot.activeElement).to.equal(input);
      expect(element.shadowRoot.querySelector("phg-modal")).to.exist;
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
