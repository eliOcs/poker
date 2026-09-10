import { test, expect } from "@playwright/test";
import { TABLE_SIZE_IDS } from "./test-cases/table-size-ids.js";
import { waitForAvatars } from "./visual-assets.js";

// The mobile project owns landscape snapshots; both projects retain geometry tests.
for (const id of TABLE_SIZE_IDS) {
  test(`${id} landscape`, async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto(`/test.html?test=${id}`);
    await page.locator("phg-table-layout[data-layout]").waitFor();
    await page.evaluate(() => document.fonts.ready);
    await waitForAvatars(page);
    await expect(page).toHaveScreenshot(`${id}-landscape.png`);
  });
}
