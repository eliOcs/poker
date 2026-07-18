import { fixture, expect, html, oneEvent } from "@open-wc/testing";
import "../../src/frontend/home.js";

describe("phg-home", () => {
  it("renders the game creation form", async () => {
    const element = await fixture(html`<phg-home></phg-home>`);
    expect(element.querySelector(".panel")).to.exist;
    expect(element.querySelector("button.button")).to.exist;
  });

  it("does not show multi-table tournaments as a game type", async () => {
    const element = await fixture(html`<phg-home></phg-home>`);
    expect(element.querySelector('input[value="mtt"]')).to.not.exist;
  });

  it("creates a Sit & Go and navigates to the table", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, options) => {
      expect(url).to.equal("/sitngo");
      expect(JSON.parse(options.body)).to.include({ type: "sitngo" });
      return {
        ok: true,
        json: async () => ({ id: "sitngo123", type: "sitngo" }),
      };
    };

    const element = await fixture(html`<phg-home></phg-home>`);
    const radio = /** @type {HTMLInputElement} */ (
      element.querySelector('input[value="sitngo"]')
    );
    radio.click();
    await element.updateComplete;

    setTimeout(() => {
      element.querySelector("button.button").click();
    });

    const event = await oneEvent(element, "navigate");
    expect(event.detail).to.deep.equal({ path: "/sitngo/sitngo123" });

    globalThis.fetch = originalFetch;
  });
});
