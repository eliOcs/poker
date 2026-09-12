import { test, expect } from "./utils/fixtures.js";

test("learn works through the real app and API without joining a game", async ({
  player1,
}) => {
  const page = player1.page;
  const dealt = page.waitForResponse("**/api/learn/scenario");
  await page.goto("/learn");
  const scenario = await (await dealt).json();
  expect(scenario.expected).toBeUndefined();
  expect(scenario.blinds).toEqual({ small: 250, big: 500 });
  await expect(page.locator("phg-learn phg-seat")).toHaveCount(6);
  await expect(page.locator("phg-game")).toHaveCount(0);
  const raise = page.getByRole("slider", { name: "Raise", exact: true });
  await raise.focus();
  await page.keyboard.press("End");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("spinbutton", { name: "Raise to ($)" }).fill("20");
  const evaluated = page.waitForResponse("**/api/learn/evaluate");
  await page
    .getByRole("button", { name: "Check strategy", exact: true })
    .click();
  const response = await evaluated;
  expect(response.status()).toBe(200);
  expect(response.request().postDataJSON()).toEqual({
    id: scenario.id,
    frequencies: [0, 0, 100],
    raiseTo: 4,
  });
  const result = await response.json();
  await expect(page.locator(".learn-grade")).toHaveText(
    new RegExp(result.grade, "i"),
  );
  await page.getByRole("button", { name: "Details", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".learn-range span")).toHaveCount(169);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Next hand", exact: true }).click();
  await expect(
    page.getByRole("slider", { name: "Fold", exact: true }),
  ).toHaveValue("35");
  const invalid = await page.request.post("/api/learn/evaluate", {
    data: { id: "not-a-scenario", frequencies: [100, 0, 0] },
  });
  expect(invalid.status()).toBe(400);
});
