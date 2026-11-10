import { fixture, expect, html, waitUntil } from "@open-wc/testing";
import {
  OriginalFetch,
  MockWebSocket,
  createMockGameState,
  mockEmptySeat,
  mockOccupiedSeat,
} from "./setup.js";
import { createMockUser } from "./app-test-helpers.js";
import { showToast } from "../../src/frontend/app-toasts.js";
import "../../src/frontend/app.js";

/**
 * A view where the viewer sits at seat 0 and `actingSeat` acts.
 * @param {number} actingSeat
 */
function viewWithActingSeat(actingSeat) {
  return createMockGameState({
    hand: { phase: "preflop", collectedPot: 0, currentBet: 0, actingSeat },
    seats: [
      mockOccupiedSeat,
      { ...mockOccupiedSeat, isCurrentPlayer: false },
      mockEmptySeat,
    ],
  });
}

describe("phg-app away from the table", () => {
  let element;
  let socket;

  beforeEach(async () => {
    MockWebSocket.instances = [];
    globalThis.fetch = async (url) =>
      url.match(/\/api\/users\/me$/)
        ? { ok: true, json: async () => createMockUser() }
        : { ok: false };
    history.replaceState({}, "", "/cash/testgame");
    element = await fixture(html`<phg-app></phg-app>`);
    await waitUntil(() => MockWebSocket.instances.length > 0, {
      timeout: 2000,
    });
    socket = MockWebSocket.instances.at(-1);
  });

  afterEach(() => {
    globalThis.fetch = OriginalFetch;
    history.replaceState({}, "", "/");
    MockWebSocket.instances = [];
  });

  async function showView(view) {
    socket.simulateMessage(view);
    await element.updateComplete;
  }

  for (const path of ["/avatar", "/history/testgame"]) {
    it(`stays connected to the table at ${path}`, async () => {
      element.path = path;
      await element.updateComplete;
      expect(socket.readyState).to.equal(MockWebSocket.OPEN);
      expect(MockWebSocket.instances.at(-1)).to.equal(socket);

      element.path = "/history/othergame";
      await element.updateComplete;
      expect(socket.readyState).to.equal(MockWebSocket.CLOSED);
    });
  }

  it("shows a turn toast linking back to the table until the turn passes", async () => {
    element.path = "/avatar";
    await showView(viewWithActingSeat(1));
    expect(element.querySelector("phg-toasts .toast")).to.not.exist;

    await showView(viewWithActingSeat(0));
    const toast = element.querySelector("phg-toasts .toast");
    expect(toast.classList.contains("toast--warning")).to.equal(true);
    expect(toast.textContent).to.include("Your turn to act");
    expect(toast.querySelector("a").getAttribute("href")).to.equal(
      "/cash/testgame",
    );

    await showView(viewWithActingSeat(1));
    expect(element.querySelector("phg-toasts .toast")).to.not.exist;
  });

  it("shows the turn toast when leaving the table during the turn", async () => {
    await showView(viewWithActingSeat(0));
    expect(element.querySelector("phg-toasts .toast")).to.not.exist;

    element.path = "/avatar";
    await element.updateComplete;
    expect(element.querySelector("phg-toasts .toast")).to.exist;
  });

  it("keeps the turn toast above other toasts until the turn passes", async () => {
    element.path = "/avatar";
    await showView(viewWithActingSeat(0));
    showToast(element, {
      message: "Unable to save settings",
      variant: "error",
    });
    await element.updateComplete;

    const toastTexts = () =>
      [...element.querySelectorAll("phg-toasts .toast")].map((toast) =>
        toast.textContent.replace(/\s+/g, " ").trim(),
      );
    expect(toastTexts()).to.deep.equal([
      "Your turn to act Back to table",
      "Unable to save settings",
    ]);

    // Clicking around the link does not dismiss it.
    element.querySelector("phg-toasts .toast").click();
    await element.updateComplete;
    expect(toastTexts()[0]).to.include("Your turn to act");
  });

  it("returns to the table from the turn toast", async () => {
    element.path = "/avatar";
    await showView(viewWithActingSeat(0));

    element.querySelector("phg-toasts a").click();
    await waitUntil(() => element.path === "/cash/testgame", {
      timeout: 2000,
    });
    await element.updateComplete;

    expect(element.querySelector("phg-toasts .toast")).to.not.exist;
    expect(MockWebSocket.instances.at(-1)).to.equal(socket);
  });
});
