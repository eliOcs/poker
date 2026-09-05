import { fixture, expect, html, waitUntil } from "@open-wc/testing";
import { DEFAULT_AVATAR } from "../../src/frontend/avatar-maker-data.js";
import "../../src/frontend/app.js";
import { createMockUser } from "./app-test-helpers.js";
import { OriginalFetch } from "./setup.js";

describe("phg-app avatar maker", () => {
  afterEach(() => {
    globalThis.fetch = OriginalFetch;
    history.replaceState({}, "", "/");
  });

  it("applies changes to the settings draft before navigating back", async () => {
    const savedAvatar = structuredClone(DEFAULT_AVATAR);
    savedAvatar.face.size = 1;
    let updateRequests = 0;
    globalThis.fetch = async (url, options = {}) => {
      if (url.match(/\/api\/users\/me$/) && !options.method) {
        return {
          ok: true,
          json: async () =>
            createMockUser({ settings: { avatar: savedAvatar } }),
        };
      }
      if (url.match(/\/api\/users\/me$/) && options.method === "PUT") {
        updateRequests += 1;
      }
      return { ok: false };
    };

    const originalBack = window.history.back;
    let backCalls = 0;
    window.history.back = () => {
      backCalls += 1;
    };

    try {
      const element = await fixture(html`<phg-app></phg-app>`);
      await waitUntil(() => element.user, { timeout: 2000 });
      element._settingsAvatar = savedAvatar;
      element._avatarUsesSettingsDraft = true;
      element.path = "/avatar";
      await waitUntil(() => element.querySelector("phg-avatar-maker"), {
        timeout: 2000,
      });
      const maker = element.querySelector("phg-avatar-maker");
      await maker.updateComplete;

      expect(maker.avatar.face.size).to.equal(1);
      maker.querySelector('[aria-label="Smaller Face"]').click();
      await maker.updateComplete;
      [...maker.querySelectorAll(".avatar-maker__page-actions button")]
        .find((button) => button.textContent.trim() === "Done")
        .click();

      await waitUntil(() => backCalls === 1, { timeout: 2000 });
      expect(element._settingsAvatar.face.size).to.equal(0);
      expect(updateRequests).to.equal(0);
    } finally {
      window.history.back = originalBack;
    }
  });

  it("cancels avatar changes without changing the draft", async () => {
    let updateRequests = 0;
    globalThis.fetch = async (url, options = {}) => {
      if (url.match(/\/api\/users\/me$/) && !options.method) {
        return {
          ok: true,
          json: async () => createMockUser(),
        };
      }
      if (url.match(/\/api\/users\/me$/) && options.method === "PUT") {
        updateRequests += 1;
      }
      return { ok: false };
    };

    const originalBack = window.history.back;
    let backCalls = 0;
    window.history.back = () => {
      backCalls += 1;
    };

    try {
      const element = await fixture(html`<phg-app></phg-app>`);
      await waitUntil(() => element.user, { timeout: 2000 });
      const draftAvatar = structuredClone(DEFAULT_AVATAR);
      element._settingsAvatar = draftAvatar;
      element._avatarUsesSettingsDraft = true;
      element.path = "/avatar";
      await waitUntil(() => element.querySelector("phg-avatar-maker"), {
        timeout: 2000,
      });
      const maker = element.querySelector("phg-avatar-maker");
      await maker.updateComplete;
      maker.querySelector('[aria-label="Bigger Face"]').click();
      await maker.updateComplete;
      [...maker.querySelectorAll(".avatar-maker__page-actions button")]
        .find((button) => button.textContent.trim() === "Cancel")
        .click();

      expect(backCalls).to.equal(1);
      expect(updateRequests).to.equal(0);
      expect(element._settingsAvatar).to.equal(draftAvatar);
      expect(element._settingsAvatar.face.size).to.equal(0);
    } finally {
      window.history.back = originalBack;
    }
  });
});
