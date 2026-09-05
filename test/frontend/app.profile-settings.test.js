import { fixture, expect, html, waitUntil } from "@open-wc/testing";
import { OriginalFetch } from "./setup.js";
import { DEFAULT_AVATAR } from "../../src/shared/avatar.js";
import "../../src/frontend/app.js";

describe("phg-app profile settings", () => {
  afterEach(() => {
    globalThis.fetch = OriginalFetch;
    history.replaceState({}, "", "/");
  });

  async function openOwnProfileSettings(
    updatedName = "Test",
    updatedVibration = true,
    onUpdateRequest = null,
    avatar = undefined,
  ) {
    globalThis.fetch = async (url, options = {}) => {
      if (url.match(/\/api\/users\/me$/) && !options.method) {
        return {
          ok: true,
          json: async () => ({
            id: "user1",
            name: "Test",
            email: "test@example.com",
            settings: {
              volume: 0.75,
              vibration: true,
              ...(avatar ? { avatar } : {}),
            },
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

    history.replaceState({}, "", "/players/user1");
    const element = await fixture(html`<phg-app></phg-app>`);

    await waitUntil(() => element.querySelector("phg-player-profile"), {
      timeout: 2000,
    });

    const profile = element.querySelector("phg-player-profile");
    await waitUntil(() => profile.profile?.id === "user1", {
      timeout: 2000,
    });
    await profile.updateComplete;
    const shell = element.querySelector("phg-app-shell");
    shell.drawerOpen = true;
    await shell.updateComplete;
    const settingsBtn = Array.from(shell.querySelectorAll("button")).find(
      (button) => button.textContent.includes("Settings"),
    );
    settingsBtn.click();
    await element.updateComplete;

    return element;
  }

  it("opens settings modal from your own profile", async () => {
    const element = await openOwnProfileSettings();

    const modal = element.querySelector("phg-modal");
    expect(modal).to.exist;
    expect(window.location.search).to.equal("?modal=settings");
    await modal.updateComplete;
    expect(modal.querySelector("h3").textContent).to.equal("Settings");
  });

  it("opens a directly linked settings modal and preserves other query parameters on close", async () => {
    globalThis.fetch = async (url, options = {}) => {
      if (url.match(/\/api\/users\/me$/) && !options.method) {
        return {
          ok: true,
          json: async () => ({
            id: "user1",
            name: "Linked user",
            settings: { volume: 0.75, vibration: true },
          }),
        };
      }
      return { ok: false };
    };
    history.replaceState({}, "", "/about?section=team&modal=settings");

    const element = await fixture(html`<phg-app></phg-app>`);
    await waitUntil(
      () =>
        element.querySelector("#profile-settings-name-input")?.value ===
        "Linked user",
      { timeout: 2000 },
    );

    Array.from(element.querySelectorAll(".settings-content button"))
      .find((button) => button.textContent.trim() === "Cancel")
      .click();
    await waitUntil(() => !element.querySelector("phg-modal"), {
      timeout: 2000,
    });

    expect(window.location.pathname).to.equal("/about");
    const searchParams = new URL(window.location.href).searchParams;
    expect(searchParams.get("section")).to.equal("team");
    expect(searchParams.has("modal")).to.be.false;
  });

  it("navigates from settings to the avatar maker page", async () => {
    const element = await openOwnProfileSettings();
    const changeAvatarLink = element.querySelector('a[href="/avatar"]');

    expect(changeAvatarLink).to.exist;
    changeAvatarLink.click();

    await waitUntil(() => element.path === "/avatar", { timeout: 2000 });
    expect(element.querySelector("phg-avatar-maker")).to.exist;
    expect(element.querySelector("phg-modal")).to.not.exist;
  });

  it("reopens settings after returning from the avatar maker", async () => {
    const element = await openOwnProfileSettings();
    const nameInput = element.querySelector("#profile-settings-name-input");
    nameInput.value = "Draft name";
    nameInput.dispatchEvent(new Event("input", { bubbles: true }));
    element.querySelector('.volume-slider input[value="0.25"]').click();
    element.querySelector('a[href="/avatar"]').click();
    await waitUntil(() => element.path === "/avatar", { timeout: 2000 });

    history.back();
    await waitUntil(
      () =>
        element.path === "/players/user1" && element.querySelector("phg-modal"),
      { timeout: 2000 },
    );

    expect(element.querySelector("phg-modal")).to.exist;
    expect(window.location.search).to.equal("?modal=settings");
    expect(element.querySelector("phg-modal h3").textContent).to.equal(
      "Settings",
    );
    expect(
      element.querySelector("#profile-settings-name-input").value,
    ).to.equal("Draft name");
    expect(element._settingsVolume).to.equal(0.25);
  });

  it("previews and removes the saved avatar", async () => {
    /** @type {any} */
    let requestBody;
    const element = await openOwnProfileSettings(
      "Test",
      true,
      (body) => {
        requestBody = body;
      },
      DEFAULT_AVATAR,
    );
    const preview = element.querySelector(".avatar-setting phg-avatar");

    expect(preview.querySelector("canvas")).to.exist;
    element
      .getElementsByClassName("avatar-setting__actions")[0]
      .querySelector("button")
      .click();
    await element.updateComplete;
    await preview.updateComplete;

    expect(preview.querySelector(".avatar-empty")).to.exist;
    expect(preview.querySelector("canvas")).to.not.exist;
    expect(element.querySelector(".avatar-setting__actions button").disabled).to
      .be.true;

    element.querySelector("button.button--action").click();
    await waitUntil(() => requestBody, { timeout: 2000 });
    expect(JSON.stringify(requestBody.settings)).to.include('"avatar":null');
  });

  it("shows a success toast after saving profile settings", async () => {
    const element = await openOwnProfileSettings("Updated");

    const input = element.querySelector("#profile-settings-name-input");
    input.value = "Updated";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    const saveBtn = element.querySelector("button.button--action");
    saveBtn.click();
    await waitUntil(() => element.toast?.message === "Settings saved", {
      timeout: 2000,
    });

    expect(element.querySelector("phg-modal")).to.not.exist;
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
    const vibrationOffButton = element
      .querySelectorAll(".volume-slider")[1]
      ?.querySelector("label");

    expect(vibrationOffButton).to.exist;
    vibrationOffButton.click();

    const saveBtn = element.querySelector("button.button--action");
    saveBtn.click();
    await waitUntil(() => element.toast?.message === "Settings saved", {
      timeout: 2000,
    });

    expect(requestBody).to.deep.equal({
      name: "Test",
      settings: {
        volume: 0.75,
        vibration: false,
        avatar: JSON.parse("null"),
      },
    });
    expect(element.user.settings.vibration).to.equal(false);
  });

  it("preserves a legacy volume when no radio option matches", async () => {
    /** @type {any} */
    let requestBody = null;
    const element = await openOwnProfileSettings("Test", true, (body) => {
      requestBody = body;
    });
    element._settingsVolume = 0.5;
    element.requestUpdate();
    await element.updateComplete;

    expect(element.querySelector('input[name="volume"]:checked')).to.not.exist;
    element.querySelector("button.button--action").click();
    await waitUntil(() => element.toast?.message === "Settings saved", {
      timeout: 2000,
    });

    expect(requestBody.settings.volume).to.equal(0.5);
  });
});
