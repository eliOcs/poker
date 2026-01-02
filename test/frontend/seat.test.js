import { fixture, expect, html } from "@open-wc/testing";
import {
  MockWebSocket,
  createMockGameState,
  createMockGameWithPlayers,
  mockOccupiedSeat,
  mockFoldedSeat,
  mockAllInSeat,
  mockEmptySeat,
} from "./setup.js";

describe("phg-seat", () => {
  let element;

  beforeEach(async () => {
    element = await fixture(html`<phg-game game-id="test123"></phg-game>`);
  });

  afterEach(() => {
    globalThis.WebSocket = MockWebSocket;
  });

  it('shows "Empty" and Sit button for empty seats', async () => {
    element.game = createMockGameState();
    await element.updateComplete;

    const seats = element.shadowRoot.querySelectorAll("phg-seat");
    expect(seats.length).to.equal(6);

    let emptyCount = 0;
    let sitButtonCount = 0;
    for (const seat of seats) {
      await seat.updateComplete;
      if (seat.classList.contains("empty")) emptyCount++;
      const sitBtn = seat.shadowRoot.querySelector("button");
      if (sitBtn && sitBtn.textContent.trim() === "Sit") sitButtonCount++;
    }
    expect(emptyCount).to.equal(6);
    expect(sitButtonCount).to.equal(6);
  });

  it("displays player ID, stack, and bet for occupied seats", async () => {
    element.game = createMockGameWithPlayers();
    await element.updateComplete;

    const seats = element.shadowRoot.querySelectorAll("phg-seat");
    let foundOccupied = false;
    for (const seat of seats) {
      await seat.updateComplete;
      if (!seat.classList.contains("empty")) {
        foundOccupied = true;
        const playerName = seat.shadowRoot.querySelector(".player-name");
        expect(playerName.textContent).to.include("test-pla");

        const stack = seat.shadowRoot.querySelector(".stack");
        expect(stack.textContent).to.include("1000");

        const bet = seat.shadowRoot.querySelector(".bet");
        expect(bet.textContent).to.include("50");
        break;
      }
    }
    expect(foundOccupied).to.be.true;
  });

  it("shows dealer button at correct position", async () => {
    element.game = createMockGameState({
      button: 0,
      seats: [
        mockOccupiedSeat,
        { ...mockEmptySeat, actions: [{ action: "sit", seat: 1 }] },
        { ...mockEmptySeat, actions: [{ action: "sit", seat: 2 }] },
        { ...mockEmptySeat, actions: [{ action: "sit", seat: 3 }] },
        { ...mockEmptySeat, actions: [{ action: "sit", seat: 4 }] },
        { ...mockEmptySeat, actions: [{ action: "sit", seat: 5 }] },
      ],
    });
    await element.updateComplete;

    const seats = element.shadowRoot.querySelectorAll("phg-seat");
    await seats[0].updateComplete;
    const dealerButton = seats[0].shadowRoot.querySelector(".dealer-button");
    expect(dealerButton).to.exist;
    expect(dealerButton.textContent.trim()).to.equal("D");
  });

  it("renders hole cards for current player", async () => {
    element.game = createMockGameWithPlayers();
    await element.updateComplete;

    const seats = element.shadowRoot.querySelectorAll("phg-seat");
    let foundCurrentPlayer = false;
    for (const seat of seats) {
      await seat.updateComplete;
      if (seat.classList.contains("current-player")) {
        foundCurrentPlayer = true;
        const cardElements = seat.shadowRoot.querySelectorAll("phg-card");
        let visibleCount = 0;
        for (const cardEl of cardElements) {
          const visibleCard =
            cardEl.shadowRoot.querySelector(".card:not(.hidden)");
          if (visibleCard) visibleCount++;
        }
        expect(visibleCount).to.equal(2);
        break;
      }
    }
    expect(foundCurrentPlayer).to.be.true;
  });

  it("renders hidden cards for opponents", async () => {
    element.game = createMockGameWithPlayers();
    await element.updateComplete;

    const seats = element.shadowRoot.querySelectorAll("phg-seat");
    for (const seat of seats) {
      await seat.updateComplete;
      if (
        !seat.classList.contains("empty") &&
        !seat.classList.contains("current-player")
      ) {
        const cardElements = seat.shadowRoot.querySelectorAll("phg-card");
        let hiddenCount = 0;
        for (const cardEl of cardElements) {
          const hiddenCard = cardEl.shadowRoot.querySelector(".card.hidden");
          if (hiddenCard) hiddenCount++;
        }
        expect(hiddenCount).to.equal(2);
      }
    }
  });

  it("applies .folded class when seat.folded is true", async () => {
    element.game = createMockGameState({
      seats: [
        mockFoldedSeat,
        { ...mockEmptySeat, actions: [{ action: "sit", seat: 1 }] },
        { ...mockEmptySeat, actions: [{ action: "sit", seat: 2 }] },
        { ...mockEmptySeat, actions: [{ action: "sit", seat: 3 }] },
        { ...mockEmptySeat, actions: [{ action: "sit", seat: 4 }] },
        { ...mockEmptySeat, actions: [{ action: "sit", seat: 5 }] },
      ],
    });
    await element.updateComplete;

    const seats = element.shadowRoot.querySelectorAll("phg-seat");
    await seats[0].updateComplete;
    expect(seats[0].classList.contains("folded")).to.be.true;
  });

  it("applies .acting class when seat.isActing is true", async () => {
    element.game = createMockGameWithPlayers();
    await element.updateComplete;

    const seats = element.shadowRoot.querySelectorAll("phg-seat");
    let foundActing = false;
    for (const seat of seats) {
      await seat.updateComplete;
      if (seat.classList.contains("acting")) {
        foundActing = true;
        break;
      }
    }
    expect(foundActing).to.be.true;
  });

  it("applies .all-in class when seat.allIn is true", async () => {
    element.game = createMockGameState({
      seats: [
        mockAllInSeat,
        { ...mockEmptySeat, actions: [{ action: "sit", seat: 1 }] },
        { ...mockEmptySeat, actions: [{ action: "sit", seat: 2 }] },
        { ...mockEmptySeat, actions: [{ action: "sit", seat: 3 }] },
        { ...mockEmptySeat, actions: [{ action: "sit", seat: 4 }] },
        { ...mockEmptySeat, actions: [{ action: "sit", seat: 5 }] },
      ],
    });
    await element.updateComplete;

    const seats = element.shadowRoot.querySelectorAll("phg-seat");
    await seats[0].updateComplete;
    expect(seats[0].classList.contains("all-in")).to.be.true;
  });

  it("applies .current-player class for own seat", async () => {
    element.game = createMockGameWithPlayers();
    await element.updateComplete;

    const seats = element.shadowRoot.querySelectorAll("phg-seat");
    let foundCurrentPlayer = false;
    for (const seat of seats) {
      await seat.updateComplete;
      if (seat.classList.contains("current-player")) {
        foundCurrentPlayer = true;
        break;
      }
    }
    expect(foundCurrentPlayer).to.be.true;
  });

  it("calls send() when Sit button clicked", async () => {
    element.game = createMockGameState();
    await element.updateComplete;

    const seats = element.shadowRoot.querySelectorAll("phg-seat");
    await seats[0].updateComplete;
    const sitButton = seats[0].shadowRoot.querySelector("button");
    sitButton.click();

    expect(element.socket.sent.length).to.equal(1);
    expect(element.socket.sent[0].action).to.equal("sit");
    expect(element.socket.sent[0].seat).to.be.a("number");
  });
});
