import { fixture, expect, html } from "@open-wc/testing";
import {
  mockOhhHand,
  mockOhhHandWithShowdown,
  createMockHandList,
} from "./setup.js";

describe("phg-history", () => {
  let element;

  describe("loading state", () => {
    it("shows loading message initially", async () => {
      // Mock fetch to return a pending promise so loading state persists
      const originalFetch = globalThis.fetch;
      globalThis.fetch = () => new Promise(() => {}); // Never resolves

      try {
        element = await fixture(
          html`<phg-history .gameId=${"test123"}></phg-history>`,
        );

        const loading = element.shadowRoot.querySelector(".loading");
        expect(loading).to.exist;
        expect(loading.textContent).to.include("Loading");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("empty state", () => {
    it("shows empty message when no hands recorded", async () => {
      element = await fixture(
        html`<phg-history .gameId=${"test123"}></phg-history>`,
      );

      // Simulate loaded state with empty hand list
      element.loading = false;
      element.handList = [];
      await element.updateComplete;

      const empty = element.shadowRoot.querySelector(".empty");
      expect(empty).to.exist;
      expect(empty.textContent).to.include("No hands recorded");
    });

    it("shows back link in empty state", async () => {
      element = await fixture(
        html`<phg-history .gameId=${"test123"}></phg-history>`,
      );

      element.loading = false;
      element.handList = [];
      await element.updateComplete;

      const backLink = element.shadowRoot.querySelector(".back-link");
      expect(backLink).to.exist;
    });
  });

  describe("error state", () => {
    it("shows error message", async () => {
      element = await fixture(
        html`<phg-history .gameId=${"test123"}></phg-history>`,
      );

      element.loading = false;
      element.error = "Failed to load hand history";
      await element.updateComplete;

      const error = element.shadowRoot.querySelector(".error");
      expect(error).to.exist;
      expect(error.textContent).to.include("Failed to load");
    });
  });

  describe("hand display", () => {
    beforeEach(async () => {
      element = await fixture(
        html`<phg-history
          .gameId=${"test123"}
          .handNumber=${1}
          .playerId=${"player1"}
        ></phg-history>`,
      );

      // Simulate loaded state with hand data
      element.loading = false;
      element.handList = createMockHandList();
      element.hand = mockOhhHand;
      element.handNumber = 1;
      await element.updateComplete;
    });

    it("renders table state with players", async () => {
      const seats = element.shadowRoot.querySelectorAll("phg-seat");
      expect(seats.length).to.equal(2);
    });

    it("shows player names", async () => {
      const seats = element.shadowRoot.querySelectorAll("phg-seat");
      const names = [];
      for (const seat of seats) {
        await seat.updateComplete;
        const nameEl = seat.shadowRoot.querySelector(".player-name");
        if (nameEl) names.push(nameEl.textContent.trim());
      }
      // player1 is current player so shown as "Alice (you)", player2 is "Bob"
      expect(names).to.include("Alice (you)");
      expect(names).to.include("Bob");
    });

    it("highlights winner with winning class", async () => {
      const winners = element.shadowRoot.querySelectorAll(
        ".player-seat.winner",
      );
      expect(winners.length).to.be.greaterThan(0);
    });

    it("shows pot amount", async () => {
      const board = element.shadowRoot.querySelector("phg-board");
      await board.updateComplete;
      const potInfo = board.shadowRoot.querySelector(".pot");
      expect(potInfo).to.exist;
      expect(potInfo.textContent).to.include("400");
    });

    it("renders board cards when present", async () => {
      element.hand = mockOhhHandWithShowdown;
      await element.updateComplete;

      const board = element.shadowRoot.querySelector("phg-board");
      await board.updateComplete;
      const communityCards = board.shadowRoot.querySelector(".community-cards");
      expect(communityCards).to.exist;

      const cards = communityCards.querySelectorAll("phg-card");
      expect(cards.length).to.be.greaterThan(0);
    });

    it("handles preflop fold with no board cards", async () => {
      // Create hand without board cards (fold preflop)
      element.hand = {
        ...mockOhhHand,
        rounds: [mockOhhHand.rounds[0]], // Only preflop
      };
      await element.updateComplete;

      const board = element.shadowRoot.querySelector("phg-board");
      await board.updateComplete;
      const communityCards = board.shadowRoot.querySelector(".community-cards");
      const cards = communityCards.querySelectorAll("phg-card");
      expect(cards.length).to.equal(0);
    });
  });

  describe("action timeline", () => {
    beforeEach(async () => {
      element = await fixture(
        html`<phg-history
          .gameId=${"test123"}
          .handNumber=${1}
          .playerId=${"player1"}
        ></phg-history>`,
      );

      element.loading = false;
      element.handList = createMockHandList();
      element.hand = mockOhhHand;
      element.handNumber = 1;
      await element.updateComplete;
    });

    it("renders street headers", async () => {
      const streetHeaders =
        element.shadowRoot.querySelectorAll(".street-header");
      const streets = Array.from(streetHeaders).map((h) =>
        h.textContent.trim(),
      );
      expect(streets).to.include("Preflop");
      expect(streets).to.include("Flop");
    });

    it("shows actions for each street", async () => {
      const actionItems = element.shadowRoot.querySelectorAll(".action-item");
      expect(actionItems.length).to.be.greaterThan(0);
    });

    it("filters out Dealt Cards actions", async () => {
      const actionItems = element.shadowRoot.querySelectorAll(".action-item");
      const actions = Array.from(actionItems).map((a) => a.textContent);
      const hasDealtCards = actions.some((a) => a.includes("Dealt Cards"));
      expect(hasDealtCards).to.be.false;
    });

    it("shows action amounts", async () => {
      const amounts = element.shadowRoot.querySelectorAll(".action-amount");
      expect(amounts.length).to.be.greaterThan(0);
    });

    it("highlights current player as 'You'", async () => {
      const youLabels =
        element.shadowRoot.querySelectorAll(".action-player.you");
      expect(youLabels.length).to.be.greaterThan(0);
      expect(youLabels[0].textContent.trim()).to.equal("You");
    });

    it("shows street cards on Flop/Turn/River", async () => {
      element.hand = mockOhhHandWithShowdown;
      await element.updateComplete;

      const streetCards = element.shadowRoot.querySelectorAll(".street-cards");
      expect(streetCards.length).to.be.greaterThan(0);
    });

    it("renders showdown actions", async () => {
      element.hand = mockOhhHandWithShowdown;
      await element.updateComplete;

      const streetHeaders =
        element.shadowRoot.querySelectorAll(".street-header");
      const streets = Array.from(streetHeaders).map((h) =>
        h.textContent.trim(),
      );
      expect(streets).to.include("Showdown");
    });
  });

  describe("hand list sidebar", () => {
    beforeEach(async () => {
      element = await fixture(
        html`<phg-history
          .gameId=${"test123"}
          .handNumber=${1}
          .playerId=${"player1"}
        ></phg-history>`,
      );

      element.loading = false;
      element.handList = createMockHandList();
      element.hand = mockOhhHand;
      element.handNumber = 1;
      await element.updateComplete;
    });

    it("renders hand list items", async () => {
      const handItems = element.shadowRoot.querySelectorAll(".hand-item");
      expect(handItems.length).to.equal(3);
    });

    it("shows hand count in header", async () => {
      const header = element.shadowRoot.querySelector(".sidebar-header");
      expect(header.textContent).to.include("3");
    });

    it("highlights active hand", async () => {
      const activeItem = element.shadowRoot.querySelector(".hand-item.active");
      expect(activeItem).to.exist;
    });

    it("highlights winning hands with winner class", async () => {
      const winnerItems =
        element.shadowRoot.querySelectorAll(".hand-item.winner");
      expect(winnerItems.length).to.equal(2); // hands 1 and 3 are winners
    });

    it("shows 'You' for won hands", async () => {
      const youLabels = element.shadowRoot.querySelectorAll(".hand-winner.you");
      expect(youLabels.length).to.be.greaterThan(0);
    });

    it("shows pot amounts", async () => {
      const pots = element.shadowRoot.querySelectorAll(".hand-pot");
      expect(pots.length).to.equal(3);
    });

    it("shows hole cards for each hand", async () => {
      const handCards = element.shadowRoot.querySelectorAll(".hand-cards");
      expect(handCards.length).to.equal(3);
    });

    it("has back button in sidebar header", async () => {
      const backBtn = element.shadowRoot.querySelector(".sidebar-back");
      expect(backBtn).to.exist;
    });
  });

  describe("navigation", () => {
    beforeEach(async () => {
      element = await fixture(
        html`<phg-history
          .gameId=${"test123"}
          .handNumber=${2}
          .playerId=${"player1"}
        ></phg-history>`,
      );

      element.loading = false;
      element.handList = createMockHandList();
      element.hand = mockOhhHand;
      element.handNumber = 2;
      await element.updateComplete;
    });

    it("updates handNumber when clicking hand item", async () => {
      const handItems = element.shadowRoot.querySelectorAll(".hand-item");
      handItems[0].click();

      expect(element.handNumber).to.equal(1);
    });

    it("dispatches close and navigate events on goBack", async () => {
      let closeEvent = null;
      let navigateEvent = null;
      element.addEventListener("close", (e) => {
        closeEvent = e;
      });
      element.addEventListener("navigate", (e) => {
        navigateEvent = e;
      });

      const backBtn = element.shadowRoot.querySelector(".sidebar-back");
      backBtn.click();

      expect(closeEvent).to.exist;
      expect(navigateEvent).to.exist;
      expect(navigateEvent.detail.path).to.equal("/games/test123");
    });

    it("updates handNumber to previous hand with navigatePrev", async () => {
      element.navigatePrev();

      expect(element.handNumber).to.equal(1);
    });

    it("updates handNumber to next hand with navigateNext", async () => {
      element.navigateNext();

      expect(element.handNumber).to.equal(3);
    });

    it("does not change handNumber when at first hand", async () => {
      element.handNumber = 1;
      await element.updateComplete;

      element.navigatePrev();

      expect(element.handNumber).to.equal(1);
    });

    it("does not change handNumber when at last hand", async () => {
      element.handNumber = 3;
      await element.updateComplete;

      element.navigateNext();

      expect(element.handNumber).to.equal(3);
    });

    it("fetches new hand data when handNumber changes", async () => {
      // Create a different mock hand for hand #1
      const mockHand1 = {
        ...mockOhhHand,
        game_number: "test123-1",
        players: [
          { id: "player1", seat: 3, name: "Charlie", starting_stack: 500 },
          { id: "player2", seat: 5, name: "Dana", starting_stack: 500 },
        ],
      };

      // Mock fetch to return different data for hand #1
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url) => {
        if (url === "/api/history/test123/1") {
          return {
            ok: true,
            json: async () => ({ hand: mockHand1 }),
          };
        }
        return { ok: false };
      };

      try {
        // Change handNumber from 2 to 1
        element.handNumber = 1;
        await element.updateComplete;

        // Wait for fetch to complete
        await new Promise((r) => setTimeout(r, 10));
        await element.updateComplete;

        // Verify the hand data was updated
        expect(element.hand.players[0].name).to.equal("Charlie");
        expect(element.hand.players[1].name).to.equal("Dana");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("mobile nav bar", () => {
    beforeEach(async () => {
      element = await fixture(
        html`<phg-history
          .gameId=${"test123"}
          .handNumber=${1}
          .playerId=${"player1"}
        ></phg-history>`,
      );

      element.loading = false;
      element.handList = createMockHandList();
      element.hand = mockOhhHand;
      element.handNumber = 1;
      await element.updateComplete;
    });

    it("renders nav bar", async () => {
      const navBar = element.shadowRoot.querySelector(".nav-bar");
      expect(navBar).to.exist;
    });

    it("shows hole cards in nav bar", async () => {
      const navCards = element.shadowRoot.querySelector(".nav-cards");
      expect(navCards).to.exist;

      const cards = navCards.querySelectorAll("phg-card");
      expect(cards.length).to.equal(2);
    });

    it("shows winner info in nav bar", async () => {
      const navResult = element.shadowRoot.querySelector(".nav-result");
      expect(navResult).to.exist;
    });

    it("shows 'You won' when current player won", async () => {
      const navResult = element.shadowRoot.querySelector(".nav-result.winner");
      expect(navResult).to.exist;
      expect(navResult.textContent).to.include("You won");
    });

    it("shows pot in nav bar", async () => {
      const navPot = element.shadowRoot.querySelector(".nav-pot");
      expect(navPot).to.exist;
      expect(navPot.textContent).to.include("200");
    });

    it("has navigation buttons", async () => {
      const navBtns = element.shadowRoot.querySelectorAll(".nav-btn");
      expect(navBtns.length).to.be.greaterThan(2); // close, prev, next
    });

    it("disables prev button on first hand", async () => {
      const navBtns = element.shadowRoot.querySelectorAll(".nav-btn");
      // Find the prev button (second button after close)
      const prevBtn = navBtns[1];
      expect(prevBtn.disabled).to.be.true;
    });
  });

  describe("card parsing", () => {
    beforeEach(async () => {
      element = await fixture(
        html`<phg-history
          .gameId=${"test123"}
          .handNumber=${1}
          .playerId=${"player1"}
        ></phg-history>`,
      );

      element.loading = false;
      element.handList = createMockHandList();
      element.hand = mockOhhHandWithShowdown;
      element.handNumber = 1;
      await element.updateComplete;
    });

    it("parses OHH card notation correctly", async () => {
      const cards = element.shadowRoot.querySelectorAll("phg-card");
      expect(cards.length).to.be.greaterThan(0);

      // Check that cards are rendered (not hidden)
      let foundVisibleCard = false;
      for (const card of cards) {
        await card.updateComplete;
        const visibleCard = card.shadowRoot.querySelector(".card:not(.hidden)");
        if (visibleCard) foundVisibleCard = true;
      }
      expect(foundVisibleCard).to.be.true;
    });

    it("shows hidden cards as hidden", async () => {
      // Modify hand to have hidden cards (using OHH "??" format)
      element.hand = {
        ...mockOhhHand,
        rounds: [
          {
            ...mockOhhHand.rounds[0],
            actions: mockOhhHand.rounds[0].actions.map((a) =>
              a.action === "Dealt Cards" && a.player_id === "player2"
                ? { ...a, cards: ["??", "??"] }
                : a,
            ),
          },
        ],
      };
      await element.updateComplete;

      // The player cards display should show hidden cards for player2
      const seats = element.shadowRoot.querySelectorAll("phg-seat");
      let foundHidden = false;
      for (const seat of seats) {
        await seat.updateComplete;
        const cards = seat.shadowRoot.querySelectorAll("phg-card");
        for (const card of cards) {
          await card.updateComplete;
          const hiddenCard = card.shadowRoot.querySelector(".card.hidden");
          if (hiddenCard) foundHidden = true;
        }
      }
      expect(foundHidden).to.be.true;
    });
  });
});
