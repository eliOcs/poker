import { fixture, expect, html, oneEvent } from "@open-wc/testing";
import {
  OriginalWebSocket,
  MockWebSocket,
  createMockGameState,
  createMockGameAtFlop,
  createMockTournamentGameState,
} from "./setup.js";

// Helper to find button.button by text content
function findButtonByText(root, text) {
  const buttons = root.querySelectorAll("button.button");
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

      expect(element.textContent).to.include("Loading");
      expect(element.querySelector("#wrapper")).to.exist;
    });

    it("updates UI when game property changes", async () => {
      element.game = createMockGameState();
      await element.updateComplete;

      const board = element.querySelector("phg-board");
      await board.updateComplete;
      let pot = board.querySelector(".pot");
      expect(pot).to.be.null;

      element.game = createMockGameAtFlop();
      await element.updateComplete;
      await board.updateComplete;

      pot = board.querySelector(".pot");
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
    it("uses MTT registration eligibility instead of empty seats", async () => {
      element.game = createMockGameState();
      element.gameKind = "mtt";
      element.tournamentId = "mtt123";
      element.user = { email: "player@example.com", settings: {} };
      element.mttTournament = {
        status: "running",
        tables: [],
        actions: { canRegister: true },
      };
      await element.updateComplete;

      expect(findButtonByText(element, "Sit")).to.be.null;
      const registration = oneEvent(element, "mtt-action");
      findButtonByText(element, "Late Register").click();
      expect((await registration).detail).to.deep.equal({ action: "register" });

      element.mttTournament = {
        status: "running",
        tables: [],
        level: 10,
        actions: { canRegister: false },
      };
      await element.updateComplete;
      expect(findButtonByText(element, "Sit")).to.be.null;
      expect(findButtonByText(element, "Register")).to.be.null;
    });

    it("routes MTT guest registration through the lobby sign-up flow", async () => {
      element.game = createMockGameState();
      element.gameKind = "mtt";
      element.tournamentId = "mtt123";
      element.mttTournament = {
        status: "running",
        tables: [],
        actions: { canRegister: true },
      };
      await element.updateComplete;
      const navigation = oneEvent(element, "navigate");
      findButtonByText(element, "Late Register").click();
      expect((await navigation).detail).to.deep.equal({
        path: "/mtt/mtt123?action=register",
        allowMttLobby: true,
      });
    });

    it("emits only one game-action event per action (no double-send)", async () => {
      element.game = createMockGameState();
      await element.updateComplete;

      let eventCount = 0;
      element.addEventListener("game-action", () => {
        eventCount++;
      });

      // Join through the action panel.
      const panel = element.querySelector("phg-action-panel");
      await panel.updateComplete;
      const sitButton = panel.querySelector("button.button");
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

      const actionPanel = element.querySelector("phg-action-panel");
      await actionPanel.updateComplete;
      const checkButton = findButtonByText(actionPanel, "Check");
      checkButton.click();

      // Should receive exactly one event, not two
      expect(eventCount).to.equal(1);
    });
  });

  describe("settings", () => {
    it("shows homepage logo link as the first drawer item", async () => {
      element.game = createMockGameState();
      await element.updateComplete;

      const drawer = element.querySelector("phg-navigation-drawer");
      const drawerNav = drawer.querySelector("nav");
      const firstItem = drawerNav.firstElementChild;
      expect(firstItem).to.exist;
      expect(firstItem.matches(".drawer-home-link")).to.be.true;
      expect(firstItem.getAttribute("href")).to.equal("/");
      expect(firstItem.getAttribute("target")).to.equal("_blank");
      expect(firstItem.getAttribute("rel")).to.equal("noopener noreferrer");
    });

    it("shows settings button", async () => {
      element.game = createMockGameState();
      await element.updateComplete;

      const settingsBtn = Array.from(element.querySelectorAll("button")).find(
        (button) => button.textContent.includes("Settings"),
      );
      expect(settingsBtn).to.exist;
    });

    it("keeps drawer icons sized and tinted on the game page", async () => {
      element.game = createMockGameState();
      await element.updateComplete;

      const settingsIcon = Array.from(element.querySelectorAll("button"))
        .find((button) => button.textContent.includes("Settings"))
        ?.querySelector("svg");
      expect(settingsIcon).to.exist;

      const styles = getComputedStyle(settingsIcon);
      expect(styles.width).to.equal("20px");
      expect(styles.height).to.equal("20px");
      expect(styles.minWidth).to.equal("20px");
      expect(styles.fill).to.not.equal("rgb(0, 0, 0)");
    });

    it("shows active MTT tables in the drawer and omits rankings", async () => {
      element.gameId = "table1";
      element.gameKind = "mtt";
      element.tournamentId = "mtt123";
      element.game = createMockTournamentGameState();
      element.mttTournament = {
        tables: [
          {
            tableId: "table1",
            tableName: "Table 1",
            playerCount: 6,
            handNumber: 8,
            waiting: false,
            closed: false,
          },
          {
            tableId: "table2",
            tableName: "Table 2",
            playerCount: 5,
            handNumber: 4,
            waiting: false,
            closed: false,
          },
        ],
        currentPlayer: {
          tableId: "table2",
        },
      };
      await element.updateComplete;

      const drawerText = element.textContent;
      expect(drawerText).to.include("Table 1");
      expect(drawerText).to.include("Table 2");
      expect(drawerText).to.not.include("Rankings");
    });

    it("requests the shared settings modal when settings is clicked", async () => {
      element.game = createMockGameState();
      element._mql = { matches: false, removeEventListener() {} };
      element._drawerOpen = true;
      await element.updateComplete;

      const openSettings = oneEvent(element, "open-settings");
      const settingsBtn = Array.from(element.querySelectorAll("button")).find(
        (button) => button.textContent.includes("Settings"),
      );
      settingsBtn.click();
      await openSettings;
      await element.updateComplete;

      expect(element.querySelector("phg-modal")).to.not.exist;
      expect(element._drawerOpen).to.be.false;
    });

    it("requests the shared sign-in modal when sign-in is clicked", async () => {
      element.game = createMockGameState();
      await element.updateComplete;

      const openSignIn = oneEvent(element, "open-sign-in");
      const signInBtn = Array.from(element.querySelectorAll("button")).find(
        (button) => button.textContent.includes("Sign in"),
      );
      signInBtn.click();
      const event = await openSignIn;

      expect(event.type).to.equal("open-sign-in");
      expect(element.querySelector("phg-modal")).to.not.exist;
    });

    it("shows a Profile item when signed in", async () => {
      element.game = createMockGameState();
      element.user = {
        id: "player123",
        email: "player@example.com",
        name: "Elio",
        settings: { volume: 0.75, vibration: true },
      };
      await element.updateComplete;

      const accountLink = Array.from(element.querySelectorAll("a")).find(
        (link) => link.textContent.includes("Profile"),
      );
      expect(accountLink).to.exist;
      expect(accountLink.classList.contains("drawer-account")).to.equal(true);

      const signInBtn = Array.from(element.querySelectorAll("button")).find(
        (button) => button.textContent.includes("Sign in"),
      );
      expect(signInBtn).to.not.exist;
    });

    it("renders the signed-in account item as a profile link in a new tab", async () => {
      element.game = createMockGameState();
      element.user = {
        id: "player123",
        email: "player@example.com",
        name: "Elio",
        settings: { volume: 0.75, vibration: true },
      };
      await element.updateComplete;

      const accountLink = Array.from(element.querySelectorAll("a")).find(
        (link) => link.textContent.includes("Profile"),
      );
      expect(accountLink).to.exist;
      expect(accountLink.getAttribute("href")).to.equal("/players/player123");
      expect(accountLink.getAttribute("target")).to.equal("_blank");
      expect(accountLink.getAttribute("rel")).to.equal("noopener noreferrer");
    });

    it("uses the Profile label when the signed-in player has no name", async () => {
      element.game = createMockGameState();
      element.user = {
        id: "player123",
        email: "player@example.com",
        name: "",
        settings: { volume: 0.75, vibration: true },
      };
      await element.updateComplete;

      const accountLink = Array.from(element.querySelectorAll("a")).find(
        (link) => link.textContent.includes("Profile"),
      );
      expect(accountLink).to.exist;
      expect(accountLink.classList.contains("drawer-account")).to.equal(true);
    });

    it("disables rankings and history before the first hand", async () => {
      element.game = createMockGameState({ handNumber: 0 });
      await element.updateComplete;

      const buttons = Array.from(element.querySelectorAll("button"));
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

      const modal = element.querySelector("phg-modal");
      expect(modal).to.not.exist;
      expect(navigated).to.equal(false);
    });
  });

  describe("turn alerts", () => {
    it("vibrates on turn changes when vibration is enabled", async () => {
      const originalDescriptor = Object.getOwnPropertyDescriptor(
        navigator,
        "vibrate",
      );
      /** @type {number[]} */
      const vibrationCalls = [];
      Object.defineProperty(navigator, "vibrate", {
        configurable: true,
        value: (pattern) => {
          vibrationCalls.push(Number(pattern));
          return true;
        },
      });

      try {
        element.user = {
          id: "player123",
          name: "Elio",
          settings: { volume: 0.75, vibration: true },
        };

        const previousGame = createMockGameAtFlop();
        previousGame.hand = {
          phase: "flop",
          pot: 20000,
          currentBet: 0,
          actingSeat: 1,
        };
        element.game = previousGame;
        await element.updateComplete;

        const currentGame = createMockGameAtFlop();
        currentGame.hand = {
          phase: "flop",
          pot: 20000,
          currentBet: 0,
          actingSeat: 0,
        };
        element.game = currentGame;
        await element.updateComplete;

        expect(vibrationCalls).to.deep.equal([120]);
      } finally {
        if (originalDescriptor) {
          Object.defineProperty(navigator, "vibrate", originalDescriptor);
        } else {
          delete navigator.vibrate;
        }
      }
    });

    it("does not vibrate when vibration is disabled", async () => {
      const originalDescriptor = Object.getOwnPropertyDescriptor(
        navigator,
        "vibrate",
      );
      let vibrationCount = 0;
      Object.defineProperty(navigator, "vibrate", {
        configurable: true,
        value: () => {
          vibrationCount++;
          return true;
        },
      });

      try {
        element.user = {
          id: "player123",
          name: "Elio",
          settings: { volume: 0.75, vibration: false },
        };

        const previousGame = createMockGameAtFlop();
        previousGame.hand = {
          phase: "flop",
          pot: 20000,
          currentBet: 0,
          actingSeat: 1,
        };
        element.game = previousGame;
        await element.updateComplete;

        const currentGame = createMockGameAtFlop();
        currentGame.hand = {
          phase: "flop",
          pot: 20000,
          currentBet: 0,
          actingSeat: 0,
        };
        element.game = currentGame;
        await element.updateComplete;

        expect(vibrationCount).to.equal(0);
      } finally {
        if (originalDescriptor) {
          Object.defineProperty(navigator, "vibrate", originalDescriptor);
        } else {
          delete navigator.vibrate;
        }
      }
    });
  });
});
