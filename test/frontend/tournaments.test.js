import { fixture, expect, html, oneEvent } from "@open-wc/testing";
import "../../src/frontend/tournaments.js";

describe("phg-tournaments", () => {
  it("renders the tournament creation form without a game type selector", async () => {
    const element = await fixture(html`<phg-tournaments></phg-tournaments>`);

    expect(element.shadowRoot.querySelector(".panel")).to.exist;
    expect(element.shadowRoot.querySelector('input[name="gameType"]')).to.not
      .exist;
    expect(
      element.shadowRoot.querySelector("phg-button").textContent,
    ).to.include("Create Tournament");
  });

  it("creates an MTT and navigates to the lobby", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, options) => {
      expect(url).to.equal("/mtt");
      expect(JSON.parse(options.body)).to.include({ type: "mtt" });
      return {
        ok: true,
        json: async () => ({ id: "mtt123", type: "mtt" }),
      };
    };

    const element = await fixture(html`<phg-tournaments></phg-tournaments>`);

    setTimeout(() => {
      element.shadowRoot.querySelector("phg-button").click();
    });

    const event = await oneEvent(element, "navigate");
    expect(event.detail).to.deep.equal({ path: "/mtt/mtt123" });

    globalThis.fetch = originalFetch;
  });
});
