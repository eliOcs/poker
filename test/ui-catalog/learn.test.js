import { test, expect } from "@playwright/test";
import {
  learnScenario,
  followupScenario,
  openFollowupScenario,
} from "../frontend/fixtures/learn.js";
import { evaluateLearnStrategy } from "../../src/backend/learn.js";
import { waitForAvatars } from "./visual-assets.js";

test("learn first-in strategy and mix", async ({ page }) => {
  const evaluation = Promise.withResolvers();
  await page.route("**/api/learn/scenario", (route) =>
    route.fulfill({ json: learnScenario }),
  );
  await page.route("**/api/learn/evaluate", async (route) => {
    await evaluation.promise;
    await route.fulfill({
      json: evaluateLearnStrategy(route.request().postDataJSON()),
    });
  });
  await page.goto("/test.html?test=learn-preflop");
  await expect(
    page.getByRole("heading", { name: "How would you play this hand?" }),
  ).toBeVisible();
  await waitForAvatars(page);
  await expect(page).toHaveScreenshot("learn-strategy.png");
  const table = page.locator("phg-table-layout");
  const tableBounds = await table.boundingBox();
  const panelBounds = await page.locator(".learn-panel").boundingBox();
  const headingBounds = await page.locator(".learn-panel h2").boundingBox();
  const continueBounds = await page
    .getByRole("button", { name: "Continue", exact: true })
    .boundingBox();
  async function expectStableLayout() {
    expect(await table.boundingBox()).toEqual(tableBounds);
    expect(await page.locator(".learn-panel").boundingBox()).toEqual(
      panelBounds,
    );
  }
  async function expectStableControls(buttonName) {
    const heading = await page.locator(".learn-panel h2").boundingBox();
    expect(heading.y + heading.height / 2).toBeCloseTo(
      headingBounds.y + headingBounds.height / 2,
      1,
    );
    const button = await page
      .getByRole("button", { name: buttonName, exact: true })
      .boundingBox();
    expect(button.y).toEqual(continueBounds.y);
    expect(button.height).toEqual(continueBounds.height);
  }
  const mixHelp = page.getByRole("button", { name: "How to mix your actions" });
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await mixHelp.click();
  await expect(page.getByRole("tooltip")).toHaveText(
    "Slide to mix your actions. They always add up to 100%.",
  );
  await expect(page).toHaveScreenshot("learn-mix-help.png");
  await page.mouse.move(0, 0);
  await expect(page.getByRole("spinbutton")).toHaveCount(0);
  const foldSlider = page.getByRole("slider", { name: "Fold", exact: true });
  await foldSlider.focus();
  await page.keyboard.press("Home");
  const callSlider = page.getByRole("slider", { name: "Call", exact: true });
  await callSlider.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(callSlider).toHaveValue("50");
  await expect(
    page.getByRole("slider", { name: "Raise", exact: true }),
  ).toHaveValue("50");
  await expect(page).toHaveScreenshot("learn-mix.png");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page).toHaveScreenshot("learn-raise-sizing.png");
  await expectStableLayout();
  await expectStableControls("Check strategy");
  await page.getByRole("button", { name: "3 BB", exact: true }).click();
  await page
    .getByRole("button", { name: "Check strategy", exact: true })
    .click();
  await expect(page.getByText("One moment…", { exact: true })).toBeVisible();
  await expectStableLayout();
  evaluation.resolve();
  await expect(page.getByRole("heading", { name: "Close" })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Recommended", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".learn-strategy")).toHaveCount(2);
  await expect(page).toHaveScreenshot("learn-feedback.png");
  await expectStableLayout();
  await expectStableControls("Next hand");
  await expectStableControls("Details");
  const details = page.getByRole("button", {
    name: "Details",
  });
  await details.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const cells = page.locator(".learn-range span");
  await expect(cells).toHaveCount(169);
  await expect(cells.first()).toHaveText("AA");
  await expect(cells.nth(13)).toHaveText("AKo");
  await expect(cells.last()).toHaveText("22");
  await expect(page).toHaveScreenshot("learn-range-modal.png");
  const totals = page.getByRole("group", { name: "Range totals", exact: true });
  await totals.scrollIntoViewIfNeeded();
  await expect(totals.locator(".learn-range-total")).toHaveText([
    "Fold 38%",
    "Call 37%",
    "Raise 25%",
  ]);
  await expect(page).toHaveScreenshot("learn-range-totals.png");
  const strategy = page.getByRole("region", { name: "GTO strategy" });
  await strategy.scrollIntoViewIfNeeded();
  await expect(strategy.locator("li")).toHaveText(["Call 40%", "Raise 60%"]);
  await expect(strategy).toContainText("Raise to 3 BB");
  await expect(page).toHaveScreenshot("learn-details-strategy.png");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(details).toBeFocused();
  await page.getByRole("button", { name: "Next hand", exact: true }).click();
  const range = page.getByRole("slider", { name: "Fold", exact: true });
  await expect(range).toHaveValue("35");
  await expectStableLayout();
  await expectStableControls("Continue");
  const track = await range.boundingBox();
  expect(track).not.toBeNull();
  await page.mouse.move(
    track.x + 66 + (track.width - 132) * 0.35,
    track.y + track.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    track.x + track.width - 66,
    track.y + track.height / 2,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect(range).toHaveValue("100");
  await expect(
    page.getByRole("slider", { name: "Call", exact: true }),
  ).toHaveValue("0");
  await expect(
    page.getByRole("slider", { name: "Raise", exact: true }),
  ).toHaveValue("0");
  await expect(
    page.getByRole("button", { name: "Check strategy" }),
  ).toBeEnabled();
});

test("learn suited connected hand explanation", async ({ page }) => {
  const scenario = {
    ...learnScenario,
    id: "LJ-T9s",
    hand: "T9s",
    position: "LJ",
    history: "You are first to act.",
    seats: learnScenario.seats.map((seat, i) => ({
      ...seat,
      player: { name: ["You · UTG", "UTG+1", "CO", "BTN", "SB", "BB"][i] },
      isCurrentPlayer: i === 0,
      isActing: i === 0,
      folded: false,
      cards: i === 0 ? ["Ts", "9s"] : ["??", "??"],
    })),
  };
  await page.route("**/api/learn/scenario", (route) =>
    route.fulfill({ json: scenario }),
  );
  await page.route("**/api/learn/evaluate", (route) =>
    route.fulfill({
      json: evaluateLearnStrategy(route.request().postDataJSON()),
    }),
  );
  await page.goto("/test.html?test=learn-preflop");
  await page.getByRole("slider", { name: "Fold", exact: true }).focus();
  await page.keyboard.press("End");
  await page
    .getByRole("button", { name: "Check strategy", exact: true })
    .click();
  await waitForAvatars(page);
  await expect(page.getByRole("heading", { name: "Your cards" })).toHaveCount(
    0,
  );
  await expect(page).toHaveScreenshot("learn-suited-connected.png");
  await page.getByRole("button", { name: "Details", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const heading = dialog.getByRole("heading", {
    name: "Your cards",
    exact: true,
  });
  await heading.scrollIntoViewIfNeeded();
  await expect(heading).toBeVisible();
  const cards = dialog.getByRole("group", { name: "Your hole cards" });
  await expect(cards.locator(".rank")).toHaveText(["10", "9"]);
  await expect(cards.locator(".suit")).toHaveText(["♠", "♠"]);
  await expect(dialog.getByText("Suited", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Connected", { exact: true })).toBeVisible();
  await expect(dialog.getByText(/Both cards fit together/)).toBeVisible();
  await expect(
    dialog.getByText(/Five players still have a chance/),
  ).toBeVisible();
  await expect(dialog.getByRole("tooltip")).toHaveCount(0);
  await expect(page).toHaveScreenshot("learn-hand-details.png");
});

for (const [name, scenario, min, raiseTo, odds, call = 0] of [
  ["learn-sb-limp", followupScenario(), 6, 13, 36],
  ["learn-sb-open", followupScenario(true), 15, 24, 33],
  ["learn-btn-vs-sb", openFollowupScenario("BTN", "SB"), 17.5, 23, 36],
  ["learn-btn-vs-bb", openFollowupScenario("BTN", "BB"), 17.5, 23, 37],
  ["learn-co-vs-btn", openFollowupScenario("CO", "BTN"), 14.5, 23, 32],
  ["learn-co-vs-sb", openFollowupScenario("CO", "SB"), 17.5, 23, 36],
  ["learn-co-vs-bb", openFollowupScenario("CO", "BB"), 17.5, 23, 37],
  ["learn-hj-vs-co", openFollowupScenario("HJ", "CO"), 14.5, 23, 32],
  ["learn-hj-vs-btn", openFollowupScenario("HJ", "BTN"), 14.5, 23, 32],
  ["learn-hj-vs-sb", openFollowupScenario("HJ", "SB"), 17.5, 23, 36],
  ["learn-hj-vs-bb", openFollowupScenario("HJ", "BB"), 17.5, 23, 37],
  ["learn-lj-vs-hj", openFollowupScenario("LJ", "HJ"), 14.5, 23, 32],
  ["learn-lj-vs-co", openFollowupScenario("LJ", "CO"), 14.5, 23, 32],
  ["learn-lj-vs-btn", openFollowupScenario("LJ", "BTN"), 14.5, 23, 32],
  ["learn-lj-vs-sb", openFollowupScenario("LJ", "SB"), 17.5, 23, 36],
  ["learn-lj-vs-bb", openFollowupScenario("LJ", "BB"), 17.5, 23, 37, 10],
]) {
  test(`learn follow-up ${scenario.title}`, async ({ page }) => {
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
    await expect(amount).toHaveJSProperty("valueAsNumber", min);
    await expect(page).toHaveScreenshot(`${name}-sizing.png`);
    await amount.fill(String(raiseTo));
    await page
      .getByRole("button", { name: "Check strategy", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Correct", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Details", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText(scenario.title);
    await expect(
      page.getByTitle("72o: Not in range", { exact: true }),
    ).toBeVisible();
    await expect(page).toHaveScreenshot(`${name}-range.png`);
    const potOdds = page.getByText(/^Calling costs another/);
    await potOdds.scrollIntoViewIfNeeded();
    await expect(potOdds).toBeVisible();
    await expect(potOdds).toContainText(`~ ${odds}%`);
    await expect(page).toHaveScreenshot(`${name}-pot-odds.png`);
  });
}

test("learn correct strategy shows only the recommended actions", async ({
  page,
}) => {
  await page.route("**/api/learn/scenario", (route) =>
    route.fulfill({ json: learnScenario }),
  );
  await page.route("**/api/learn/evaluate", (route) =>
    route.fulfill({
      json: evaluateLearnStrategy(route.request().postDataJSON()),
    }),
  );
  await page.goto("/test.html?test=learn-preflop");
  await page.getByRole("slider", { name: "Fold", exact: true }).focus();
  await page.keyboard.press("Home");
  await page.getByRole("slider", { name: "Call", exact: true }).focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowLeft");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "3 BB", exact: true }).click();
  await page
    .getByRole("button", { name: "Check strategy", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Correct", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".learn-strategy")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Recommended" })).toHaveCount(
    0,
  );
  await waitForAvatars(page);
  await expect(page).toHaveScreenshot("learn-correct.png");
});

test("live table amounts in BB", async ({ page }) => {
  await page.goto("/test.html?test=game-flop-facing-bet");
  await page.locator("phg-game").evaluate((game) => {
    // The server sends the action verb; this older catalog fixture includes currency.
    game.game.seats[1].lastAction = "bet";
    game.user = {
      settings: { volume: 0, vibration: false, amountDisplay: "bb" },
    };
  });
  await waitForAvatars(page);
  await expect(
    page.getByRole("spinbutton", { name: "Amount (BB)" }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("game-amounts-bb.png");
});
