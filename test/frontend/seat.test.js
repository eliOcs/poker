import { fixture, expect, html } from "@open-wc/testing";
import {
  MockWebSocket,
  createMockGameState,
  createMockGameWithPlayers,
  mockOccupiedSeat,
  mockFoldedSeat,
  mockAllInSeat,
  mockEmptySeat,
  mockSittingOutSeat,
  mockDisconnectedSeat,
  mockOccupiedSeatWithName,
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
      const sitBtn = seat.shadowRoot.querySelector("phg-button");
      if (sitBtn && sitBtn.textContent.trim() === "Sit") sitButtonCount++;
    }
    expect(emptyCount).to.equal(6);
    expect(sitButtonCount).to.equal(6);
  });

  it("displays 'Seat N' fallback when player has no name", async () => {
    element.game = createMockGameWithPlayers();
    await element.updateComplete;

    const seats = element.shadowRoot.querySelectorAll("phg-seat");
    let foundOccupied = false;
    for (const seat of seats) {
      await seat.updateComplete;
      if (!seat.classList.contains("empty")) {
        foundOccupied = true;
        const playerName = seat.shadowRoot.querySelector(".player-name");
        expect(playerName.textContent).to.include("Seat 1");

        const stack = seat.shadowRoot.querySelector(".stack");
        expect(stack.textContent).to.include("1000");
        break;
      }
    }
    expect(foundOccupied).to.be.true;
  });

  it("displays player name when set", async () => {
    element.game = createMockGameState({
      seats: [
        mockOccupiedSeatWithName,
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
    const playerName = seats[0].shadowRoot.querySelector(".player-name");
    expect(playerName.textContent).to.include("Alice");
  });

  it("displays bet indicator on table for players with bets", async () => {
    element.game = createMockGameWithPlayers();
    await element.updateComplete;

    const betIndicators = element.shadowRoot.querySelectorAll(".bet-indicator");
    expect(betIndicators.length).to.be.greaterThan(0);
    expect(betIndicators[0].textContent).to.include("50");
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
    const sitButton = seats[0].shadowRoot.querySelector("phg-button");
    sitButton.click();

    expect(element.socket.sent.length).to.equal(1);
    expect(element.socket.sent[0].action).to.equal("sit");
    expect(element.socket.sent[0].seat).to.be.a("number");
  });

  it("displays lastAction when set (check, call, bet, raise)", async () => {
    element.game = createMockGameState({
      seats: [
        { ...mockOccupiedSeat, lastAction: "check" },
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
    const lastAction = seats[0].shadowRoot.querySelector(".last-action");
    expect(lastAction).to.exist;
    expect(lastAction.textContent.toLowerCase()).to.include("check");
  });

  it("does not display lastAction when folded", async () => {
    element.game = createMockGameState({
      seats: [
        { ...mockFoldedSeat, lastAction: "fold" },
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
    const lastAction = seats[0].shadowRoot.querySelector(".last-action");
    expect(lastAction).to.not.exist;
    // But FOLDED status label should still show
    const statusLabel = seats[0].shadowRoot.querySelector(".status-label");
    expect(statusLabel.textContent).to.include("FOLDED");
  });

  it("does not display lastAction when all-in", async () => {
    element.game = createMockGameState({
      seats: [
        { ...mockAllInSeat, lastAction: "all-in" },
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
    const lastAction = seats[0].shadowRoot.querySelector(".last-action");
    expect(lastAction).to.not.exist;
    // But ALL-IN status label should still show
    const statusLabel = seats[0].shadowRoot.querySelector(".status-label");
    expect(statusLabel.textContent).to.include("ALL-IN");
  });

  it("displays handResult when player won", async () => {
    element.game = createMockGameState({
      seats: [
        { ...mockOccupiedSeat, handResult: 150 },
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
    const handResult = seats[0].shadowRoot.querySelector(".hand-result");
    expect(handResult).to.exist;
    expect(handResult.textContent).to.include("+$150");
    expect(handResult.classList.contains("won")).to.be.true;
  });

  it("displays handResult when player lost", async () => {
    element.game = createMockGameState({
      seats: [
        { ...mockOccupiedSeat, handResult: -100 },
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
    const handResult = seats[0].shadowRoot.querySelector(".hand-result");
    expect(handResult).to.exist;
    expect(handResult.textContent).to.include("-$100");
    expect(handResult.classList.contains("lost")).to.be.true;
  });

  it("displays handResult instead of lastAction when set", async () => {
    element.game = createMockGameState({
      seats: [
        { ...mockOccupiedSeat, lastAction: "bet", handResult: 50 },
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
    const handResult = seats[0].shadowRoot.querySelector(".hand-result");
    const lastAction = seats[0].shadowRoot.querySelector(".last-action");
    expect(handResult).to.exist;
    expect(lastAction).to.not.exist;
  });

  it("displays handResult instead of FOLDED status when set", async () => {
    element.game = createMockGameState({
      seats: [
        { ...mockFoldedSeat, handResult: -50 },
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
    const handResult = seats[0].shadowRoot.querySelector(".hand-result");
    const statusLabel = seats[0].shadowRoot.querySelector(".status-label");
    expect(handResult).to.exist;
    expect(handResult.textContent).to.include("-$50");
    expect(statusLabel).to.not.exist;
  });

  it("applies .sitting-out class when seat.sittingOut is true", async () => {
    element.game = createMockGameState({
      seats: [
        mockSittingOutSeat,
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
    expect(seats[0].classList.contains("sitting-out")).to.be.true;
  });

  it("displays SITTING OUT status label when sittingOut is true", async () => {
    element.game = createMockGameState({
      seats: [
        mockSittingOutSeat,
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
    const statusLabel = seats[0].shadowRoot.querySelector(".status-label");
    expect(statusLabel).to.exist;
    expect(statusLabel.textContent).to.include("SITTING OUT");
  });

  it("displays SITTING OUT instead of lastAction when sittingOut", async () => {
    element.game = createMockGameState({
      seats: [
        { ...mockSittingOutSeat, lastAction: "check" },
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
    const lastAction = seats[0].shadowRoot.querySelector(".last-action");
    const statusLabel = seats[0].shadowRoot.querySelector(".status-label");
    expect(lastAction).to.not.exist;
    expect(statusLabel).to.exist;
    expect(statusLabel.textContent).to.include("SITTING OUT");
  });

  it("applies .disconnected class when seat.disconnected is true", async () => {
    element.game = createMockGameState({
      seats: [
        mockDisconnectedSeat,
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
    expect(seats[0].classList.contains("disconnected")).to.be.true;
  });

  it("displays DISCONNECTED status label when disconnected is true", async () => {
    element.game = createMockGameState({
      seats: [
        mockDisconnectedSeat,
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
    const statusLabel = seats[0].shadowRoot.querySelector(".status-label");
    expect(statusLabel).to.exist;
    expect(statusLabel.textContent).to.include("DISCONNECTED");
  });

  it("displays DISCONNECTED instead of SITTING OUT when both are true", async () => {
    element.game = createMockGameState({
      seats: [
        { ...mockDisconnectedSeat, sittingOut: true },
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
    const statusLabel = seats[0].shadowRoot.querySelector(".status-label");
    expect(statusLabel).to.exist;
    expect(statusLabel.textContent).to.include("DISCONNECTED");
    expect(statusLabel.textContent).to.not.include("SITTING OUT");
  });

  it("does not apply .disconnected class when disconnected is false", async () => {
    element.game = createMockGameState({
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
    expect(seats[0].classList.contains("disconnected")).to.be.false;
  });
});
