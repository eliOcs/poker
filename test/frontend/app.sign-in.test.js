import { fixture, expect, html, waitUntil } from "@open-wc/testing";
import { OriginalFetch } from "./setup.js";
import "../../src/frontend/app.js";

describe("phg-app sign in", () => {
  const originalLocation = window.location.href;

  afterEach(() => {
    globalThis.fetch = OriginalFetch;
    history.replaceState({}, "", originalLocation);
  });

  it("shows a success toast after requesting a sign-in link", async () => {
    let requestBody = null;
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
      if (url === "/api/sign-in-links" && options.method === "POST") {
        requestBody = JSON.parse(String(options.body));
        return {
          ok: true,
          json: async () => ({}),
        };
      }
      return { ok: false };
    };

    const element = await fixture(html`<phg-app></phg-app>`);
    element.dispatchEvent(
      new CustomEvent("request-sign-in", {
        detail: { email: "player@example.com" },
        bubbles: true,
        composed: true,
      }),
    );

    await waitUntil(() => element.toast?.message === "Sign-in link sent", {
      timeout: 2000,
    });

    expect(element.toast).to.deep.include({
      message: "Sign-in link sent",
      variant: "success",
    });
    expect(requestBody).to.deep.equal({
      email: "player@example.com",
      returnPath: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    });
  });

  it("shows an error toast when sign-in link delivery fails", async () => {
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
      if (url === "/api/sign-in-links" && options.method === "POST") {
        return {
          ok: false,
          json: async () => ({
            error: "Unable to send sign-in link",
          }),
        };
      }
      return { ok: false };
    };

    const element = await fixture(html`<phg-app></phg-app>`);
    element.dispatchEvent(
      new CustomEvent("request-sign-in", {
        detail: { email: "player@example.com" },
        bubbles: true,
        composed: true,
      }),
    );

    await waitUntil(
      () => element.toast?.message === "Unable to send sign-in link",
      { timeout: 2000 },
    );

    expect(element.toast).to.deep.include({
      message: "Unable to send sign-in link",
      variant: "error",
    });
  });

  it("shows a success toast after email sign-in verification", async () => {
    history.replaceState({}, "", "/auth/email-sign-in/callback?token=test123");
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
      if (url === "/api/sign-in-links/verify" && options.method === "POST") {
        return {
          ok: true,
          json: async () => ({
            returnPath: "/games/test-game?buyin=50",
          }),
        };
      }
      return { ok: false };
    };

    const element = await fixture(html`<phg-app></phg-app>`);

    await waitUntil(() => element.toast?.message === "Signed in successfully", {
      timeout: 2000,
    });

    expect(element.toast).to.deep.include({
      message: "Signed in successfully",
      variant: "success",
    });
    expect(window.location.pathname).to.equal("/games/test-game");
    expect(window.location.search).to.equal("?buyin=50");
  });

  it("shows an error toast when email sign-in verification fails", async () => {
    history.replaceState(
      {},
      "",
      "/auth/email-sign-in/callback?token=bad-token",
    );
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
      if (url === "/api/sign-in-links/verify" && options.method === "POST") {
        return {
          ok: false,
          json: async () => ({
            error: "Invalid or expired sign-in link",
          }),
        };
      }
      return { ok: false };
    };

    const element = await fixture(html`<phg-app></phg-app>`);

    await waitUntil(() => element.toast?.message === "Unable to sign in", {
      timeout: 2000,
    });

    expect(element.toast).to.deep.include({
      message: "Unable to sign in",
      variant: "error",
    });
    expect(window.location.pathname).to.equal("/");
    expect(window.location.search).to.equal("");
  });

  it("shows an error toast when the callback token is missing", async () => {
    history.replaceState({}, "", "/auth/email-sign-in/callback");
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
      return { ok: false };
    };

    const element = await fixture(html`<phg-app></phg-app>`);

    await waitUntil(() => element.toast?.message === "Unable to sign in", {
      timeout: 2000,
    });

    expect(element.toast).to.deep.include({
      message: "Unable to sign in",
      variant: "error",
    });
    expect(window.location.pathname).to.equal("/");
  });

  it("opens the sign-in modal from the profile drawer event", async () => {
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
      if (url.match(/\/api\/players\/player2$/)) {
        return {
          ok: true,
          json: async () => ({
            id: "player2",
            name: "Alice",
            online: false,
            lastSeenAt: "2026-03-05T18:42:00.000Z",
            joinedAt: "2025-11-14T20:15:00.000Z",
            totalNetWinnings: 7500,
            totalHands: 8,
            recentGames: [],
          }),
        };
      }
      return { ok: false };
    };

    const element = await fixture(html`<phg-app></phg-app>`);
    history.replaceState({}, "", "/players/player2");
    element.path = "/players/player2";
    await element.updateComplete;

    await waitUntil(
      () => element.shadowRoot.querySelector("phg-player-profile"),
      {
        timeout: 2000,
      },
    );
    const profile = element.shadowRoot.querySelector("phg-player-profile");
    profile.dispatchEvent(
      new CustomEvent("open-sign-in", {
        bubbles: true,
        composed: true,
      }),
    );
    await element.updateComplete;

    const modal = element.shadowRoot.querySelector("phg-modal");
    expect(modal).to.exist;
    await modal.updateComplete;
    expect(modal.shadowRoot.querySelector("h3").textContent).to.equal(
      "Sign in",
    );
  });
});
