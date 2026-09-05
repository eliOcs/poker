import { test, expect } from "@playwright/test";

test("opens the avatar maker from settings and loads its sprites", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();

  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("link", { name: "Change" }).click();

  await expect(page).toHaveURL(/\/avatar$/);
  const avatarMaker = page.locator("phg-avatar-maker");
  await expect(avatarMaker).toBeVisible();
  await avatarMaker.evaluate(
    (element) => /** @type {any} */ (element).assetsReady,
  );

  const loadedSprites = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .filter(({ name }) => name.includes("/assets/avatar/")),
  );
  expect(loadedSprites.length).toBeGreaterThan(0);
});
