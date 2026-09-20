import { test, expect } from "@playwright/test";
import {
  hijackScenario,
  cutoffScenario,
  buttonScenario,
  smallBlindScenario,
} from "../frontend/fixtures/learn.js";
import { evaluateLearnStrategy } from "../../src/backend/learn.js";
import { waitForAvatars } from "./visual-assets.js";

for (const [name, scenario, size, call, unavailable] of [
  [
    "learn-sb-vs-lj-open",
    smallBlindScenario("LJ"),
    10,
    0,
    "72o: Fold 100%, Call 0%, Raise 0%",
  ],
  [
    "learn-sb-vs-lj-4bet",
    smallBlindScenario("LJ", true),
    100,
    35,
    "72o: Not in range",
  ],
  [
    "learn-sb-vs-hj-open",
    smallBlindScenario("HJ"),
    10,
    0,
    "72o: Fold 100%, Call 0%, Raise 0%",
  ],
  [
    "learn-sb-vs-hj-4bet",
    smallBlindScenario("HJ", true),
    100,
    35,
    "72o: Not in range",
  ],
  [
    "learn-sb-vs-co-open",
    smallBlindScenario("CO"),
    10,
    0,
    "72o: Fold 100%, Call 0%, Raise 0%",
  ],
  [
    "learn-sb-vs-co-4bet",
    smallBlindScenario("CO", true),
    100,
    60,
    "72o: Not in range",
  ],
  [
    "learn-sb-vs-btn-open",
    smallBlindScenario("BTN"),
    10,
    0,
    "72o: Fold 100%, Call 0%, Raise 0%",
  ],
  [
    "learn-sb-vs-btn-4bet",
    smallBlindScenario("BTN", true),
    100,
    100,
    "72o: Not in range",
  ],
  [
    "learn-btn-vs-lj-open",
    buttonScenario("LJ"),
    8.5,
    0,
    "72o: Fold 100%, Call 0%, Raise 0%",
  ],
  [
    "learn-btn-vs-hj-open",
    buttonScenario("HJ"),
    8.5,
    0,
    "72o: Fold 100%, Call 0%, Raise 0%",
  ],
  [
    "learn-btn-vs-co-open",
    buttonScenario("CO"),
    8.5,
    0,
    "72o: Fold 100%, Call 0%, Raise 0%",
  ],
  [
    "learn-btn-vs-lj-4bet",
    buttonScenario("LJ", true),
    100,
    55,
    "72o: Not in range",
  ],
  [
    "learn-btn-vs-hj-4bet",
    buttonScenario("HJ", true),
    100,
    65,
    "72o: Not in range",
  ],
  [
    "learn-btn-vs-co-4bet",
    buttonScenario("CO", true),
    100,
    100,
    "72o: Not in range",
  ],
  [
    "learn-hj-vs-lj-open",
    hijackScenario(),
    8.5,
    0,
    "72o: Fold 100%, Call 0%, Raise 0%",
  ],
  ["learn-hj-vs-lj-4bet", hijackScenario(true), 100, 50, "72o: Not in range"],
  [
    "learn-co-vs-lj-open",
    cutoffScenario("LJ"),
    8.5,
    0,
    "72o: Fold 100%, Call 0%, Raise 0%",
  ],
  [
    "learn-co-vs-hj-open",
    cutoffScenario("HJ"),
    8.5,
    0,
    "72o: Fold 100%, Call 0%, Raise 0%",
  ],
  [
    "learn-co-vs-lj-4bet",
    cutoffScenario("LJ", true),
    100,
    50,
    "72o: Not in range",
  ],
  [
    "learn-co-vs-hj-4bet",
    cutoffScenario("HJ", true),
    100,
    60,
    "72o: Not in range",
  ],
]) {
  const sizeStep = call < 100 ? enterRaiseSize : async () => {};

  test(`learn ${{ CO: "Cutoff", HJ: "Hijack", BTN: "Button", SB: "Small Blind" }[scenario.position]} practice ${scenario.title}`, async ({
    page,
  }) => {
    await page.route("**/api/learn/scenario", (route) =>
      route.fulfill({ json: scenario }),
    );
    await page.route("**/api/learn/evaluate", (route) =>
      route.fulfill({
        json: evaluateLearnStrategy(route.request().postDataJSON()),
      }),
    );
    await page.goto("/test.html?test=learn-preflop");
    await waitForAvatars(page);
    await expect(page).toHaveScreenshot(`${name}.png`);
    await page.getByRole("slider", { name: "Raise", exact: true }).focus();
    await page.keyboard.press("End");
    await page.getByRole("slider", { name: "Call", exact: true }).focus();
    for (let i = 0; i < call; i += 5) await page.keyboard.press("ArrowRight");
    await sizeStep(page, scenario, size, name);
    await page
      .getByRole("button", { name: "Check strategy", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Correct", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Details", exact: true }).click();
    await expect(
      page
        .locator(".learn-range-details > .learn-range")
        .getByTitle(unavailable, { exact: true }),
    ).toBeVisible();
    await expect(page).toHaveScreenshot(`${name}-range.png`);
    const explanation = page
      .locator(".learn-range-details > .learn-card-factors")
      .last();
    await explanation.scrollIntoViewIfNeeded();
    await expect(explanation).toContainText("position");
    await expect(page).toHaveScreenshot(`${name}-details.png`);
    const opponent = page.locator(".learn-opponent-range");
    await opponent.scrollIntoViewIfNeeded();
    await expect(opponent.locator(".learn-range > *")).toHaveCount(169);
    await expect(page).toHaveScreenshot(`${name}-opponent-range.png`);
    await opponent.getByRole("button", { name: /^AA:/ }).click();
    await expect(opponent.locator("#learn-opponent-AA")).toContainText(
      "1 available combination after removing your cards",
    );
    await expect(page).toHaveScreenshot(`${name}-opponent-hand.png`);
  });
}

