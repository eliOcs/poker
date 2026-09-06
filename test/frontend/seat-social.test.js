import { fixture, expect, html } from "@open-wc/testing";
import { mockOccupiedSeat } from "./setup.js";

describe("seat social animations and tab visibility", () => {
  let seat;
  let visibility;
  let originalVisibility;
  let originalRequestFrame;
  let originalCancelFrame;
  let frames;

  beforeEach(async () => {
    seat = await fixture(html`<phg-seat .seat=${mockOccupiedSeat}></phg-seat>`);
    visibility = "visible";
    originalVisibility = Object.getOwnPropertyDescriptor(
      document,
      "visibilityState",
    );
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => visibility,
    });
    originalRequestFrame = globalThis.requestAnimationFrame;
    originalCancelFrame = globalThis.cancelAnimationFrame;
    frames = new Map();
    let frameId = 0;
    globalThis.requestAnimationFrame = (callback) => {
      frames.set(++frameId, callback);
      return frameId;
    };
    globalThis.cancelAnimationFrame = (id) => frames.delete(id);
  });

  afterEach(() => {
    seat.remove();
    globalThis.requestAnimationFrame = originalRequestFrame;
    globalThis.cancelAnimationFrame = originalCancelFrame;
    if (originalVisibility) {
      Object.defineProperty(document, "visibilityState", originalVisibility);
    } else {
      delete document.visibilityState;
    }
  });

  function setVisibility(value) {
    visibility = value;
    document.dispatchEvent(new Event("visibilitychange"));
  }

  async function renderFrame() {
    const callbacks = [...frames.values()];
    frames.clear();
    for (const callback of callbacks) callback(performance.now());
    await seat.updateComplete;
  }

  function expectNoBubbles() {
    expect(seat.querySelector(".emote-bubble")).to.not.exist;
    expect(seat.querySelector(".chat-bubble")).to.not.exist;
  }

  it("discards hidden-tab messages and renders fresh messages after returning", async () => {
    setVisibility("hidden");
    for (let i = 0; i < 10; i++) {
      seat.showEmote("😎");
      seat.showChat("Old message");
    }
    setVisibility("visible");
    await renderFrame();
    expectNoBubbles();

    seat.showEmote("🤣");
    seat.showChat("Fresh message");
    await renderFrame();
    expect(seat.querySelector(".emote-bubble").textContent).to.equal("🤣");
    expect(seat.querySelector(".chat-bubble").textContent).to.equal(
      "Fresh message",
    );
  });

  it("clears active bubbles and cancels pending animations when the tab hides", async () => {
    seat.showEmote("😎");
    seat.showChat("Already visible");
    await renderFrame();
    expect(seat.querySelector(".emote-bubble")).to.exist;
    expect(seat.querySelector(".chat-bubble")).to.exist;

    setVisibility("hidden");
    await seat.updateComplete;
    expectNoBubbles();

    setVisibility("visible");
    seat.showEmote("🤯");
    seat.showChat("Pending frame");
    setVisibility("hidden");
    setVisibility("visible");
    await renderFrame();
    expectNoBubbles();
  });

  it("does not replay pending animations when a seat is removed and reattached", async () => {
    seat.showEmote("😎");
    seat.showChat("Old table");
    const parent = seat.parentElement;
    seat.remove();
    parent.append(seat);
    await renderFrame();
    expectNoBubbles();
  });
});
