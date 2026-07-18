import { fixture, expect, html, waitUntil } from "@open-wc/testing";
import { OriginalFetch } from "./setup.js";
import { createMockTournamentView } from "./app-test-helpers.js";
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
            settings: { volume: 0.75, vibration: true },
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

  it("updates the display name before requesting a sign-up link", async () => {
    let signInRequestBody = null;
    let userUpdateBody = null;
    globalThis.fetch = async (url, options = {}) => {
      if (url.match(/\/api\/users\/me$/) && !options.method) {
        return {
          ok: true,
          json: async () => ({
            id: "user1",
            name: "Guest Name",
            settings: { volume: 0.75, vibration: true },
          }),
        };
      }
      if (url.match(/\/api\/users\/me$/) && options.method === "PUT") {
        userUpdateBody = JSON.parse(String(options.body));
        return {
          ok: true,
          json: async () => ({
            id: "user1",
            name: userUpdateBody.name,
            settings: { volume: 0.75, vibration: true },
          }),
        };
      }
      if (url === "/api/sign-in-links" && options.method === "POST") {
        signInRequestBody = JSON.parse(String(options.body));
        return {
          ok: true,
          json: async () => ({}),
        };
      }
      return { ok: false };
    };

    const element = await fixture(html`<phg-app></phg-app>`);
    await waitUntil(() => element.user?.name === "Guest Name", {
      timeout: 2000,
    });
    element.openProfileSignUp();
    await element.updateComplete;

    const modal = element.querySelector("phg-app-sign-in-modal");
    await modal.updateComplete;
    const nameInput = modal.querySelector("#profile-sign-up-name");
    const emailInput = modal.querySelector("#profile-sign-in-email");
    expect(nameInput.value).to.equal("Guest Name");
    emailInput.value = "player@example.com";

    modal.submit();

    await waitUntil(() => element.toast?.message === "Sign-in link sent", {
      timeout: 2000,
    });

    expect(userUpdateBody).to.deep.equal({
      name: "Guest Name",
    });
    expect(signInRequestBody).to.deep.equal({
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
            settings: { volume: 0.75, vibration: true },
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
            settings: { volume: 0.75, vibration: true },
          }),
        };
      }
      if (url === "/api/sign-in-links/verify" && options.method === "POST") {
        return {
          ok: true,
          json: async () => ({
            returnPath: "/cash/test-game?buyin=50",
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
    expect(window.location.pathname).to.equal("/cash/test-game");
    expect(window.location.search).to.equal("?buyin=50");
  });

  it("registers for an MTT after sign-in when the return path has a register action", async () => {
    history.replaceState({}, "", "/auth/email-sign-in/callback?token=test123");
    let registerRequested = false;
    globalThis.fetch = async (url, options = {}) => {
      if (url.match(/\/api\/users\/me$/) && !options.method) {
        return {
          ok: true,
          json: async () => ({
            id: "user1",
            name: "Test",
            email: "player@example.com",
            settings: { volume: 0.75, vibration: true },
          }),
        };
      }
      if (url === "/api/sign-in-links/verify" && options.method === "POST") {
        return {
          ok: true,
          json: async () => ({
            returnPath: "/mtt/mtt123?action=register",
          }),
        };
      }
      if (url === "/api/mtt/mtt123/register" && options.method === "POST") {
        registerRequested = true;
        return {
          ok: true,
          json: async () =>
            createMockTournamentView({
              currentPlayer: { status: "registered" },
              actions: { canRegister: false, canUnregister: true },
            }),
        };
      }
      return { ok: false, json: async () => ({ error: "not found" }) };
    };

    const element = await fixture(html`<phg-app></phg-app>`);

    await waitUntil(() => registerRequested, { timeout: 2000 });

    expect(element._mttView.currentPlayer.status).to.equal("registered");
    expect(window.location.pathname).to.equal("/mtt/mtt123");
    expect(window.location.search).to.equal("");
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
            settings: { volume: 0.75, vibration: true },
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
            settings: { volume: 0.75, vibration: true },
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
            settings: { volume: 0.75, vibration: true },
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

    await waitUntil(() => element.querySelector("phg-player-profile"), {
      timeout: 2000,
    });
    const profile = element.querySelector("phg-player-profile");
    profile.dispatchEvent(
      new CustomEvent("open-sign-in", {
        bubbles: true,
        composed: true,
      }),
    );
    await element.updateComplete;

    const modal = element.querySelector("phg-modal");
    expect(modal).to.exist;
    await modal.updateComplete;
    expect(modal.shadowRoot.querySelector("h3").textContent).to.equal(
      "Sign in",
    );
  });

  it("opens the sign-in modal from the landing page drawer event", async () => {
    globalThis.fetch = async (url, options = {}) => {
      if (url.match(/\/api\/users\/me$/) && !options.method) {
        return {
          ok: true,
          json: async () => ({
            id: "user1",
            name: "Test",
            settings: { volume: 0.75, vibration: true },
          }),
        };
      }
      return { ok: false };
    };

    const element = await fixture(html`<phg-app></phg-app>`);
    await waitUntil(() => element.querySelector("phg-home"), {
      timeout: 2000,
    });

    const home = element.querySelector("phg-home");
    home.dispatchEvent(
      new CustomEvent("open-sign-in", {
        bubbles: true,
        composed: true,
      }),
    );
    await element.updateComplete;

    const modal = element.querySelector("phg-modal");
    expect(modal).to.exist;
    await modal.updateComplete;
    expect(modal.shadowRoot.querySelector("h3").textContent).to.equal(
      "Sign in",
    );
  });

  it("opens the sign-up modal from the app event", async () => {
    globalThis.fetch = async (url, options = {}) => {
      if (url.match(/\/api\/users\/me$/) && !options.method) {
        return {
          ok: true,
          json: async () => ({
            id: "user1",
            name: "Test",
            settings: { volume: 0.75, vibration: true },
          }),
        };
      }
      return { ok: false };
    };

    const element = await fixture(html`<phg-app></phg-app>`);
    element.dispatchEvent(
      new CustomEvent("open-sign-up", {
        bubbles: true,
        composed: true,
      }),
    );
    await element.updateComplete;

    const modal = element.querySelector("phg-modal");
    expect(modal).to.exist;
    await modal.updateComplete;
    expect(modal.shadowRoot.querySelector("h3").textContent).to.equal(
      "Sign up",
    );
  });

  it("opens sign-up for guests on the tournament route and again on create", async () => {
    globalThis.fetch = async (url, options = {}) => {
      if (url.match(/\/api\/users\/me$/) && !options.method) {
        return {
          ok: true,
          json: async () => ({
            id: "u1",
            name: "Guest",
            settings: { volume: 0.75, vibration: true },
          }),
        };
      }
      return { ok: false };
    };

    const element = await fixture(html`<phg-app></phg-app>`);
    await waitUntil(() => element.user?.name === "Guest", {
      timeout: 2000,
    });

    element.path = "/mtt";
    await waitUntil(() => element._showProfileSignUp, { timeout: 2000 });
    expect(element?.querySelector("phg-app-sign-in-modal")?.mode).to.equal(
      "sign-up",
    );

    element.closeProfileSignUp();
    await element.updateComplete;
    expect(element?.querySelector("phg-app-sign-in-modal")).to.not.exist;

    element
      ?.querySelector("phg-tournaments")
      ?.querySelector("phg-button")
      ?.click();
    await waitUntil(() => element._showProfileSignUp, { timeout: 2000 });

    expect(element?.querySelector("phg-app-sign-in-modal")?.mode).to.equal(
      "sign-up",
    );
  });

  it("switches between sign-in and sign-up modals from the footer links", async () => {
    globalThis.fetch = async (url, options = {}) => {
      if (url.match(/\/api\/users\/me$/) && !options.method) {
        return {
          ok: true,
          json: async () => ({
            id: "user1",
            name: "Test",
            settings: { volume: 0.75, vibration: true },
          }),
        };
      }
      return { ok: false };
    };

    const element = await fixture(html`<phg-app></phg-app>`);
    element.openProfileSignIn();
    await element.updateComplete;

    let modal = element.querySelector("phg-app-sign-in-modal");
    await modal.updateComplete;
    modal.querySelector(".sign-in-switch-link").click();
    await element.updateComplete;

    modal = element.querySelector("phg-app-sign-in-modal");
    await modal.updateComplete;
    expect(modal.mode).to.equal("sign-up");
    expect(modal.querySelector(".sign-in-switch").textContent).to.include(
      "Have an account?",
    );

    modal.querySelector(".sign-in-switch-link").click();
    await element.updateComplete;

    modal = element.querySelector("phg-app-sign-in-modal");
    expect(modal.mode).to.equal("sign-in");
    expect(modal.querySelector(".sign-in-switch").textContent).to.include(
      "New?",
    );
  });
});
