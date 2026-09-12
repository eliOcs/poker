import { test, expect } from "@playwright/test";
import { learnScenario } from "../frontend/fixtures/learn.js";
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
  async function expectStableLayout() {
    expect(await table.boundingBox()).toEqual(tableBounds);
    expect(await page.locator(".learn-panel").boundingBox()).toEqual(
      panelBounds,
    );
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
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(details).toBeFocused();
  await page.getByRole("button", { name: "Next hand", exact: true }).click();
  const range = page.getByRole("slider", { name: "Fold", exact: true });
  await expect(range).toHaveValue("35");
  await expectStableLayout();
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
  });
  await heading.scrollIntoViewIfNeeded();
  await expect(heading).toBeVisible();
  await expect(dialog.getByText("Suited", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Connected", { exact: true })).toBeVisible();
  await expect(dialog.getByText(/Both cards fit together/)).toBeVisible();
  await expect(
    dialog.getByText(/Five players still have a chance/),
  ).toBeVisible();
  await expect(dialog.getByRole("tooltip")).toHaveCount(0);
  await expect(page).toHaveScreenshot("learn-hand-details.png");
});

test("learn correct strategy shows only the recommended block", async ({
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
