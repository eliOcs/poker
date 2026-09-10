import { fixture, expect, html } from "@open-wc/testing";
import "../../src/frontend/about.js";

describe("phg-about", () => {
  it("explains the project and its play-money principles", async () => {
    const element = await fixture(html`<phg-about></phg-about>`);

    expect(element.querySelector("h1").textContent).to.equal("About");
    expect(element.textContent).to.include("does not accept deposits");
    expect(element.textContent).to.include("take a rake");
  });

  it("links to the open-source project and author website", async () => {
    const element = await fixture(html`<phg-about></phg-about>`);
    const links = Array.from(element.querySelectorAll("a"));

    expect(
      links.some(
        (link) =>
          link.href === "https://github.com/eliOcs/poker" &&
          link.textContent.includes("open source"),
      ),
    ).to.equal(true);
    expect(
      links.some(
        (link) =>
          link.href === "https://eliocapella.com/" &&
          link.textContent.includes("my website"),
      ),
    ).to.equal(true);
  });
});
