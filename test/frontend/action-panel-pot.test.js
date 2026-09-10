import { fixture, expect, html } from "@open-wc/testing";
import { createMockGameAtFlop, mockOpponentSeat } from "./setup.js";

function findButtonByExactText(root, text) {
  return [...root.querySelectorAll("button.button")].find(
    (button) => button.textContent.trim() === text,
  );
}

describe("pot bet presets", () => {
  let element;
  beforeEach(async () => {
    element = await fixture(html`<phg-game game-id="test123"></phg-game>`);
  });
  it("clicking ½ Pot sets betAmount to half the pot", async () => {
    element.game = createMockGameAtFlop(); // collectedPot: 20000
    await element.updateComplete;

    const actionPanel = element.querySelector("phg-action-panel");
    await actionPanel.updateComplete;

    findButtonByExactText(actionPanel, "½ Pot").click();
    await actionPanel.updateComplete;

    expect(actionPanel.betAmount).to.equal(10000);
  });

  it("clicking Pot sets betAmount to the full pot", async () => {
    element.game = createMockGameAtFlop(); // collectedPot: 20000
    await element.updateComplete;

    const actionPanel = element.querySelector("phg-action-panel");
    await actionPanel.updateComplete;

    findButtonByExactText(actionPanel, "Pot").click();
    await actionPanel.updateComplete;

    expect(actionPanel.betAmount).to.equal(20000);
  });

  for (const { label, amount } of [
    { label: "½ Pot", amount: 31500 },
    { label: "Pot", amount: 53000 },
  ]) {
    it(`sizes ${label} raises using all bets and the outstanding call`, async () => {
      const game = createMockGameAtFlop();
      game.hand.currentBet = 10000;
      game.hand.totalPot = 38000;
      game.seats[0].bet = 5000;
      game.seats[0].actions = [
        { action: "fold" },
        { action: "call", amount: 5000 },
        { action: "raise", min: 15000, max: 105000 },
      ];
      game.seats[1].bet = 10000;
      // Folded chips still belong to the pot.
      game.seats[2] = { ...mockOpponentSeat, bet: 3000, folded: true };
      element.game = game;
      await element.updateComplete;
      const panel = element.querySelector("phg-action-panel");
      await panel.updateComplete;

      findButtonByExactText(panel, label).click();
      await panel.updateComplete;
      expect(panel.betAmount).to.equal(amount);

      let sent;
      element.addEventListener("game-action", (event) => {
        sent = event.detail;
      });
      [...panel.querySelectorAll("button")]
        .find((button) => button.textContent.includes("Raise to"))
        .click();
      expect(sent).to.deep.equal({ action: "raise", seat: 0, amount });
    });
  }

  it("does not count bets twice while they are being collected", async () => {
    const game = createMockGameAtFlop();
    game.hand.collectedPot = 20000;
    game.hand.totalPot = 30000;
    game.hand.collectingBets = true;
    game.seats[0].bet = 5000;
    game.seats[1].bet = 5000;
    element.game = game;
    await element.updateComplete;
    const panel = element.querySelector("phg-action-panel");
    await panel.updateComplete;

    findButtonByExactText(panel, "Pot").click();
    await panel.updateComplete;
    expect(panel.betAmount).to.equal(30000);
  });

  it("keeps BB presets preflop when antes have been collected", async () => {
    const game = createMockGameAtFlop();
    game.hand.phase = "preflop";
    element.game = game;
    await element.updateComplete;
    const panel = element.querySelector("phg-action-panel");
    await panel.updateComplete;
    expect(findButtonByExactText(panel, "2.5 BB")).to.exist;
    expect(findButtonByExactText(panel, "Pot")).not.to.exist;
  });
});
