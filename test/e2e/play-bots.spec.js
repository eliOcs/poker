import { test, expect } from "./utils/fixtures.js";

const BOT_TABLE_URL = /\/learn\/bots\/[a-z0-9]+$/;

test("plays hands against bots at a private table", async ({
  player1,
  player2,
}) => {
  const page = player1.page;
  // The Learn page lists the training modes; one of them deals a bot table.
  await page.goto("/learn");
  await page.getByRole("link", { name: "Take a seat" }).click();
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
  const tableUrl = page.url();
  await player2.page.goto(tableUrl);
  await expect(player2.page).toHaveURL(BOT_TABLE_URL);
  expect(player2.page.url()).not.toBe(tableUrl);

  // With no clock there is no sitting out: leaving ends the table, and it is
  // the drawer's only table action.
  await player1.openDrawer();
  await expect(
    player1.game.getByRole("button", { name: "Sit Out" }),
  ).toHaveCount(0);
  for (const name of ["New table", "Learn"]) {
    await expect(player1.game.getByRole("link", { name })).toHaveCount(0);
  }

  // The table keeps a record: rankings in big blinds, with a BB/100 column,
  // and the hand history.
  await player1.game.getByRole("button", { name: "Rankings" }).click();
  const rankings = player1.game.locator("phg-ranking-panel");
  await expect(rankings.locator("thead")).toContainText("BB/100");
  await expect(rankings.locator("tbody tr")).toHaveCount(6);
  await expect(rankings.locator("tbody tr").first()).toContainText("BB");
  await page.keyboard.press("Escape");
  await player1.openHistory();
  await player1.waitForHistoryLoaded();
  expect(await player1.getHistoryHandCount()).toBeGreaterThanOrEqual(2);
  await page.goBack();
  await expect(page).toHaveURL(tableUrl);

  await player1.openDrawer();
  await player1.game.getByRole("button", { name: "Leave table" }).click();
  await expect(page).toHaveURL(/\/learn$/);

  // Its URL resumes the table from its recorded hands, and it deals on.
  // The hand in progress at leaving was never recorded, so it is dealt anew.
  await page.goto(tableUrl);
  await expect(player1.game.locator("phg-seat .bot-badge")).toHaveCount(5);
  await expect(page).toHaveURL(tableUrl);
  await expect
    .poll(() => player1.getServerHandNumber(), { timeout: 15_000 })
    .toBeGreaterThanOrEqual(3);
});
