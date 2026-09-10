/* global document, HTMLElement */
import { expect } from "@playwright/test";

async function verifyLobbyLayout(testCase, page, component) {
  const viewport = page.viewportSize();
  if (!viewport) {
    throw new Error("UI catalog tests require a configured viewport");
  }
  const viewportHeight = viewport.height;
  await expect(
    page.locator(
      "phg-app-shell > .app-shell-layout > .app-shell-content > phg-mtt-lobby",
    ),
  ).toHaveCount(1);
  const lobbyHeight = await component.evaluate(
    (element) => element.getBoundingClientRect().height,
  );
  const drawerHeight = await component
    .locator(".drawer-panel")
    .evaluate((element) => element.getBoundingClientRect().height);
  expect(lobbyHeight).toBeGreaterThanOrEqual(viewportHeight);
  expect(drawerHeight).toBeGreaterThanOrEqual(viewportHeight);

  if (testCase === "mtt-lobby-running-multiple-tables") {
    const layout = await component.evaluate((element) => {
      const main = element.querySelector(".main");
      if (!(main instanceof HTMLElement)) {
        throw new Error("Expected the MTT lobby main content element");
      }
      return {
        documentScrollHeight: document.documentElement.scrollHeight,
        mainClientHeight: main.clientHeight,
        mainScrollHeight: main.scrollHeight,
      };
    });
    expect(layout.documentScrollHeight).toBe(viewportHeight);
    expect(layout.mainScrollHeight).toBeGreaterThan(layout.mainClientHeight);
  }

  if (testCase === "mtt-lobby-registration-owner-can-start") {
    await expect(component.locator("h1 phg-edit-label")).toHaveCount(1);
    const width = await component.evaluate((element) => {
      const main = element.querySelector(".main");
      if (!(main instanceof HTMLElement)) {
        throw new Error("Expected the MTT lobby main content element");
      }
      return {
        client: main.clientWidth,
        scroll: main.scrollWidth,
      };
    });
    expect(width.scroll).toBe(width.client);
  }
}

async function reveal(target) {
  await target.scrollIntoViewIfNeeded();
  await expect(target).toBeInViewport({ ratio: 1 });
}

function captureTarget(testCase, component) {
  if (testCase === "mtt-lobby-running-multiple-tables") {
    return component.locator(".tables");
  }
  if (
    testCase === "mtt-lobby-running-waiting-for-table" ||
    testCase.startsWith("mtt-lobby-finished")
  ) {
    return component.locator(".table-wrap");
  }
  if (testCase.endsWith("on-break") || testCase.endsWith("pending-break")) {
    return component.locator(".stat").filter({ hasText: "Clock" });
  }
  return component.locator(".action-row").first();
}

async function verifyLobbyScenario(testCase, component) {
  if (testCase === "mtt-lobby-registration-action-pending") {
    await expect(
      component.getByRole("button", { name: "Unregister", exact: true }),
    ).toBeDisabled();
    await expect(
      component.getByRole("button", { name: "Start Tournament", exact: true }),
    ).toBeDisabled();
  }
  if (testCase === "mtt-lobby-running-waiting-for-table") {
    await expect(
      component.getByRole("cell", { name: "Waiting for table", exact: true }),
    ).toBeInViewport({ ratio: 1 });
  }
  if (testCase === "mtt-lobby-running-multiple-tables") {
    await expect(
      component
        .locator(".table-card.current")
        .getByRole("button", { name: "Open My Table" }),
    ).toBeInViewport({ ratio: 1 });
    await expect(
      component.getByRole("button", { name: "Open Table", exact: true }),
    ).toBeInViewport({ ratio: 1 });
    await expect(
      component
        .locator(".table-card.closed")
        .getByRole("button", { name: "Show History" }),
    ).toBeInViewport({ ratio: 1 });
  }
  const clock = {
    "mtt-lobby-running-on-break": "Break 1:30",
    "mtt-lobby-running-pending-break": "Level 2 • Break pending",
  }[testCase];
  if (clock)
    await expect(
      component.locator(".stat").filter({ hasText: "Clock" }).locator(".value"),
    ).toHaveText(clock);
}

export async function prepareMttTestCase(testCase, page, component) {
  if (!testCase.startsWith("mtt-lobby-")) return;
  await verifyLobbyLayout(testCase, page, component);
  if (["mtt-lobby-loading", "mtt-lobby-error"].includes(testCase)) return;

  // Keep one initial mobile view; scenario captures reveal the internal scroll area.
  if (
    testCase === "mtt-lobby-registration-owner-can-start" &&
    page.viewportSize().width < 600
  ) {
    await expect(page).toHaveScreenshot(`${testCase}-header.png`, {
      fullPage: true,
    });
  }
  await reveal(captureTarget(testCase, component));
  await verifyLobbyScenario(testCase, component);
}

export async function captureMttDetails(testCase, page, component) {
  if (testCase === "mtt-lobby-running-multiple-tables") {
    await reveal(component.locator(".table-wrap"));
    await expect(
      component.getByRole("cell", { name: "Eliminated", exact: true }),
    ).toHaveCount(2);
    await expect(page).toHaveScreenshot(`${testCase}-standings.png`, {
      fullPage: true,
    });
  }
  if (
    testCase === "mtt-lobby-finished-as-winner" &&
    page.viewportSize().width < 600
  ) {
    // Preserve the left-hand player/status view and also cover the overflowed results.
    await component.locator(".table-wrap").evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
    });
    await expect(component.locator("td.positive")).toBeInViewport({ ratio: 1 });
    await expect(component.locator("td.negative")).toBeInViewport({ ratio: 1 });
    await expect(page).toHaveScreenshot(`${testCase}-results.png`, {
      fullPage: true,
    });
  }
}