for (const [position, opponent, fourBet, takeaway, count] of [
  ["SB", "LJ", false, "The blind discount does not justify a call", 2],
  ["SB", "HJ", false, "Widen against the wider opener", 2],
  ["SB", "CO", false, "Add another layer of 3-bets", 2],
  ["SB", "BTN", false, "Defend most widely against BTN", 2],
  ["SB", "LJ", true, "Preserve the opponent’s possible bluffs", 2],
  ["SB", "HJ", true, "A wider 3-bet range needs more defense", 2],
  ["SB", "CO", true, "Some 5-bet bluffs now appear", 3],
  ["SB", "BTN", true, "Always slowplay AA in this reference", 2],
  ["CO", "LJ", false, "One fewer player, only a little wider", 2],
  ["CO", "HJ", false, "A wider opener allows more 3-bets", 2],
  ["CO", "LJ", true, "Strong hands do not all shove", 2],
  ["CO", "HJ", true, "Wider 3-bets need a wider defense", 2],
  ["BTN", "LJ", false, "Position makes room for calls", 3],
  ["BTN", "HJ", false, "More 3-bets, slightly fewer calls", 2],
  ["BTN", "CO", false, "Attack wider while trimming calls", 2],
  ["BTN", "LJ", true, "Keep the shove range narrow", 2],
  ["BTN", "HJ", true, "A pure call can still be a rare hand", 2],
  ["BTN", "CO", true, "AA always calls against CO", 2],
]) {
  const stage = fourBet ? "4BET" : "OPEN";
  const makeScenario = {
    SB: smallBlindScenario,
    BTN: buttonScenario,
    CO: cutoffScenario,
  }[position];
  const hero = { SB: 4, BTN: 3, CO: 2 }[position];
  const hand = position === "SB" ? "KTs" : "A9s";

  test(`learn ${{ SB: "Small Blind", BTN: "Button", CO: "Cutoff" }[position]} takeaways vs ${opponent} ${fourBet ? "4-bet" : "open"}`, async ({
    page,
  }) => {
    const scenario = makeScenario(opponent, fourBet);
    // Range-wide lessons also belong in feedback for a pure fold.
    scenario.id = `${position}_VS_${opponent}_${stage}-${hand}`;
    scenario.hand = hand;
    scenario.seats[hero].cards = [hand[0] + "s", hand[1] + "s"];
    await page.route("**/api/learn/scenario", (route) =>
      route.fulfill({ json: scenario }),
    );
    await page.route("**/api/learn/evaluate", (route) =>
      route.fulfill({
        json: evaluateLearnStrategy(route.request().postDataJSON()),
      }),
    );
    await page.goto("/test.html?test=learn-preflop");
    await waitForAvatars(page);
    await page.getByRole("slider", { name: "Fold", exact: true }).focus();
    await page.keyboard.press("End");
    await page
      .getByRole("button", { name: "Check strategy", exact: true })
      .click();
    await page.getByRole("button", { name: "Details", exact: true }).click();
    const notes = page.getByRole("region", { name: "Strategy takeaways" });
    await notes.scrollIntoViewIfNeeded();
    await expect(notes).toContainText(takeaway);
    await expect(notes.locator("li")).toHaveCount(count);
    await expect(page).toHaveScreenshot(
      `learn-${position.toLowerCase()}-vs-${opponent.toLowerCase()}-${stage.toLowerCase()}-takeaways.png`,
    );
    await notes.locator("li").last().scrollIntoViewIfNeeded();
    await expect(notes.locator("li").last()).toBeInViewport({ ratio: 1 });
  });
}

async function enterRaiseSize(page, scenario, size, name) {
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const amount = page.getByRole("spinbutton", { name: "Raise to (BB)" });
  await expect(amount).toHaveJSProperty(
    "valueAsNumber",
    scenario.minRaiseTo / 500,
  );
  await page.getByRole("button", { name: "Max", exact: true }).click();
  await expect(amount).toHaveJSProperty("valueAsNumber", 100);
  await amount.fill(String(size));
  await expect(page).toHaveScreenshot(`${name}-sizing.png`);
}
