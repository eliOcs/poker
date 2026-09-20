import { test, expect } from "@playwright/test";
import { bigBlindScenario } from "../frontend/fixtures/learn-big-blind.js";
import { evaluateLearnStrategy } from "../../src/backend/learn.js";
import { waitForAvatars } from "./visual-assets.js";

test("learn Big Blind checks a limp for free and raises the next hand", async ({
  page,
}) => {
  const weak = bigBlindScenario("SB", "LIMP");
  weak.id = "BB_VS_SB_LIMP-72o";
  weak.hand = "72o";
  weak.seats[5].cards = ["7s", "2h"];
  const scenarios = [weak, bigBlindScenario("SB", "LIMP")];
  await page.route("**/api/learn/scenario", (route) =>
    route.fulfill({ json: scenarios.shift() }),
  );
  await page.route("**/api/learn/evaluate", (route) =>
    route.fulfill({
      json: evaluateLearnStrategy(route.request().postDataJSON()),
    }),
  );
  await page.goto("/test.html?test=learn-preflop");
  await waitForAvatars(page);
  const check = page.getByRole("slider", { name: "Check", exact: true });
  await expect(check).toHaveValue("50");
  await expect(
    page.getByRole("slider", { name: "Fold", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("slider", { name: "Call", exact: true }),
  ).toHaveCount(0);
  await expect(page).toHaveScreenshot("learn-bb-vs-sb-limp.png");
  await check.focus();
  await page.keyboard.press("End");
  await expect(
    page.getByRole("button", { name: "Continue", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Check strategy", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Correct", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("learn-bb-vs-sb-limp-check.png");
  await page.getByRole("button", { name: "Details", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByTitle("72o: Check 100%, Raise 0%", { exact: true }),
  ).toBeVisible();
  await expect(dialog.locator(".learn-range-totals")).toContainText("Check");
  await expect(dialog.locator(".learn-range-totals")).not.toContainText("Fold");
  await expect(page).toHaveScreenshot("learn-bb-vs-sb-limp-range.png");
  const notes = page.getByRole("region", { name: "Strategy takeaways" });
  await notes.scrollIntoViewIfNeeded();
  await expect(notes).toContainText("A free flop is a real option");
  await expect(page).toHaveScreenshot("learn-bb-vs-sb-limp-takeaways.png");
  const opponent = dialog.locator(".learn-opponent-range");
  await opponent.scrollIntoViewIfNeeded();
  await expect(opponent).toContainText("Limp to 1 BB");
  await expect(page).toHaveScreenshot("learn-bb-vs-sb-limp-opponent-range.png");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Next hand", exact: true }).click();
  await expect(check).toHaveValue("50");
  await check.focus();
  await page.keyboard.press("Home");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const amount = page.getByRole("spinbutton", { name: "Raise to (BB)" });
  await expect(amount).toHaveJSProperty("valueAsNumber", 2);
  await amount.fill("3.5");
  await expect(page).toHaveScreenshot("learn-bb-vs-sb-limp-sizing.png");
  await page
    .getByRole("button", { name: "Check strategy", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Correct", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("learn-bb-vs-sb-limp-raise-feedback.png");
});
