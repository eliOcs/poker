import { test, expect } from "./utils/fixtures.js";
import { DEFAULT_AVATAR } from "../../src/shared/avatar.js";

for (const navigationApi of [true, false]) {
  test(`learn works through the real app and API (${navigationApi ? "Navigation API" : "History API"})`, async ({
    player1,
  }) => {
    const page = player1.page;
    expect((await page.request.get("/api/users/me")).ok()).toBeTruthy();
    const profile = await page.request.put("/api/users/me", {
      data: { name: "Alex", settings: { avatar: DEFAULT_AVATAR } },
    });
    expect(profile.ok()).toBeTruthy();
    await page.addInitScript((enabled) => {
      Object.defineProperty(window, "navigation", {
        value: enabled ? window.navigation : undefined,
      });
    }, navigationApi);
    const dealt = page.waitForResponse("**/api/learn/scenario");
    await page.goto("/learn?source=practice");
    const scenario = await (await dealt).json();
    expect(scenario.expected).toBeUndefined();
    expect(scenario.blinds).toEqual({ small: 250, big: 500 });
    await expect(page.locator("phg-learn phg-seat")).toHaveCount(6);
    await expect(page.locator("phg-game")).toHaveCount(0);
    const hero = page.locator("phg-learn phg-seat.current-player");
    await expect(hero.locator(".player-name")).toHaveText("Alex");
    await expect(hero.locator("phg-avatar canvas[data-rendered]")).toHaveCount(
      1,
    );
    await expect(hero).toHaveAttribute("role", "button");
    const raise = page.getByRole("slider", { name: "Raise", exact: true });
    await raise.focus();
    await page.keyboard.press("End");
    await hero.press("Enter");
    await expect(page).toHaveURL(/\/learn\?source=practice&modal=settings$/);
    const settings = page.getByRole("dialog");
    await settings
      .getByRole("textbox", { name: "Name", exact: true })
      .fill("Alex Updated");
    await settings.getByRole("button", { name: "Remove", exact: true }).click();
    await settings.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page).toHaveURL(/\/learn\?source=practice$/);
    await expect(hero.locator(".player-name")).toHaveText("Alex Updated");
    await expect(hero.locator("phg-avatar .avatar-empty")).toBeVisible();
    await expect(raise).toHaveValue("100");
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
    const details = page.getByRole("button", { name: "Details", exact: true });
    const strategy = await page.locator(".learn-strategies").textContent();
    await details.click();
    await expect(page).toHaveURL(
      /\/learn\?source=practice&modal=learn-details$/,
    );
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.locator(".learn-range span")).toHaveCount(169);
    expect((await page.request.get(page.url())).status()).toBe(200);
    await page.goBack();
    await expect(page).toHaveURL(/\/learn\?source=practice$/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(details).toBeFocused();
    await expect(page.locator(".learn-strategies")).toHaveText(strategy);
    await page.goForward();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page).toHaveURL(/modal=learn-details$/);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page).toHaveURL(/\/learn\?source=practice$/);
    await expect(details).toBeFocused();
    await details.click();
    await page.getByTitle("Close", { exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page).toHaveURL(/\/learn\?source=practice$/);
    await expect(details).toBeFocused();
    await page.getByRole("button", { name: "Next hand", exact: true }).click();
    await expect(
      page.getByRole("slider", { name: "Fold", exact: true }),
    ).toHaveValue("35");
    await expect(hero.locator(".player-name")).toHaveText("Alex Updated");
    const invalid = await page.request.post("/api/learn/evaluate", {
      data: { id: "not-a-scenario", frequencies: [100, 0, 0] },
    });
    expect(invalid.status()).toBe(400);
  });
}
