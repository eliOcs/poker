import { test, expect } from "@playwright/test";
import { waitForAvatars } from "./visual-assets.js";
import { prepareMttTestCase, captureMttDetails } from "./catalog-mtt.js";
import { verifyGameScenario } from "./catalog-game.js";

test.describe.configure({ mode: "parallel" });

// Test case IDs (keep in sync with test-cases.js)
const TEST_CASES = [
  // Avatar maker
  "avatar-maker",
  "avatar-maker-sparkle-eyes",
  "avatar-maker-eyebrows",
  "avatar-maker-nose",
  "avatar-maker-mouth",
  "avatar-maker-ears",
  "avatar-maker-hair",
  "avatar-maker-facial-hair",
  "avatar-maker-clothes",

  // Landing page
  "landing-page",
  "sitngo-creation-speed-tooltip",
  "tournaments-page",
  "tournaments-speed-tooltip",
  "player-profile-summary",

  // Lobby states
  "game-empty-table",
  "game-waiting-for-players",
  "game-ready-to-start",
  "game-countdown",
  "game-buy-in",

  // Preflop states
  "game-preflop-your-turn",
  "game-preflop-waiting",

  // Flop states
  "game-flop-check-or-bet",
  "game-flop-facing-bet",

  // Turn states
  "game-turn",

  // River states
  "game-river-facing-bet",

  // Showdown states
  "game-showdown-you-win",
  "game-showdown-you-lose",

  // Special states
  "game-all-in-situation",
  "game-with-folded-players",
  "game-clock-called",
  "game-sitting-out",
  "game-disconnected-player",
  "game-full-table",

  // Action panel states
  "action-raise-preflop",
  "action-all-in",
  "action-fold-or-all-in",
  "action-emote-and-clock",
  "action-show-cards",
  "action-pre-fold-and-call",
  "action-tournament-winner",
  "action-tournament-busted",

  // Table sizes
  "table-heads-up",
  "table-6max",
  "table-full-ring",
  "table-heads-up-showdown",
  "table-6max-showdown",
  "table-full-ring-showdown",

  // Error states (using toast)
  "game-error",

  // Modal states
  "game-rankings-modal",
  "game-rankings-modal-tooltip",
  "game-rankings-modal-tournament",
  "game-tournament-levels-modal",
  "game-settings-modal",

  // Email states
  "email-sign-in",

  // MTT lobby states
  "mtt-lobby-loading",
  "mtt-lobby-error",
  "mtt-lobby-registration-can-register",
  "mtt-lobby-registration-registered",
  "mtt-lobby-registration-owner-can-start",
  "mtt-lobby-registration-action-pending",
  "mtt-lobby-running-can-late-register",
  "mtt-lobby-running-late-register-tooltip",
  "mtt-lobby-running-waiting-for-table",
  "mtt-lobby-running-on-break",
  "mtt-lobby-running-pending-break",
  "mtt-lobby-running-multiple-tables",
  "mtt-lobby-finished",
  "mtt-lobby-finished-as-winner",

  // Hand history states
  "history-empty",
  "history-preflop-fold",
  "history-showdown-win",
  "history-showdown-lose",
  "history-multiple-hands",
  "history-replay-start",
  "history-replay-mid-action",
  "history-replay-final",
];

function getComponentSelector(testCase) {
  if (testCase.startsWith("avatar-maker")) return "phg-avatar-maker";
  if (testCase.startsWith("email-")) return ".email-preview";
  if (
    [
      "landing-page",
      "sitngo-creation-speed-tooltip",
      "tournaments-page",
      "tournaments-speed-tooltip",
    ].includes(testCase)
  ) {
    return "phg-app-shell";
  }
  if (testCase === "player-profile-summary") return "phg-app-shell";
  if (testCase.startsWith("history-")) return "phg-history";
  if (testCase.startsWith("mtt-lobby-")) return "phg-mtt-lobby";
  // game-*, table-* all use phg-game
  return "phg-game";
}

async function prepareAvatarMakerTestCase(testCase, component) {
  const avatarTab = {
    "avatar-maker-sparkle-eyes": "eyes",
    "avatar-maker-eyebrows": "eyebrows",
    "avatar-maker-nose": "nose",
    "avatar-maker-mouth": "mouth",
    "avatar-maker-ears": "ears",
    "avatar-maker-hair": "hair",
    "avatar-maker-facial-hair": "facialHair",
    "avatar-maker-clothes": "clothes",
  }[testCase];
  if (avatarTab) {
    await component.locator(`#avatar-tab-${avatarTab}`).click();
    await component.evaluate((element) => element.updateComplete);
  }
  if (testCase === "avatar-maker-sparkle-eyes") {
    await component.getByRole("button", { name: "Sparkle" }).click();
    await component.evaluate((element) => element.updateComplete);
  }
  if (testCase === "avatar-maker-facial-hair") {
    await component.getByRole("button", { name: "Beard", exact: true }).click();
    await component.evaluate((element) => element.updateComplete);
  }
  await verifyAvatarMakerScrollIsContained(testCase, component);
}

async function preparePlayerProfileTestCase(testCase, component) {
  if (testCase !== "player-profile-summary") return;
  await expect(
    component.locator("phg-player-profile phg-avatar canvas[data-rendered]"),
  ).toHaveCount(1);
}

