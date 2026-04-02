import { fixture, expect, html, waitUntil } from "@open-wc/testing";
import { OriginalFetch } from "./setup.js";
import "../../src/frontend/app.js";

describe("phg-app profile settings", () => {
  afterEach(() => {
    globalThis.fetch = OriginalFetch;
  });

  async function openOwnProfileSettings(
    updatedName = "Test",
    updatedVibration = true,
    onUpdateRequest = null,
  ) {
    globalThis.fetch = async (url, options = {}) => {
      if (url.match(/\/api\/users\/me$/) && !options.method) {
        return {
          ok: true,
          json: async () => ({
            id: "user1",
            name: "Test",
            email: "test@example.com",
            settings: { volume: 0.75, vibration: true },
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
        onUpdateRequest?.(JSON.parse(String(options.body)));
        return {
          ok: true,
          json: async () => ({
            id: "user1",
            name: updatedName,
            email: "test@example.com",
            settings: {
              volume: 0.75,
              vibration: updatedVibration,
            },
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
    const shell = element.shadowRoot.querySelector("phg-app-shell");
    shell.drawerOpen = true;
    await shell.updateComplete;
    const settingsBtn = Array.from(
      shell.shadowRoot.querySelectorAll("button"),
    ).find((button) => button.textContent.includes("Settings"));
    settingsBtn.click();
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

  it("persists the vibration toggle from profile settings", async () => {
    /** @type {any} */
    let requestBody = null;
    const element = await openOwnProfileSettings("Test", false, (body) => {
      requestBody = body;
    });
    const vibrationOffButton = element.shadowRoot
      .querySelectorAll(".volume-slider")[1]
      ?.querySelector("button");

    expect(vibrationOffButton).to.exist;
    vibrationOffButton.click();

    const saveBtn = element.shadowRoot.querySelector(
      'phg-button[variant="action"]',
    );
    saveBtn.click();
    await waitUntil(() => element.toast?.message === "Settings saved", {
      timeout: 2000,
    });

    expect(requestBody).to.deep.equal({
      name: "Test",
      settings: { volume: 0.75, vibration: false },
    });
    expect(element.user.settings.vibration).to.equal(false);
  });
});
