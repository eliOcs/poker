import { fixture, expect, html } from "@open-wc/testing";
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

  it("opens sign-up modal when sign-up button clicked", async () => {
    await element.updateComplete;

    const signUpBtn = Array.from(
      element.shadowRoot.querySelectorAll("button"),
    ).find((button) => button.textContent.includes("Sign up"));
    signUpBtn.click();
    await element.updateComplete;

    const modal = element.shadowRoot.querySelector("phg-modal");
    expect(modal).to.exist;
    expect(modal.shadowRoot.querySelector("h3").textContent).to.equal(
      "Sign up",
    );
  });

  it("switches between sign-in and sign-up modals from the footer links", async () => {
    element.showSignIn = true;
    await element.updateComplete;

    let modal = element.shadowRoot.querySelector("phg-modal");
    let switchLink = element.shadowRoot.querySelector(".sign-in-switch-link");
    expect(modal.textContent.replace(/\s+/g, " ")).to.include("New? Sign up");

    switchLink.click();
    await element.updateComplete;

    modal = element.shadowRoot.querySelector("phg-modal");
    await modal.updateComplete;
    expect(modal.shadowRoot.querySelector("h3").textContent).to.equal(
      "Sign up",
    );
    expect(modal.textContent.replace(/\s+/g, " ")).to.include(
      "Have an account? Sign in",
    );

    switchLink = element.shadowRoot.querySelector(".sign-in-switch-link");
    switchLink.click();
    await element.updateComplete;

    modal = element.shadowRoot.querySelector("phg-modal");
    await modal.updateComplete;
    expect(modal.shadowRoot.querySelector("h3").textContent).to.equal(
      "Sign in",
    );
  });

  it("prefills the required name and includes the email input", async () => {
    element.user = {
      id: "test",
      name: "CurrentName",
      settings: { volume: 0.75, vibration: true },
    };
    element.showSignUp = true;
    await element.updateComplete;

    const nameInput = element.shadowRoot.querySelector("#sign-up-name");
    const emailInput = element.shadowRoot.querySelector("#sign-up-email");
    const modalText = element.shadowRoot
      .querySelector("phg-modal")
      .textContent.replace(/\s+/g, " ");

    expect(nameInput).to.exist;
    expect(nameInput.value).to.equal("CurrentName");
    expect(nameInput.hasAttribute("required")).to.equal(true);
    expect(emailInput).to.exist;
    expect(emailInput.getAttribute("type")).to.equal("email");
    expect(modalText).to.include("complete the sign up");
  });

  it("dispatches request-sign-in event with the email and name", async () => {
    element.showSignUp = true;
    await element.updateComplete;

    let request = null;
    element.addEventListener("request-sign-in", (e) => {
      request = e.detail;
    });

    const nameInput = /** @type {HTMLInputElement} */ (
      element.shadowRoot.querySelector("#sign-up-name")
    );
    const emailInput = /** @type {HTMLInputElement} */ (
      element.shadowRoot.querySelector("#sign-up-email")
    );
    nameInput.value = "Table Captain";
    emailInput.value = "player@example.com";

    element.requestSignUp();
    await element.updateComplete;

    expect(request).to.deep.equal({
      email: "player@example.com",
      name: "Table Captain",
    });
    expect(element.shadowRoot.querySelector("phg-modal")).to.not.exist;
  });

  it("marks the name invalid and focuses it when submitted empty", async () => {
    element.showSignUp = true;
    await element.updateComplete;

    const nameInput = /** @type {HTMLInputElement} */ (
      element.shadowRoot.querySelector("#sign-up-name")
    );
    const emailInput = /** @type {HTMLInputElement} */ (
      element.shadowRoot.querySelector("#sign-up-email")
    );
    nameInput.value = "";
    emailInput.value = "player@example.com";

    element.requestSignUp();
    await element.updateComplete;

    expect(element._signUpNameInvalid).to.equal(true);
    expect(nameInput.getAttribute("aria-invalid")).to.equal("true");
    expect(element.shadowRoot.activeElement).to.equal(nameInput);
    expect(element.shadowRoot.querySelector("phg-modal")).to.exist;
  });
});