async function prepareTestCase(testCase, page, component) {
  const componentState = {
    "game-rankings-modal": { showRanking: true },
    "game-rankings-modal-tooltip": { showRanking: true },
    "game-rankings-modal-tournament": { showRanking: true },
    "game-tournament-levels-modal": { showTournamentLevels: true },
  }[testCase];
  if (componentState) {
    await component.evaluate(async (element, state) => {
      Object.assign(element, state);
      await element.updateComplete;
    }, componentState);
  }

  await prepareAvatarMakerTestCase(testCase, component);
  await preparePlayerProfileTestCase(testCase, component);

  const replayIndex = {
    "history-replay-start": 0,
    "history-replay-mid-action": 1,
  }[testCase];
  if (replayIndex !== undefined) {
    await component.evaluate(async (element, index) => {
      element.stopPlayback();
      element.replayIndex = index;
      await element.updateComplete;
    }, replayIndex);
  }

  const shellContentSelector = {
    "landing-page": "phg-home",
    "sitngo-creation-speed-tooltip": "phg-home",
    "player-profile-summary": "phg-player-profile",
    "tournaments-page": "phg-tournaments",
    "tournaments-speed-tooltip": "phg-tournaments",
  }[testCase];
  if (shellContentSelector) {
    await expect(component.locator("phg-navigation-drawer")).toHaveCount(1);
    await component
      .locator(shellContentSelector)
      .evaluate((element) => /** @type {any} */ (element).updateComplete);
  }

  if (testCase === "sitngo-creation-speed-tooltip") {
    await component.locator("phg-home").evaluate(async (element) => {
      element.selectedGameType = "sitngo";
      await element.updateComplete;
    });
  }

  await prepareMttTestCase(testCase, page, component);

  const tooltipLabel = {
    "game-rankings-modal-tooltip": "Net winnings details",
    "mtt-lobby-running-late-register-tooltip": "Late registration details",
    "sitngo-creation-speed-tooltip": "Tournament speed details",
    "tournaments-speed-tooltip": "Tournament speed details",
  }[testCase];
  if (!tooltipLabel) return;
  const trigger = component.getByRole("button", {
    name: tooltipLabel,
    exact: true,
  });
  await trigger.scrollIntoViewIfNeeded();
  await expect(trigger).toBeInViewport({ ratio: 1 });
  await component.evaluate((element, label) => {
    const trigger = element.querySelector(`[aria-label="${label}"]`);
    if (!(trigger instanceof HTMLElement)) {
      throw new Error(`${label} tooltip trigger was not rendered`);
    }
    trigger.focus({ preventScroll: true });
  }, tooltipLabel);
  const tooltipId = await trigger.getAttribute("aria-describedby");
  const tooltip = component.locator(`#${tooltipId}`);
  await expect(tooltip).toBeVisible();
  await tooltip.scrollIntoViewIfNeeded();
  await expect(tooltip).toBeInViewport();
  if (testCase === "mtt-lobby-running-late-register-tooltip") {
    await expect(tooltip).toBeInViewport({ ratio: 1 });
    await expect(component.locator(".main")).toHaveJSProperty("scrollLeft", 0);
  }
  await expect(trigger).toBeInViewport({ ratio: 1 });
}

async function verifyAvatarMakerScrollIsContained(testCase, component) {
  if (testCase !== "avatar-maker") return;

  const preview = component.locator(".avatar-maker__preview");
  const tabs = component.locator(".avatar-maker__tabs");
  const actions = component.locator(".avatar-maker__page-actions");
  const editor = component.locator(".avatar-maker__editor");
  const initialPositions = await Promise.all(
    [preview, actions].map((locator) =>
      locator.evaluate((element) => element.getBoundingClientRect().top),
    ),
  );
  const initialTabsTop = await tabs.evaluate(
    (element) => element.getBoundingClientRect().top,
  );
  const scrollTop = await editor.evaluate((element) => {
    element.scrollTop = 100;
    return element.scrollTop;
  });
  expect(scrollTop).toBeGreaterThan(0);
  expect(
    await Promise.all(
      [preview, actions].map((locator) =>
        locator.evaluate((element) => element.getBoundingClientRect().top),
      ),
    ),
  ).toEqual(initialPositions);
  expect(
    await tabs.evaluate((element) => element.getBoundingClientRect().top),
  ).toBeLessThan(initialTabsTop);
  const bottomGap = await editor.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    const content = element.querySelector(".avatar-maker__fine-tuning");
    if (!content) throw new Error("Avatar controls content was not rendered");
    return (
      element.getBoundingClientRect().bottom -
      content.getBoundingClientRect().bottom
    );
  });
  expect(bottomGap).toBeGreaterThan(0);
  await editor.evaluate((element) => {
    element.scrollTop = 0;
  });
}

for (const testCase of TEST_CASES) {
  // eslint-disable-next-line playwright/valid-title
  test(testCase, async ({ page }) => {
    await page.goto(`/test.html?test=${testCase}`);

    const selector = getComponentSelector(testCase);
    const component = page.locator(selector);
    await component.waitFor();

    // Wait for Lit and any component-owned visual assets to fully render.
    await component.evaluate(async (el) => {
      if ("assetsReady" in el) await el.assetsReady;
      await el.updateComplete;
    });

    await page.evaluate(() => document.fonts.ready);
    await prepareTestCase(testCase, page, component);
    await verifyGameScenario(testCase, component);
    await waitForAvatars(page);

    // Capture content that extends below the viewport as well.
    await expect(page).toHaveScreenshot(`${testCase}.png`, {
      fullPage: true,
    });
    await captureMttDetails(testCase, page, component);
  });
}

// Static article pages
for (const [path, selector] of [
  ["about", "phg-about"],
  ["release-notes", "phg-release-notes"],
]) {
  // eslint-disable-next-line playwright/valid-title
  test(path, async ({ page }) => {
    await page.goto(`/${path}`);

    await page.locator(selector).waitFor();

    await expect(page).toHaveScreenshot(`${path}.png`, { fullPage: true });
  });
}
