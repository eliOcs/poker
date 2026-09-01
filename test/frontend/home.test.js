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

  it("rejects an invalid tournament speed selection", async () => {
    const element = await fixture(html`<phg-home></phg-home>`);

    expect(() =>
      element.handleSpeedChange({ target: { value: "99" } }),
    ).to.throw("Unsupported tournament speed option: 99");
  });

  it("creates a Sit & Go and navigates to the table", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, options) => {
      expect(url).to.equal("/sitngo");
      expect(JSON.parse(options.body)).to.include({
        type: "sitngo",
        seats: 6,
        speed: "turbo",
      });
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

    const speedSelect = [...element.querySelectorAll("select")].find((select) =>
      select.closest(".stakes-selector")?.textContent.includes("Speed"),
    );
    speedSelect.value = "2";
    speedSelect.dispatchEvent(new Event("change"));
    await element.updateComplete;

    setTimeout(() => {
      element.querySelector("button.button").click();
    });

    const event = await oneEvent(element, "navigate");
    expect(event.detail).to.deep.equal({ path: "/sitngo/sitngo123" });

    globalThis.fetch = originalFetch;
  });

  it("explains speeds and player-based Sit & Go duration estimates", async () => {
    const element = await fixture(html`<phg-home></phg-home>`);
    element.querySelector('input[value="sitngo"]').click();
    await element.updateComplete;

    const trigger = element.querySelector(
      '[aria-label="Tournament speed details"]',
    );
    const tooltip = element.querySelector("#sitngo-speed-tooltip");
    expect(trigger.getAttribute("aria-describedby")).to.equal(
      "sitngo-speed-tooltip",
    );
    expect(tooltip.getAttribute("role")).to.equal("tooltip");
    const text = tooltip.textContent.replace(/\s+/g, " ").trim();
    expect(text).to.include("Normal: 20 minutes");
    expect(text).to.include("Semi-Turbo: 15 minutes");
    expect(text).to.include("Turbo: 10 minutes");
    expect(text).to.include("Estimated typical time by number of players");
    expect(text).to.include("2 ~2h 45m ~2h 5m ~1h 25m");
    expect(text).to.include("6 ~3h 50m ~2h 55m ~2h");
    expect(text).to.include("9 ~4h 35m ~3h 30m ~2h 25m");
  });
});
