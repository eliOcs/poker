import { expect, fixture, html, waitUntil } from "@open-wc/testing";
import "../../src/frontend/avatar-maker.js";

describe("avatar maker adjustment stepper", () => {
  it("selects an adjustment value directly", async () => {
    const maker = await fixture(html`<phg-avatar-maker></phg-avatar-maker>`);
    await waitUntil(() => maker.querySelector(".avatar-maker__meter"));
    const meter = maker.querySelector(".avatar-maker__meter");
    const steps = [...meter.querySelectorAll("button")];

    expect(steps).to.have.length(5);
    maker.querySelector('[aria-label="Set Face position to -2"]').click();
    await maker.updateComplete;

    expect(maker.avatar.face.position).to.equal(-2);
    expect(
      maker
        .querySelector('[aria-label="Set Face position to -2"]')
        .getAttribute("aria-pressed"),
    ).to.equal("true");
  });
});
