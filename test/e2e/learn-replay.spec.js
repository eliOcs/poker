import { test, expect } from "./utils/fixtures.js";
import { createLearnReplay } from "../../src/backend/learn-replay.js";
import { learnSituation } from "../../src/backend/learn-situations.js";
import {
  learnScenario,
  openFollowupScenario,
} from "../frontend/fixtures/learn.js";

const button = {
  ...learnScenario,
  id: "BTN-AA",
  position: "BTN",
  seats: learnScenario.seats.map((seat, index) => ({
    ...seat,
    player: { name: ["UTG", "UTG+1", "CO", "You · BTN", "SB", "BB"][index] },
    isCurrentPlayer: index === 3,
    isActing: index === 3,
    folded: index < 3,
    lastAction: index < 3 ? "fold" : undefined,
    cards: index === 3 ? ["As", "Ah"] : index < 3 ? [] : ["??", "??"],
  })),
};

for (const [lesson, key, laterActions, foldedCount] of [
  [button, "BTN", [], 3],
  [
    openFollowupScenario("BTN", "BB"),
    "BTN_RAISE_BB",
    [
      {
        seat: 3,
        status: "You raise to 2.5 BB.",
        bet: "2.5 BB",
        stack: "97.5 BB",
        folded: 3,
      },
      {
        seat: 4,
        status: "SB folds.",
        bet: "0.5 BB",
        stack: "99.5 BB",
        folded: 4,
      },
      {
        seat: 5,
        status: "BB raises to 10 BB.",
        bet: "10 BB",
        stack: "90 BB",
        folded: 4,
      },
    ],
    4,
  ],
]) {
  const scenario = {
    ...lesson,
    replay: createLearnReplay(learnSituation(key), lesson.seats, lesson.blinds),
  };

  test(`learn plays earlier actions before the ${key} decision`, async ({
    player1,
  }) => {
    const page = player1.page;
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await page.route("**/api/learn/scenario", (route) =>
      route.fulfill({ json: scenario }),
    );
    await page.goto("/learn");
    const learn = page.locator("phg-learn");
    const choices = learn.getByRole("slider");
    await expect(
      learn.getByText("Playing to your turn", { exact: true }),
    ).toBeVisible();
    await expect(choices).toHaveCount(0);
    await expect(learn.locator("phg-seat.folded")).toHaveCount(0);
    await expect(learn.locator('phg-seat[data-seat="0"]')).toHaveClass(
      /acting/,
    );

    for (let index = 0; index < 3; index++) {
      await page.clock.runFor(900);
      await expect(learn.locator("phg-seat.folded")).toHaveCount(index + 1);
      await expect(
        learn.locator(`phg-seat[data-seat="${index + 1}"]`),
      ).toHaveClass(/acting/);
      await expect(choices).toHaveCount(0);
    }
    for (const action of laterActions) {
      await page.clock.runFor(900);
      await expect(learn.getByRole("status")).toHaveText(action.status);
      const seat = learn.locator(`phg-seat[data-seat="${action.seat}"]`);
      await expect(seat.locator(".bet-indicator")).toContainText(action.bet);
      await expect(seat.locator(".stack")).toHaveText(action.stack);
      await expect(learn.locator("phg-seat.folded")).toHaveCount(action.folded);
      await expect(choices).toHaveCount(0);
    }
    await page.clock.runFor(900);
    await expect(choices).toHaveCount(3);
    await expect(learn.locator(".current-player")).toHaveClass(/acting/);
    await expect(
      learn.getByRole("button", { name: "Skip to decision" }),
    ).toHaveCount(0);

    // A new hand replays from the deal, and skipping cancels further advances.
    const fold = learn.getByRole("slider", { name: "Fold", exact: true });
    await fold.focus();
    await page.keyboard.press("End");
    await learn
      .getByRole("button", { name: "Check strategy", exact: true })
      .click();
    await learn.getByRole("button", { name: "Next hand", exact: true }).click();
    await expect(
      learn.getByText("Playing to your turn", { exact: true }),
    ).toBeVisible();
    await expect(learn.locator("phg-seat.folded")).toHaveCount(0);
    await page.clock.runFor(900);
    await learn.getByRole("button", { name: "Skip to decision" }).click();
    await expect(choices).toHaveCount(3);
    await page.clock.runFor(10000);
    await expect(choices).toHaveCount(3);
    await expect(learn.locator("phg-seat.folded")).toHaveCount(foldedCount);

    // Leaving during playback and returning starts a fresh sequence.
    const home = page.getByRole("link", { name: "Quick play", exact: true });
    const learnLink = page.getByRole("link", {
      name: "Learn Beta",
      exact: true,
    });
    await home.click();
    await learnLink.click();
    await expect(
      learn.getByText("Playing to your turn", { exact: true }),
    ).toBeVisible();
    await page.clock.runFor(900);
    await home.click();
    await expect(learn).toHaveCount(0);
    await page.clock.runFor(10000);
    await learnLink.click();
    await expect(
      learn.getByText("Playing to your turn", { exact: true }),
    ).toBeVisible();
    await expect(learn.locator("phg-seat.folded")).toHaveCount(0);
    await page.clock.runFor(900);
    await expect(learn.locator("phg-seat.folded")).toHaveCount(1);
    await expect(choices).toHaveCount(0);
  });
}
