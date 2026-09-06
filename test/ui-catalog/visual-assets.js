import { expect } from "@playwright/test";

/** Await both Lit's canvas creation and the asynchronous sprite drawing. */
export async function waitForAvatars(page) {
  const avatars = page.locator("phg-avatar");
  await avatars.evaluateAll((elements) =>
    Promise.all(elements.map((avatar) => avatar.updateComplete)),
  );
  await expect(avatars.locator("canvas:not([data-rendered])")).toHaveCount(0);
}
