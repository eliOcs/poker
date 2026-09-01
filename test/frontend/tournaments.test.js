import { fixture, expect, html, oneEvent } from "@open-wc/testing";
import "../../src/frontend/tournaments.js";

describe("phg-tournaments", () => {
  it("renders the tournament creation form without a game type selector", async () => {
    const element = await fixture(html`<phg-tournaments></phg-tournaments>`);

    expect(element.querySelector(".panel")).to.exist;
    expect(element.querySelector('input[name="gameType"]')).to.not.exist;
    expect(element.querySelector("button.button").textContent).to.include(
      "Create Tournament",
    );
  });

  it("creates an MTT and navigates to the lobby", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, options) => {
      expect(url).to.equal("/mtt");
      expect(JSON.parse(options.body)).to.include({
        type: "mtt",
        speed: "normal",
      });
      return {
        ok: true,
        json: async () => ({ id: "mtt123", type: "mtt" }),
      };
    };

    const element = await fixture(html`<phg-tournaments></phg-tournaments>`);
    element.user = { email: "player@example.com" };
    await element.updateComplete;

    setTimeout(() => {
      element.querySelector("button.button").click();
    });

    const event = await oneEvent(element, "navigate");
    expect(event.detail).to.deep.equal({ path: "/mtt/mtt123" });

    globalThis.fetch = originalFetch;
  });

  it("selects and submits a tournament speed", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (_url, options) => {
      expect(JSON.parse(options.body).speed).to.equal("turbo");
      return {
        ok: true,
        json: async () => ({ id: "mtt123", type: "mtt" }),
      };
    };

    const element = await fixture(html`<phg-tournaments></phg-tournaments>`);
    element.user = { email: "player@example.com" };
    await element.updateComplete;
    const speedSelect = [...element.querySelectorAll("select")].find((select) =>
      select.closest(".stakes-selector")?.textContent.includes("Speed"),
    );
    speedSelect.value = "2";
    speedSelect.dispatchEvent(new Event("change"));

    setTimeout(() => element.querySelector("button.button").click());
    await oneEvent(element, "navigate");

    globalThis.fetch = originalFetch;
  });

  it("rejects an invalid tournament speed selection", async () => {
    const element = await fixture(html`<phg-tournaments></phg-tournaments>`);

    expect(() =>
      element.handleSpeedChange({ target: { value: "unknown" } }),
    ).to.throw("Unsupported tournament speed option: unknown");
    expect(element.selectedSpeed).to.equal("normal");
  });

  it("explains speeds and player-based MTT duration estimates", async () => {
    const element = await fixture(html`<phg-tournaments></phg-tournaments>`);
    const trigger = element.querySelector(
      '[aria-label="Tournament speed details"]',
    );
    const tooltip = element.querySelector("#mtt-speed-tooltip");

    expect(trigger.getAttribute("aria-describedby")).to.equal(
      "mtt-speed-tooltip",
    );
    expect(tooltip.getAttribute("role")).to.equal("tooltip");
    const text = tooltip.textContent.replace(/\s+/g, " ").trim();
    expect(text).to.include("Actual time varies with play and rebuys.");
    expect(text).to.include(
      "Estimated typical time by number of players, including rebuys",
    );
    expect(text).to.include("10 ~4h 55m ~3h 45m ~2h 35m");
    expect(text).to.include("20 ~5h 35m ~4h 15m ~2h 55m");
    expect(text).to.include("30 ~6h 20m ~4h 50m ~3h 20m");
  });

  it("opens sign-up instead of creating when the user has no email", async () => {
    const originalFetch = globalThis.fetch;
    let fetchCalled = false;
    globalThis.fetch = async () => {
      fetchCalled = true;
      return { ok: false };
    };

    const element = await fixture(
      html`<phg-tournaments .user=${{ name: "Guest" }}></phg-tournaments>`,
    );

    setTimeout(() => {
      element.querySelector("button.button").click();
    });

    const event = await oneEvent(element, "open-sign-up");
    expect(event).to.exist;
    expect(fetchCalled).to.equal(false);
    expect(element.creating).to.equal(false);

    globalThis.fetch = originalFetch;
  });
});
