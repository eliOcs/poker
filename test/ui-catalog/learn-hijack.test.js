import { test, expect } from "@playwright/test";
import { hijackScenario } from "../frontend/fixtures/learn.js";
import { evaluateLearnStrategy } from "../../src/backend/learn.js";
import { waitForAvatars } from "./visual-assets.js";

for (const [name, scenario, size, call, unavailable] of [
  [
    "learn-hj-vs-lj-open",
    hijackScenario(),
    8.5,
    0,
    "72o: Fold 100%, Call 0%, Raise 0%",
  ],
  ["learn-hj-vs-lj-4bet", hijackScenario(true), 100, 50, "72o: Not in range"],
]) {
  test(`learn Hijack practice ${scenario.title}`, async ({ page }) => {
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
