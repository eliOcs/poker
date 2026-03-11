import { fixture, expect, html, waitUntil } from "@open-wc/testing";
import { OriginalFetch } from "./setup.js";
import "../../src/frontend/app.js";

describe("phg-app profile settings", () => {
  afterEach(() => {
    globalThis.fetch = OriginalFetch;
  });

  async function openOwnProfileSettings(updatedName = "Test") {
    globalThis.fetch = async (url, options = {}) => {
      if (url.match(/\/api\/users\/me$/) && !options.method) {
        return {
          ok: true,
          json: async () => ({
            id: "user1",
            name: "Test",
            settings: { volume: 0.75 },
          }),
        };
      }
      if (url.match(/\/api\/players\/user1$/)) {
        return {
          ok: true,
          json: async () => ({
            id: "user1",
            name: "Test",
            online: false,
            lastSeenAt: "2026-03-05T18:42:00.000Z",
            joinedAt: "2025-11-14T20:15:00.000Z",
            totalNetWinnings: 7500,
            totalHands: 8,
            recentGames: [],
          }),
        };
      }
      if (url.match(/\/api\/users\/me$/) && options.method === "PUT") {
        return {
          ok: true,
          json: async () => ({
            id: "user1",
            name: updatedName,
            settings: { volume: 0.75 },
          }),
        };
      }
      return { ok: false };
    };

    const element = await fixture(html`<phg-app></phg-app>`);
    element.path = "/players/user1";
    await element.updateComplete;

    await waitUntil(
      () => element.shadowRoot.querySelector("phg-player-profile"),
      {
        timeout: 2000,
      },
    );

    const profile = element.shadowRoot.querySelector("phg-player-profile");
    await waitUntil(() => profile.profile?.id === "user1", {
      timeout: 2000,
    });
    await profile.updateComplete;
    profile.shadowRoot.querySelector("button").click();
    await element.updateComplete;

    return element;
  }

  it("opens settings modal from your own profile", async () => {
    const element = await openOwnProfileSettings();

    const modal = element.shadowRoot.querySelector("phg-modal");
    expect(modal).to.exist;
    await modal.updateComplete;
    expect(modal.shadowRoot.querySelector("h3").textContent).to.equal(
      "Settings",
    );
  });

  it("shows a success toast after saving profile settings", async () => {
    const element = await openOwnProfileSettings("Updated");

    const input = element.shadowRoot.querySelector(
      "#profile-settings-name-input",
    );
    input.value = "Updated";

    const saveBtn = element.shadowRoot.querySelector(
      'phg-button[variant="action"]',
    );
    saveBtn.click();
    await waitUntil(() => element.toast?.message === "Settings saved", {
      timeout: 2000,
    });

    expect(element.shadowRoot.querySelector("phg-modal")).to.not.exist;
    expect(element.toast).to.deep.include({
      message: "Settings saved",
      variant: "success",
    });
  });
});
