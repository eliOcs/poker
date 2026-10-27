import { test, expect } from "./utils/fixtures.js";

const BOT_TABLE_URL = /\/learn\/bots\/[a-z0-9]+$/;

test("plays hands against bots at a private table", async ({
  player1,
  player2,
}) => {
  const page = player1.page;
  await page.goto("/learn/bots");
  await expect(page).toHaveURL(BOT_TABLE_URL);
  await expect(player1.game.locator("phg-seat")).toHaveCount(6);
  await expect(player1.game.locator("phg-seat .bot-badge")).toHaveCount(5);
  await expect(page.locator("#info-bar .info-type")).toHaveText("Bots");
  await expect(
    player1.game.locator("phg-seat.current-player .stack"),
  ).toContainText("BB");

  // The stand-in engine checks or calls, so every hand reaches showdown.
  const checkOrCall = player1.actionPanel.getByRole("button", {
    name: /^(Check|Call)\b/,
  });
  await expect(async () => {
    if (await checkOrCall.isVisible()) await checkOrCall.click();
    expect(await player1.getServerHandNumber()).toBeGreaterThanOrEqual(3);
  }).toPass({ timeout: 30_000, intervals: [100] });

  // Someone else with the link gets a table of their own, not this one.
  await player2.page.goto(page.url());
  await expect(player2.page).toHaveURL(BOT_TABLE_URL);
  expect(player2.page.url()).not.toBe(page.url());
});
