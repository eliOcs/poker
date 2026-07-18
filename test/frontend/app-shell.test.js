import { fixture, expect, html, oneEvent } from "@open-wc/testing";
import "../../src/frontend/app-shell.js";

describe("phg-app-shell", () => {
  it("shows an active quick play link when path is /", async () => {
    const element = await fixture(
      html`<phg-app-shell path="/"></phg-app-shell>`,
    );

    element.drawerOpen = true;
    await element.updateComplete;

    const playLink = Array.from(element.querySelectorAll("a")).find((link) =>
      link.textContent.includes("Quick play"),
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

    const releaseNotesLink = Array.from(element.querySelectorAll("a")).find(
      (link) => link.textContent.includes("Release Notes"),
    );
    expect(releaseNotesLink).to.exist;
    expect(releaseNotesLink.classList.contains("active")).to.equal(true);
  });

  it("shows an active tournaments link when path is /mtt", async () => {
    const element = await fixture(
      html`<phg-app-shell path="/mtt"></phg-app-shell>`,
    );

    element.drawerOpen = true;
    await element.updateComplete;

    const tournamentsLink = Array.from(element.querySelectorAll("a")).find(
      (link) => link.textContent.includes("Tournaments"),
    );
    expect(tournamentsLink).to.exist;
    expect(tournamentsLink.getAttribute("href")).to.equal("/mtt");
    expect(tournamentsLink.classList.contains("active")).to.equal(true);
  });

  it("shows an account link for signed-in users", async () => {
    const element = await fixture(html`
      <phg-app-shell
        path="/"
        .user=${{
          id: "player2",
          name: "Elio",
          email: "elio@example.com",
          settings: { volume: 0.75, vibration: true },
        }}
      ></phg-app-shell>
    `);

    element.drawerOpen = true;
    await element.updateComplete;

    const accountLink = Array.from(element.querySelectorAll("a")).find((link) =>
      link.textContent.includes("Elio"),
    );
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
          settings: { volume: 0.75, vibration: true },
        }}
      ></phg-app-shell>
    `);

    element.drawerOpen = true;
    await element.updateComplete;

    const accountLink = Array.from(element.querySelectorAll("a")).find((link) =>
      link.textContent.includes("Elio"),
    );
    expect(accountLink).to.exist;
    expect(accountLink.classList.contains("drawer-account")).to.equal(true);
    expect(accountLink.classList.contains("active")).to.equal(true);
  });

  it("dispatches open-sign-in when sign-in button is clicked (signed out)", async () => {
    const element = await fixture(
      html`<phg-app-shell path="/"></phg-app-shell>`,
    );

    element.drawerOpen = true;
    await element.updateComplete;

    setTimeout(() => {
      const signInBtn = Array.from(element.querySelectorAll("button")).find(
        (button) => button.textContent.includes("Sign in"),
      );
      signInBtn.click();
    });

    const event = await oneEvent(element, "open-sign-in");
    expect(event).to.exist;
  });

  it("dispatches open-sign-up when sign-up button is clicked (signed out)", async () => {
    const element = await fixture(
      html`<phg-app-shell path="/"></phg-app-shell>`,
    );

    element.drawerOpen = true;
    await element.updateComplete;

    setTimeout(() => {
      const signUpBtn = Array.from(element.querySelectorAll("button")).find(
        (button) => button.textContent.includes("Sign up"),
      );
      signUpBtn.click();
    });

    const event = await oneEvent(element, "open-sign-up");
    expect(event).to.exist;
  });

  it("renders sign up above sign in for signed-out users", async () => {
    const element = await fixture(
      html`<phg-app-shell path="/"></phg-app-shell>`,
    );

    element.drawerOpen = true;
    await element.updateComplete;

    const buttonLabels = Array.from(element.querySelectorAll("button")).map(
      (button) => button.textContent.trim(),
    );

    expect(buttonLabels.indexOf("Sign up")).to.be.lessThan(
      buttonLabels.indexOf("Sign in"),
    );
  });

  it("dispatches open-settings when settings button is clicked", async () => {
    const element = await fixture(
      html`<phg-app-shell path="/"></phg-app-shell>`,
    );

    element.drawerOpen = true;
    await element.updateComplete;

    setTimeout(() => {
      const settingsBtn = Array.from(element.querySelectorAll("button")).find(
        (button) => button.textContent.includes("Settings"),
      );
      settingsBtn.click();
    });

    const event = await oneEvent(element, "open-settings");
    expect(event).to.exist;
  });

  it("can replace the shell drawer with a custom navigation renderer", async () => {
    const element = await fixture(html`
      <phg-app-shell path="/" .navigationRenderer=${() => ""}></phg-app-shell>
    `);

    await element.updateComplete;

    expect(element.querySelector("phg-navigation-drawer")).to.not.exist;
  });
});
