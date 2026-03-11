import { fixture, expect, html, waitUntil } from "@open-wc/testing";
import { OriginalFetch } from "./setup.js";
import "../../src/frontend/app.js";

describe("phg-app sign in", () => {
  afterEach(() => {
    globalThis.fetch = OriginalFetch;
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
});
