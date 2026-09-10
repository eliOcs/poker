import { expect } from "@playwright/test";

export async function verifyGameScenario(testCase, component) {
  const game = component.locator("phg-game");
  if (await game.count()) {
    const invalidSeats = await game.evaluate((element) =>
      element.game.seats.flatMap((seat, index) => {
        if (seat.empty) return [];
        if (!seat.isCurrentPlayer)
          return seat.actions.length ? [`Opponent ${index} has actions`] : [];
        if (seat.isActing) return [];
        const actions = seat.actions.map(({ action }) => action);
        return ["emote", "chat"]
          .filter((action) => !actions.includes(action))
          .map((action) => `Idle player ${index} is missing ${action}`);
      }),
    );
    expect(invalidSeats).toEqual([]);
  }

  if (testCase === "game-clock-called") {
    const checkFold = component.getByRole("button", { name: "Check / Fold" });
    await expect(checkFold).toBeVisible();
    await expect(checkFold.locator("input")).not.toBeChecked();
    await expect(
      component.getByRole("button", { name: "Emote", exact: true }),
    ).toBeVisible();
    await expect(
      component.locator('phg-seat[data-seat="1"] .clock-countdown'),
    ).toHaveText("45s");
  }
  if (testCase === "action-show-cards") {
    const hero = component.locator('phg-seat[data-slot="0"]');
    await expect(hero).toHaveClass(/folded/);
    await expect(hero.locator(".seat-content")).toHaveCSS("opacity", "0.6");
    await expect(hero.locator(".hole-cards phg-card")).toHaveCount(2);
    await expect(
      component.getByRole("button", { name: /^Muck/ }),
    ).toBeVisible();
    await expect(component.getByRole("button", { name: /^Show/ })).toHaveCount(
      3,
    );
  }
  const preset = {
    "game-preflop-your-turn": "½ Pot",
    "action-raise-preflop": "2.5 BB",
  }[testCase];
  if (preset)
    await expect(
      component.getByRole("button", { name: preset, exact: true }),
    ).toBeVisible();
}
