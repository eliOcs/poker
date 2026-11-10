import { fixture, expect, html } from "@open-wc/testing";
import {
  MockWebSocket,
  createMockGameState,
  mockFoldedSeat,
  mockEmptySeat,
} from "./setup.js";

describe("phg-seat card choice", () => {
  let element;

  beforeEach(async () => {
    element = await fixture(html`<phg-game game-id="test123"></phg-game>`);
  });

  afterEach(() => {
    globalThis.WebSocket = MockWebSocket;
  });

  it("turns folded cards into show toggles without redealing them", async () => {
    const otherSeats = [1, 2, 3, 4, 5].map((seat) => ({
      ...mockEmptySeat,
      actions: [{ action: "sit", seat }],
    }));
    const folded = { ...mockFoldedSeat, isCurrentPlayer: true };
    element.game = createMockGameState({ seats: [folded, ...otherSeats] });
    await element.updateComplete;
    const seat = element.querySelectorAll("phg-seat")[0];
    await seat.updateComplete;
    const cardsBefore = [...seat.querySelectorAll(".hole-cards phg-card")];

    element.game = createMockGameState({
      seats: [
        { ...folded, cardChoice: { show: [true, false], open: true } },
        ...otherSeats,
      ],
    });
    await element.updateComplete;
    await seat.updateComplete;

    const cards = [...seat.querySelectorAll(".hole-cards phg-card")];
    expect(cards).to.have.length(2);
    cards.forEach((card, index) => {
      expect(card === cardsBefore[index], "card element was replaced").to.be
        .true;
    });
    expect(
      cards.map((card) => card.getAttribute("aria-pressed")),
    ).to.deep.equal(["true", "false"]);

    let sent;
    let settingsRequested = false;
    element.addEventListener("game-action", (event) => {
      sent = event.detail;
    });
    seat.addEventListener("seat-settings", () => {
      settingsRequested = true;
    });
    cards[1].click();
    expect(sent).to.deep.equal({ action: "toggleShowCard", seat: 0, card: 1 });
    expect(settingsRequested).to.be.false;

    // Once settled, the cards still show the choice but no longer toggle.
    element.game = createMockGameState({
      seats: [
        { ...folded, cardChoice: { show: [true, false], open: false } },
        ...otherSeats,
      ],
    });
    await element.updateComplete;
    await seat.updateComplete;
    sent = undefined;
    cards[1].click();
    expect(sent).to.be.undefined;
    expect(cards.map((card) => card.getAttribute("role"))).to.deep.equal([
      null,
      null,
    ]);
    expect(cards[0].classList.contains("card-choice--shown")).to.be.true;
    expect(cards[1].classList.contains("card-choice")).to.be.true;
    expect(cards[1].classList.contains("card-choice--shown")).to.be.false;
    // The card the table did not see turns face down; the shown one stays up.
    expect(cards.map((card) => card.card)).to.deep.equal([
      folded.cards[0],
      "??",
    ]);
  });
});
