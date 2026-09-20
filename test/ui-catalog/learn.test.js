import { test, expect } from "@playwright/test";
import {
  learnScenario,
  openFollowupScenario,
} from "../frontend/fixtures/learn.js";
import { bigBlindScenario } from "../frontend/fixtures/learn-big-blind.js";
import { evaluateLearnStrategy } from "../../src/backend/learn.js";
import { createLearnReplay } from "../../src/backend/learn-replay.js";
import { learnSituation } from "../../src/backend/learn-situations.js";
import { waitForAvatars } from "./visual-assets.js";

test.describe.configure({ mode: "parallel" });

// Evaluate only to build representative response fixtures. Poker correctness and
// explanation content are covered by test/backend/learn*.test.js.
function feedback(scenario, frequencies, raiseTo = 0) {
  return {
    scenario,
    frequencies,
    betAmount: raiseTo * scenario.blinds.big,
    result: evaluateLearnStrategy({ id: scenario.id, frequencies, raiseTo }),
  };
}

const opening = feedback(learnScenario, [0, 40, 60], 3);
const close = feedback(learnScenario, [0, 50, 50], 3);
const followup = feedback(openFollowupScenario("BTN", "SB"), [100, 0, 0]);
const checking = feedback(bigBlindScenario("SB", "LIMP"), [50, 50], 3.5);
const weighted = feedback(bigBlindScenario("LJ", "4BET"), [100, 0, 0]);
const mixedScenario = openFollowupScenario("BTN", "SB");
mixedScenario.id = "BTN_RAISE_SB-KJo";
mixedScenario.hand = "KJo";
mixedScenario.seats.find((seat) => seat.isCurrentPlayer).cards = ["Ks", "Jh"];
const error = "Could not reach the lesson. Please try again.";

// One independent capture per visual state, not one walkthrough per lesson.
const states = [
  {
    name: "lead-in",
    state: {
      scenario: {
        ...followup.scenario,
        replay: createLearnReplay(
          learnSituation("BTN_RAISE_SB"),
          followup.scenario.seats,
          followup.scenario.blinds,
        ),
      },
      replayIndex: 4,
    },
  },
  { name: "strategy", state: {} },
  { name: "mix-help", state: {}, tooltip: "How to mix your actions" },
  { name: "pure-action", state: { frequencies: [100, 0, 0] } },
  {
    name: "check-raise",
    state: { scenario: checking.scenario, frequencies: [50, 50] },
  },
  { name: "raise-sizing", state: { sizing: true, betAmount: 1000 } },
  {
    name: "reraise-sizing",
    state: {
      scenario: followup.scenario,
      sizing: true,
      betAmount: followup.scenario.minRaiseTo,
    },
  },
  { name: "loading", state: { scenario: null, busy: true } },
  { name: "pending", state: { busy: true } },
  { name: "error", state: { scenario: null, error } },
  { name: "submission-error", state: { error } },
  { name: "correct", state: opening },
  { name: "close", state: close },
  { name: "incorrect", state: feedback(mixedScenario, [35, 35, 30], 100) },
  { name: "check-feedback", state: checking },
  { name: "range-full", state: { ...opening, rangeOpen: true } },
  { name: "range-conditional", state: { ...followup, rangeOpen: true } },
  { name: "range-check", state: { ...checking, rangeOpen: true } },
  {
    name: "range-totals",
    state: { ...opening, rangeOpen: true },
    reveal: ".learn-range-totals",
  },
  {
    name: "card-factors",
    state: { ...opening, rangeOpen: true },
    reveal: ".learn-range-details > .learn-card-factors:first-of-type",
  },
  {
    name: "situation",
    state: { ...opening, rangeOpen: true },
    reveal: ".learn-range-details > .learn-card-factors:last-of-type",
  },
  {
    name: "takeaways",
    state: { ...checking, rangeOpen: true },
    reveal: ".learn-strategy-notes",
  },
  {
    name: "opponent-range",
    state: { ...followup, rangeOpen: true },
    reveal: ".learn-opponent-range",
  },
  {
    name: "opponent-hand",
    state: { ...followup, rangeOpen: true },
    opponentHand: true,
  },
  {
    name: "opponent-hand-weighted",
    state: { ...weighted, rangeOpen: true },
    opponentHand: true,
  },
];

async function revealState(component, { reveal, tooltip, opponentHand }) {
  if (reveal) await component.locator(reveal).scrollIntoViewIfNeeded();
  if (tooltip) {
    await component.getByRole("button", { name: tooltip }).focus();
    await expect(component.getByRole("tooltip")).toBeVisible();
  }
  if (opponentHand) {
    const cell = component
      .locator(".learn-opponent-range")
      .getByRole("button", { name: /^AA:/ });
    await cell.scrollIntoViewIfNeeded();
    await cell.focus();
    await expect(component.getByRole("tooltip")).toBeVisible();
  }
}

for (const visual of states) {
  const { name, state } = visual;

  test(`learn ${name}`, async ({ page }) => {
    await page.route("**/api/learn/scenario", (route) =>
      route.fulfill({ json: learnScenario }),
    );
    await page.goto("/test.html?test=learn-preflop");
    const component = page.locator("phg-learn");
    await expect(component.getByRole("slider").first()).toBeVisible();
    await component.evaluate(async (element, state) => {
      Object.assign(element, state);
      await element.updateComplete;
    }, state);
    await page.evaluate(() => document.fonts.ready);
    await waitForAvatars(page);
    await revealState(component, visual);
    await expect(page).toHaveScreenshot(`learn-${name}.png`);
  });
}
