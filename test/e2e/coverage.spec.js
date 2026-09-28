/* eslint-disable playwright/no-conditional-in-test -- Each case exercises a different navigation API. */
import { test, expect } from "@playwright/test";
import { globSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  checkpointCoverage,
  startCoverage,
  stopCoverage,
} from "./utils/coverage.js";
import { PokerPlayer } from "./utils/poker-player.js";

// eslint-disable-next-line playwright/no-skipped-test -- Collection is intentionally disabled in ordinary E2E runs.
test.skip(process.env.E2E_COVERAGE !== "1", "Requires E2E_COVERAGE=1");

const css = ".before { color: red; }\n.after { color: blue; }";
const script = `
function beforeNavigation() { document.querySelector('button').className = 'before'; }
function afterNavigation() { document.querySelector('button').className = 'after'; }
function initialisePage() { document.querySelector('button').dataset.ready = 'true'; }
initialisePage();
`;

async function installProbe(page) {
  await page.route("http://coverage.test/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith(".js")) {
      return route.fulfill({ contentType: "text/javascript", body: script });
    }
    if (path.endsWith(".css")) {
      return route.fulfill({ contentType: "text/css", body: css });
    }
    return route.fulfill({
      contentType: "text/html",
      body: `<link rel="stylesheet" href="/probe.css">
        <button onclick="beforeNavigation()">Before</button>
        <button onclick="afterNavigation()">After</button>
        <a href="/second">Next page</a>
        <script src="/probe.js"></script>`,
    });
  });
}

function readRecordings(outputDir) {
  const js = globSync(join(outputDir, "tmp/*.json")).flatMap(
    (path) => JSON.parse(readFileSync(path, "utf8")).result,
  );
  const styles = globSync(join(outputDir, "css/tmp/*.json")).flatMap((path) =>
    JSON.parse(readFileSync(path, "utf8")),
  );
  return {
    calls: (name) =>
      js
        .flatMap((entry) => entry.functions)
        .filter((fn) => fn.functionName === name && fn.ranges[0].count > 0),
    covered: (text) =>
      styles.some((entry) =>
        entry.ranges.some((range) =>
          entry.text.slice(range.start, range.end).includes(text),
        ),
      ),
  };
}

for (const method of ["goto", "reload", "goBack", "goForward", "link"]) {
  test(`coverage preserves JS and CSS before ${method} and early page closure`, async ({
    page,
    context,
  }, testInfo) => {
    const outputDir = testInfo.outputPath("coverage");
    await installProbe(page);
    await startCoverage(page, { outputDir });
    await checkpointCoverage(page);
    await page.goto("http://coverage.test/first");
    if (method === "goBack" || method === "goForward") {
      await checkpointCoverage(page);
      await page.goto("http://coverage.test/second");
    }
    if (method === "goForward") {
      await checkpointCoverage(page);
      await page.goBack();
    }

    await page.getByRole("button", { name: "Before", exact: true }).click();
    await expect(page.locator(".before")).toHaveCSS("color", "rgb(255, 0, 0)");
    await checkpointCoverage(page);
    if (method === "goto") await page.goto("http://coverage.test/second");
    else if (method === "link") await page.getByRole("link").click();
    else await page[method]();

    await page.getByRole("button", { name: "After", exact: true }).click();
    await expect(page.locator(".after")).toHaveCSS("color", "rgb(0, 0, 255)");
    const player = new PokerPlayer(context, page, "Coverage probe");
    await player.close();
    // Fixture teardown may attempt a second stop after an early close.
    await stopCoverage(page);

    const coverage = readRecordings(outputDir);
    expect(coverage.calls("beforeNavigation")).toHaveLength(1);
    expect(coverage.calls("afterNavigation")).toHaveLength(1);
    expect(coverage.calls("initialisePage").length).toBeGreaterThanOrEqual(2);
    expect(coverage.covered(".before")).toBe(true);
    expect(coverage.covered(".after")).toBe(true);
  });
}
