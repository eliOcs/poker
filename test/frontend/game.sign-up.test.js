import { fixture, expect, html, oneEvent } from "@open-wc/testing";
import {
  OriginalWebSocket,
  MockWebSocket,
  createMockGameState,
} from "./setup.js";
import "../../src/frontend/index.js";

describe("phg-game sign up", () => {
  let element;

  beforeEach(async () => {
    element = await fixture(html`<phg-game game-id="test123"></phg-game>`);
    element.game = createMockGameState();
  });

  afterEach(() => {
    globalThis.WebSocket = MockWebSocket;
  });

  after(() => {
    globalThis.WebSocket = OriginalWebSocket;
  });

  it("requests the shared sign-up modal when sign-up is clicked", async () => {
    await element.updateComplete;

    const openSignUp = oneEvent(element, "open-sign-up");
    const signUpBtn = Array.from(element.querySelectorAll("button")).find(
      (button) => button.textContent.includes("Sign up"),
    );
    signUpBtn.click();
    const event = await openSignUp;

    expect(event.type).to.equal("open-sign-up");
    expect(element.querySelector("phg-modal")).to.not.exist;
  });
});
