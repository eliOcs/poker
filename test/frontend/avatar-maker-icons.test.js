import { expect, fixture, html, waitUntil } from "@open-wc/testing";
import "../../src/frontend/avatar-maker.js";

describe("avatar maker adjustment icons", () => {
  it("renders icon paths in the SVG namespace", async () => {
    const maker = await fixture(html`<phg-avatar-maker></phg-avatar-maker>`);
    await waitUntil(() => maker.querySelector(".avatar-maker__stepper"));
    const paths = [
      ...maker.querySelectorAll(".avatar-maker__stepper svg path"),
    ];

    expect(paths).to.not.be.empty;
    expect(
      paths.every((path) => path.namespaceURI === "http://www.w3.org/2000/svg"),
    ).to.equal(true);
  });
});
