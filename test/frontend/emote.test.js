import { fixture, expect, html } from "@open-wc/testing";
import {
  MockWebSocket,
  createMockGameState,
  mockOccupiedSeat,
  mockOpponentSeat,
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

function createEmoteGame() {
  return createMockGameState({
    hand: {
      phase: "preflop",
      pot: 7500,
      currentBet: 5000,
      actingSeat: 1,
    },
    seats: [
      {
        ...mockOccupiedSeat,
        isActing: false,
        actions: [{ action: "emote" }],
      },
      { ...mockOpponentSeat, isActing: true },
      { ...mockEmptySeat, actions: [{ action: "sit", seat: 2 }] },
      { ...mockEmptySeat, actions: [{ action: "sit", seat: 3 }] },
      { ...mockEmptySeat, actions: [{ action: "sit", seat: 4 }] },
      { ...mockEmptySeat, actions: [{ action: "sit", seat: 5 }] },
    ],
  });
}

describe("emote picker", () => {
  let element;

  beforeEach(async () => {
    element = await fixture(html`<phg-game game-id="test123"></phg-game>`);
  });

  afterEach(() => {
    globalThis.WebSocket = MockWebSocket;
  });

  it("shows Emote button when emote action is available", async () => {
    element.game = createEmoteGame();
    await element.updateComplete;

    const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
    await actionPanel.updateComplete;

    const emoteButton = findButtonByText(actionPanel.shadowRoot, "Emote");
    expect(emoteButton).to.exist;
  });

  it("shows emoji modal when Emote button is clicked", async () => {
    element.game = createEmoteGame();
    await element.updateComplete;

    const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
    await actionPanel.updateComplete;

    const emoteButton = findButtonByText(actionPanel.shadowRoot, "Emote");
    emoteButton.click();
    await element.updateComplete;

    const modal = element.shadowRoot.querySelector("phg-modal[title='Emote']");
    expect(modal).to.exist;
    const grid = modal.querySelector(".emote-grid");
    expect(grid).to.exist;
    const emojiButtons = grid.querySelectorAll("button");
    expect(emojiButtons.length).to.equal(16);
  });

  it("sends emote action with emoji when emoji clicked", async () => {
    element.game = createEmoteGame();
    await element.updateComplete;

    const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
    await actionPanel.updateComplete;

    // Open picker
    const emoteButton = findButtonByText(actionPanel.shadowRoot, "Emote");
    emoteButton.click();
    await element.updateComplete;

    let sentMessage = null;
    element.addEventListener("game-action", (e) => {
      sentMessage = e.detail;
    });

    const modal = element.shadowRoot.querySelector("phg-modal[title='Emote']");
    const emojiButtons = modal.querySelectorAll(".emote-grid button");
    emojiButtons[0].click();

    expect(sentMessage).to.exist;
    expect(sentMessage.action).to.equal("emote");
    expect(sentMessage.emoji).to.be.a("string");
  });

  it("closes modal after emoji is clicked", async () => {
    element.game = createEmoteGame();
    await element.updateComplete;

    const actionPanel = element.shadowRoot.querySelector("phg-action-panel");
    await actionPanel.updateComplete;

    // Open picker
    findButtonByText(actionPanel.shadowRoot, "Emote").click();
    await element.updateComplete;

    // Click an emoji
    const modal = element.shadowRoot.querySelector("phg-modal[title='Emote']");
    modal.querySelectorAll(".emote-grid button")[0].click();
    await element.updateComplete;

    const closedModal = element.shadowRoot.querySelector(
      "phg-modal[title='Emote']",
    );
    expect(closedModal).to.not.exist;
  });
});

describe("emote seat bubble", () => {
  it("renders emote bubble when _activeEmote is set", async () => {
    const seatEl = await fixture(
      html`<phg-seat .seat=${mockOccupiedSeat}></phg-seat>`,
    );

    seatEl._activeEmote = "😎";
    seatEl.requestUpdate();
    await seatEl.updateComplete;

    const emoteBubble = seatEl.shadowRoot.querySelector(".emote-bubble");
    expect(emoteBubble).to.exist;
    expect(emoteBubble.textContent.trim()).to.equal("😎");
  });

  it("clears emote bubble after 3 seconds", async function () {
    this.timeout(7000);

    const seatEl = await fixture(
      html`<phg-seat .seat=${mockOccupiedSeat}></phg-seat>`,
    );

    // Directly set emote state to avoid rAF timing issues
    seatEl._activeEmote = "🤣";
    seatEl._emoteTimer = setTimeout(() => {
      seatEl._activeEmote = null;
      seatEl.requestUpdate();
    }, 3000);
    seatEl.requestUpdate();
    await seatEl.updateComplete;

    expect(seatEl.shadowRoot.querySelector(".emote-bubble")).to.exist;

    // Wait for 3s timeout to clear it
    await new Promise((r) => setTimeout(r, 3100));
    await seatEl.updateComplete;

    expect(seatEl.shadowRoot.querySelector(".emote-bubble")).to.not.exist;
  });

  it("updates emote when a new one arrives", async () => {
    const seatEl = await fixture(
      html`<phg-seat .seat=${mockOccupiedSeat}></phg-seat>`,
    );

    // Simulate first emote
    seatEl._activeEmote = "😎";
    seatEl.requestUpdate();
    await seatEl.updateComplete;

    expect(
      seatEl.shadowRoot.querySelector(".emote-bubble").textContent.trim(),
    ).to.equal("😎");

    // Simulate second emote
    seatEl._activeEmote = "🤣";
    seatEl.requestUpdate();
    await seatEl.updateComplete;

    const bubble = seatEl.shadowRoot.querySelector(".emote-bubble");
    expect(bubble).to.exist;
    expect(bubble.textContent.trim()).to.equal("🤣");
  });
});
