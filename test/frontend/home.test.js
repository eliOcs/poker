import { fixture, expect, html, oneEvent } from "@open-wc/testing";
import "../../src/frontend/home.js";

describe("phg-home", () => {
  it("shows an active play link in the drawer", async () => {
    const element = await fixture(html`<phg-home></phg-home>`);

    element.drawerOpen = true;
    await element.updateComplete;

    const playLink = Array.from(element.shadowRoot.querySelectorAll("a")).find(
      (link) => link.textContent.includes("Play"),
    );
    expect(playLink).to.exist;
    expect(playLink.getAttribute("href")).to.equal("/");
    expect(playLink.classList.contains("active")).to.equal(true);
  });

  it("shows an account link for signed-in users", async () => {
    const element = await fixture(html`
      <phg-home
        .user=${{
          id: "player2",
          name: "Elio",
          email: "elio@example.com",
          settings: { volume: 0.75 },
        }}
      ></phg-home>
    `);

    element.drawerOpen = true;
    await element.updateComplete;

    const accountLink = Array.from(
      element.shadowRoot.querySelectorAll("a"),
    ).find((link) => link.textContent.includes("Elio"));
    expect(accountLink).to.exist;
    expect(accountLink.classList.contains("drawer-account")).to.equal(true);
    expect(accountLink.classList.contains("active")).to.equal(false);
    expect(accountLink.getAttribute("href")).to.equal("/players/player2");
    expect(accountLink.hasAttribute("target")).to.equal(false);
  });

  it("dispatches open-sign-in from the drawer when signed out", async () => {
    const element = await fixture(html`<phg-home></phg-home>`);

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
});
