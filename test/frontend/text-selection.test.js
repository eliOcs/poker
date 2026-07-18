import { fixture, expect, html } from "@open-wc/testing";
import "./setup.js";
import "../../src/frontend/mtt-lobby.js";

describe("text selection", () => {
  it("prevents accidental text selection on the game table", async () => {
    const game = await fixture(html`<phg-game game-id="test123"></phg-game>`);

    expect(getComputedStyle(game).userSelect).to.equal("none");
  });

  it("allows text selection outside the game table", async () => {
    const lobby = await fixture(html`<phg-mtt-lobby></phg-mtt-lobby>`);

    expect(getComputedStyle(lobby).userSelect).to.not.equal("none");
  });
});
