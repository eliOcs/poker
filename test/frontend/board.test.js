import { fixture, expect, html } from "@open-wc/testing";
import {
  MockWebSocket,
  createMockGameState,
  createMockGameAtFlop,
} from "./setup.js";

describe("phg-board", () => {
  let element;

  beforeEach(async () => {
    element = await fixture(html`<phg-game game-id="test123"></phg-game>`);
  });

  afterEach(() => {
    globalThis.WebSocket = MockWebSocket;
  });

  it('shows "WAITING" phase when waiting', async () => {
    element.game = createMockGameState();
    await element.updateComplete;

    const board = element.shadowRoot.querySelector("phg-board");
    await board.updateComplete;
    const phase = board.shadowRoot.querySelector(".phase");
    expect(phase.textContent.toLowerCase()).to.include("waiting");
  });

  it("shows phase indicator during hand", async () => {
    element.game = createMockGameAtFlop();
    await element.updateComplete;

    const board = element.shadowRoot.querySelector("phg-board");
    await board.updateComplete;
    const phase = board.shadowRoot.querySelector(".phase");
    expect(phase.textContent.toLowerCase()).to.include("flop");
  });

  it("displays community cards when present", async () => {
    element.game = createMockGameAtFlop();
    await element.updateComplete;

    const board = element.shadowRoot.querySelector("phg-board");
    await board.updateComplete;
    const cardElements = board.shadowRoot.querySelectorAll("phg-card");
    expect(cardElements.length).to.equal(3);
  });

  it("shows no cards when board is empty", async () => {
    element.game = createMockGameState();
    await element.updateComplete;

    const board = element.shadowRoot.querySelector("phg-board");
    await board.updateComplete;
    const cardElements = board.shadowRoot.querySelectorAll("phg-card");
    expect(cardElements.length).to.equal(0);
  });

  it("shows pot amount", async () => {
    element.game = createMockGameAtFlop();
    await element.updateComplete;

    const board = element.shadowRoot.querySelector("phg-board");
    await board.updateComplete;
    const pot = board.shadowRoot.querySelector(".pot");
    expect(pot.textContent).to.include("200");
  });
});
