import { fixture, expect, html } from "@open-wc/testing";
import {
  MockWebSocket,
  createMockGameState,
  mockOccupiedSeat,
  mockFoldedSeat,
  mockEmptySeat,
  mockSittingOutSeat,
  mockDisconnectedSeat,
  mockBustedSeat,
} from "./setup.js";

describe("phg-seat status", () => {
  let element;

  beforeEach(async () => {
    element = await fixture(html`<phg-game game-id="test123"></phg-game>`);
  });

  afterEach(() => {
    globalThis.WebSocket = MockWebSocket;
  });

  it("displays handResult when player won", async () => {
    element.game = createMockGameState({
      seats: [
        { ...mockOccupiedSeat, handResult: 15000 }, // $150 in cents
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
        { ...mockOccupiedSeat, handResult: -10000 }, // -$100 in cents
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
        { ...mockOccupiedSeat, lastAction: "bet", handResult: 5000 }, // $50 in cents
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
        { ...mockFoldedSeat, handResult: -5000 }, // -$50 in cents
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

  it("applies .busted class when bustedPosition is set", async () => {
    element.game = createMockGameState({
      seats: [
        mockBustedSeat,
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
    expect(seats[0].classList.contains("busted")).to.be.true;
    expect(seats[0].classList.contains("sitting-out")).to.be.false;
  });

  it("displays busted position as status label", async () => {
    element.game = createMockGameState({
      seats: [
        mockBustedSeat,
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
    expect(statusLabel.textContent).to.include("3rd");
  });

  it("displays busted position even when handResult is set", async () => {
    element.game = createMockGameState({
      seats: [
        { ...mockBustedSeat, handResult: -10000 },
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
    expect(statusLabel.textContent).to.include("3rd");
  });
});
