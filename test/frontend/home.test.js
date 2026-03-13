import { fixture, expect, html } from "@open-wc/testing";
import "../../src/frontend/home.js";

describe("phg-home", () => {
  it("renders the game creation form", async () => {
    const element = await fixture(html`<phg-home></phg-home>`);
    expect(element.shadowRoot.querySelector(".panel")).to.exist;
    expect(element.shadowRoot.querySelector("phg-button")).to.exist;
  });
});
