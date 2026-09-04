import { expect, fixture, html } from "@open-wc/testing";
import "../../src/frontend/avatar-maker.js";
import { avatarSpritesReady } from "../../src/frontend/avatar-sprites.js";

describe("avatar maker style previews", () => {
  before(() => avatarSpritesReady);

  it("fills the eye preview canvas with the selected skin color", async () => {
    const maker = await fixture(html`<phg-avatar-maker></phg-avatar-maker>`);
    maker.querySelector("#avatar-tab-eyes").click();
    await maker.updateComplete;

    const canvas = maker.querySelector('canvas[data-part="eyes"]');
    const pixel = canvas.getContext("2d").getImageData(0, 0, 1, 1).data;
    const bounds = canvas.getBoundingClientRect();

    expect([...pixel]).to.deep.equal([201, 130, 85, 255]);
    expect(bounds.width / bounds.height).to.be.closeTo(96 / 64, 0.01);
  });
});
