import { fixture, expect, html, oneEvent } from "@open-wc/testing";
import "../../src/frontend/home.js";

describe("phg-home", () => {
  it("renders the game creation form", async () => {
    const element = await fixture(html`<phg-home></phg-home>`);
    expect(element.shadowRoot.querySelector(".panel")).to.exist;
    expect(element.shadowRoot.querySelector("phg-button")).to.exist;
  });

  it("creates an MTT and navigates to the lobby", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      expect(url).to.equal("/mtt");
      return {
        ok: true,
        json: async () => ({ id: "mtt123", type: "mtt" }),
      };
    };

    const element = await fixture(html`<phg-home></phg-home>`);
    const radio = /** @type {HTMLInputElement} */ (
      element.shadowRoot.querySelector('input[value="mtt"]')
    );
    radio.click();
    await element.updateComplete;

    setTimeout(() => {
      element.shadowRoot.querySelector("phg-button").click();
    });

    const event = await oneEvent(element, "navigate");
    expect(event.detail).to.deep.equal({ path: "/mtt/mtt123" });

    globalThis.fetch = originalFetch;
  });
});
