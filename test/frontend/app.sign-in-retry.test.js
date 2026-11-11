import { fixture, expect, html, waitUntil } from "@open-wc/testing";
import { OriginalFetch } from "./setup.js";
import {
  createMockTournamentView,
  createMockUser,
} from "./app-test-helpers.js";
import "../../src/frontend/app.js";

/** @param {string} callbackUrl */
async function openFailedSignInLink(callbackUrl) {
  history.replaceState({}, "", callbackUrl);
  globalThis.fetch = async (url, options = {}) => {
    if (url.match(/\/api\/users\/me$/) && !options.method) {
      return { ok: true, json: async () => createMockUser() };
    }
    if (url === "/api/mtt/mtt123") {
      return {
        ok: true,
        json: async () => createMockTournamentView({ status: "running" }),
      };
    }
    return { ok: false, json: async () => ({}) };
  };
  const element = await fixture(html`<phg-app></phg-app>`);
  await waitUntil(() => element.toasts.length > 0, { timeout: 2000 });
  return element;
}

describe("phg-app sign-in link retry", () => {
  const originalLocation = window.location.href;

  afterEach(() => {
    globalThis.fetch = OriginalFetch;
    history.replaceState({}, "", originalLocation);
  });

  it("asks to sign in again from the tournament when a start email link has expired or was used", async () => {
    const element = await openFailedSignInLink(
      "/auth/email-sign-in/callback?token=used&fallback=%2Fmtt%2Fmtt123&email=alice%40example.com",
    );

    expect(element.toasts.at(-1)).to.deep.include({
      message: "This link has expired or was already used. Sign in again.",
      variant: "error",
    });
    expect(window.location.pathname).to.equal("/mtt/mtt123");
    expect(window.location.search).to.equal("?modal=sign-in");
    await waitUntil(
      () => element.querySelector("#profile-sign-in-email"),
      "sign-in modal did not open",
    );
    expect(element.querySelector("#profile-sign-in-email").value).to.equal(
      "alice@example.com",
    );
  });

  it("stays on the site when a link names a fallback elsewhere", async () => {
    await openFailedSignInLink(
      "/auth/email-sign-in/callback?token=used&fallback=%2F%2Fevil.example&email=alice%40example.com",
    );

    expect(window.location.origin).to.equal(new URL(originalLocation).origin);
    expect(window.location.pathname).to.equal("/");
    expect(window.location.search).to.equal("?modal=sign-in");
  });
});
