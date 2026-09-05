import { fixture, expect, html } from "@open-wc/testing";
import { sendKeys } from "@web/test-runner-commands";
import "../../src/frontend/app-sign-in-modal.js";

describe("phg-app-sign-in-modal", () => {
  it("submits sign up when Enter is pressed in the email input", async () => {
    const modal = await fixture(html`
      <phg-app-sign-in-modal
        mode="sign-up"
        prefill-name="Table Captain"
      ></phg-app-sign-in-modal>
    `);
    let request = null;
    modal.addEventListener("request-sign-in", (event) => {
      request = event.detail;
    });

    const emailInput = modal.querySelector("#profile-sign-in-email");
    emailInput.value = "player@example.com";
    emailInput.focus();
    await sendKeys({ press: "Enter" });

    expect(request).to.deep.equal({
      email: "player@example.com",
      name: "Table Captain",
    });
  });

  it("marks an empty sign-in email invalid and focuses it", async () => {
    const modal = await fixture(
      html`<phg-app-sign-in-modal mode="sign-in"></phg-app-sign-in-modal>`,
    );
    const emailInput = modal.querySelector("#profile-sign-in-email");

    modal.querySelector("form").requestSubmit();
    await modal.updateComplete;

    expect(emailInput.getAttribute("aria-invalid")).to.equal("true");
    expect(document.activeElement).to.equal(emailInput);
  });

  it("marks an empty sign-up name invalid and focuses it", async () => {
    const modal = await fixture(
      html`<phg-app-sign-in-modal mode="sign-up"></phg-app-sign-in-modal>`,
    );
    const nameInput = modal.querySelector("#profile-sign-up-name");
    modal.querySelector("#profile-sign-in-email").value = "player@example.com";

    modal.querySelector("form").requestSubmit();
    await modal.updateComplete;

    expect(nameInput.getAttribute("aria-invalid")).to.equal("true");
    expect(document.activeElement).to.equal(nameInput);
  });
});
