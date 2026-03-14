import { fixture, expect, html, oneEvent } from "@open-wc/testing";
import "../../src/frontend/app-shell.js";

describe("phg-app-shell", () => {
  it("shows an active play link when path is /", async () => {
    const element = await fixture(
      html`<phg-app-shell path="/"></phg-app-shell>`,
    );

    element.drawerOpen = true;
    await element.updateComplete;

    const playLink = Array.from(element.shadowRoot.querySelectorAll("a")).find(
      (link) => link.textContent.includes("Play"),
    );
    expect(playLink).to.exist;
    expect(playLink.getAttribute("href")).to.equal("/");
    expect(playLink.classList.contains("active")).to.equal(true);
  });

  it("shows an active release notes link when path is /release-notes", async () => {
    const element = await fixture(
      html`<phg-app-shell path="/release-notes"></phg-app-shell>`,
    );

    element.drawerOpen = true;
    await element.updateComplete;

    const releaseNotesLink = Array.from(
      element.shadowRoot.querySelectorAll("a"),
    ).find((link) => link.textContent.includes("Release Notes"));
    expect(releaseNotesLink).to.exist;
    expect(releaseNotesLink.classList.contains("active")).to.equal(true);
  });

  it("shows an account link for signed-in users", async () => {
    const element = await fixture(html`
      <phg-app-shell
        path="/"
        .user=${{
          id: "player2",
          name: "Elio",
          email: "elio@example.com",
          settings: { volume: 0.75 },
        }}
      ></phg-app-shell>
    `);

    element.drawerOpen = true;
    await element.updateComplete;

    const accountLink = Array.from(
      element.shadowRoot.querySelectorAll("a"),
    ).find((link) => link.textContent.includes("Elio"));
    expect(accountLink).to.exist;
    expect(accountLink.getAttribute("href")).to.equal("/players/player2");
  });

  it("shows an active account link when on own profile", async () => {
    const element = await fixture(html`
      <phg-app-shell
        path="/players/player2"
        .user=${{
          id: "player2",
          name: "Elio",
          email: "elio@example.com",
          settings: { volume: 0.75 },
        }}
      ></phg-app-shell>
    `);

    element.drawerOpen = true;
    await element.updateComplete;

    const accountLink = Array.from(
      element.shadowRoot.querySelectorAll("a"),
    ).find((link) => link.textContent.includes("Elio"));
    expect(accountLink).to.exist;
    expect(accountLink.classList.contains("drawer-account")).to.equal(true);
    expect(accountLink.classList.contains("active")).to.equal(true);
  });

  it("dispatches navigate when the play link is clicked", async () => {
    const element = await fixture(
      html`<phg-app-shell path="/"></phg-app-shell>`,
    );

    element.drawerOpen = true;
    await element.updateComplete;

    setTimeout(() => {
      Array.from(element.shadowRoot.querySelectorAll("a"))
        .find((a) => a.textContent.includes("Play"))
        .click();
    });

    const event = await oneEvent(element, "navigate");
    expect(event.detail.path).to.equal("/");
  });

  it("dispatches navigate when the release notes link is clicked", async () => {
    const element = await fixture(
      html`<phg-app-shell path="/"></phg-app-shell>`,
    );

    element.drawerOpen = true;
    await element.updateComplete;

    setTimeout(() => {
      Array.from(element.shadowRoot.querySelectorAll("a"))
        .find((a) => a.textContent.includes("Release Notes"))
        .click();
    });

    const event = await oneEvent(element, "navigate");
    expect(event.detail.path).to.equal("/release-notes");
  });

  it("dispatches navigate when the account link is clicked", async () => {
    const element = await fixture(html`
      <phg-app-shell
        path="/"
        .user=${{
          id: "player2",
          name: "Elio",
          email: "elio@example.com",
          settings: { volume: 0.75 },
        }}
      ></phg-app-shell>
    `);

    element.drawerOpen = true;
    await element.updateComplete;

    setTimeout(() => {
      Array.from(element.shadowRoot.querySelectorAll("a"))
        .find((a) => a.textContent.includes("Elio"))
        .click();
    });

    const event = await oneEvent(element, "navigate");
    expect(event.detail.path).to.equal("/players/player2");
  });

  it("dispatches open-sign-in when sign-in button is clicked (signed out)", async () => {
    const element = await fixture(
      html`<phg-app-shell path="/"></phg-app-shell>`,
    );

    element.drawerOpen = true;
    await element.updateComplete;

    setTimeout(() => {
      const signInBtn = Array.from(
        element.shadowRoot.querySelectorAll("button"),
      ).find((button) => button.textContent.includes("Sign in"));
      signInBtn.click();
    });

    const event = await oneEvent(element, "open-sign-in");
    expect(event).to.exist;
  });

  it("dispatches open-settings when settings button is clicked", async () => {
    const element = await fixture(
      html`<phg-app-shell path="/"></phg-app-shell>`,
    );

    element.drawerOpen = true;
    await element.updateComplete;

    setTimeout(() => {
      const settingsBtn = Array.from(
        element.shadowRoot.querySelectorAll("button"),
      ).find((button) => button.textContent.includes("Settings"));
      settingsBtn.click();
    });

    const event = await oneEvent(element, "open-settings");
    expect(event).to.exist;
  });
});
