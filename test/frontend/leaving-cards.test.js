import { fixture, expect, html } from "@open-wc/testing";
import {
  MockWebSocket,
  createMockGameState,
  mockOccupiedSeat,
  mockOpponentSeat,
  mockEmptySeat,
} from "./setup.js";

const winnerMessage = { playerName: "Bob", handRank: "Pair", amount: 500 };

/**
 * A table between hands: the pause runs with the finished hand still on
 * the table, until the server clears it for the last second.
 * @param {{ cards: boolean }} options
 */
function tableBetweenHands({ cards }) {
  const hole = (seat, held) => ({
    ...seat,
    bet: 0,
    cards: cards ? held : [],
    handRank: cards ? seat.handRank : undefined,
  });
  return createMockGameState({
    handNumber: 3,
    board: { cards: cards ? ["Ah", "Kd", "7c"] : [] },
    ...(cards && { winnerMessage }),
    seats: [
      hole({ ...mockOccupiedSeat, isCurrentPlayer: true }, ["As", "Qs"]),
      hole(mockOpponentSeat, ["??", "??"]),
      ...[2, 3, 4, 5].map((seat) => ({
        ...mockEmptySeat,
        actions: [{ action: "sit", seat }],
      })),
    ],
  });
}

/** @param {Element} element */
const holeCards = (element) =>
  [...element.querySelectorAll("phg-seat .hole-cards phg-card")].map(
    (card) => card.card,
  );

/** @param {Element} element */
const boardCards = (element) =>
  [...element.querySelectorAll("phg-board .community-cards phg-card")].map(
    (card) => card.card,
  );

/**
 * Ends an element's leaving animation. Test pages may run in background tabs
 * where animations are held, so the end is dispatched rather than awaited.
 * @param {Element} element
 */
const endLeaving = (element) => {
  element.dispatchEvent(
    new AnimationEvent("animationend", {
      animationName: "leave-table",
      bubbles: true,
    }),
  );
};

describe("leaving cards", () => {
  let element;

  beforeEach(async () => {
    element = await fixture(html`<phg-game game-id="test123"></phg-game>`);
  });

  afterEach(() => {
    globalThis.WebSocket = MockWebSocket;
  });

  it("turns the cleared hand's cards face down, then takes them away", async () => {
    element.game = tableBetweenHands({ cards: true });
    await element.updateComplete;
    const cardsBefore = [...element.querySelectorAll("phg-card")];

    element.game = tableBetweenHands({ cards: false });
    await element.updateComplete;

    // The same card elements turn over, so they flip rather than redeal.
    const cardsLeaving = [...element.querySelectorAll("phg-card")];
    await Promise.all(cardsLeaving.map((card) => card.updateComplete));
    expect(
      cardsLeaving.length === cardsBefore.length &&
        cardsLeaving.every((card, index) => card === cardsBefore[index]),
      "card elements were replaced",
    ).to.be.true;
    expect(holeCards(element)).to.deep.equal(["??", "??", "??", "??"]);
    expect(boardCards(element)).to.deep.equal(["??", "??", "??"]);
    const flipping = element.querySelectorAll(".card-wrapper.flipping");
    expect(flipping).to.have.length(5, "the face-up cards turn over");
    expect(element.querySelectorAll(".hole-cards.leaving")).to.have.length(2);
    const board = element.querySelector("phg-board .board-info");
    expect(board.classList.contains("leaving")).to.be.true;
    expect(board.textContent).to.include("Bob wins!");

    for (const leaving of element.querySelectorAll(".leaving")) {
      endLeaving(leaving);
    }
    await Promise.all(
      [...element.querySelectorAll("phg-seat, phg-board")].map(
        (part) => part.updateComplete,
      ),
    );

    expect(holeCards(element)).to.deep.equal([]);
    expect(boardCards(element)).to.deep.equal([]);
    // The table is simply clear until the next deal.
    const boardInfo = element.querySelector("phg-board .board-info");
    expect(boardInfo.textContent.trim()).to.equal("");
  });

  it("deals the next hand into new cards even if the old ones never left", async () => {
    element.game = tableBetweenHands({ cards: true });
    await element.updateComplete;
    element.game = tableBetweenHands({ cards: false });
    await element.updateComplete;
    const cardsLeaving = [
      ...element.querySelectorAll("phg-seat .hole-cards phg-card"),
    ];

    element.game = tableBetweenHands({ cards: true });
    await element.updateComplete;

    const dealt = [
      ...element.querySelectorAll("phg-seat .hole-cards phg-card"),
    ];
    await Promise.all(dealt.map((card) => card.updateComplete));
    expect(dealt.some((card) => cardsLeaving.includes(card))).to.be.false;
    expect(element.querySelectorAll(".hole-cards .flipping")).to.have.length(0);
    expect(element.querySelectorAll(".hole-cards .dealing")).to.have.length(4);
  });

  it("keeps the cards still while the hand stays on the table", async () => {
    element.game = tableBetweenHands({ cards: true });
    await element.updateComplete;

    element.game = tableBetweenHands({ cards: true });
    await element.updateComplete;

    expect(element.querySelectorAll(".leaving")).to.have.length(0);
  });

  it("deals hole cards one at a time starting left of the button", async () => {
    element.game = { ...tableBetweenHands({ cards: true }), button: 0 };
    await element.updateComplete;

    const delays = [0, 1].map((seat) =>
      [
        ...element.querySelectorAll(
          `phg-seat[data-seat="${seat}"] .hole-cards phg-card`,
        ),
      ].map((card) => card.style.getPropertyValue("--deal-delay")),
    );
    // Seat 1 sits left of the button, so it gets the first card of each round.
    expect(delays).to.deep.equal([
      ["60ms", "180ms"],
      ["0ms", "120ms"],
    ]);
  });
});
