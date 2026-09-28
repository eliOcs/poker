import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

const ENABLED = process.env.E2E_COVERAGE === "1";
const ROOT = process.cwd();
const recordings = new WeakMap();

/**
 * Start JS and CSS coverage on a page (no-op unless E2E_COVERAGE=1)
 * @param {import('@playwright/test').Page} page
 * @param {{ outputDir?: string }} [options]
 */
export async function startCoverage(page, { outputDir = "coverage/e2e" } = {}) {
  if (!ENABLED) return;
  await page.coverage.startJSCoverage();
  await page.coverage.startCSSCoverage();
  recordings.set(page, outputDir);
}

/**
 * Save the old document before goto/reload/back/forward destroys its counters.
 * Restart before navigating so the next document's initial scripts are covered.
 * Same-document navigation is safe too: reports merge each saved segment.
 * @param {import('@playwright/test').Page} page
 */
export async function checkpointCoverage(page) {
  const outputDir = recordings.get(page);
  if (!outputDir) return;
  await stopCoverage(page);
  await startCoverage(page, { outputDir });
}

/**
 * Stop coverage and save JS and CSS separately, with local source paths.
 * @param {import('@playwright/test').Page} page
 */
export async function stopCoverage(page) {
  const outputDir = recordings.get(page);
  if (!outputDir) return;

  const entries = await page.coverage.stopJSCoverage();
  const cssEntries = await page.coverage.stopCSSCoverage();
  recordings.delete(page);

  const stylesheets = cssEntries
    .map((entry) => {
      const filePath = urlToFilePath(entry.url);
      if (!filePath?.endsWith(".css")) return null;
      return { ...entry, url: resolve(ROOT, filePath) };
    })
    .filter(Boolean);

  mkdirSync(`${outputDir}/css/tmp`, { recursive: true });
  writeFileSync(
    `${outputDir}/css/tmp/${randomUUID()}.json`,
    JSON.stringify(stylesheets),
  );

  const result = entries
    .map((entry) => {
      const filePath = urlToFilePath(entry.url);
      if (!filePath) return null;
      return { ...entry, url: resolve(ROOT, filePath) };
    })
    .filter(Boolean);

  if (result.length === 0) return;

  mkdirSync(`${outputDir}/tmp`, { recursive: true });
  writeFileSync(
    `${outputDir}/tmp/${randomUUID()}.json`,
    JSON.stringify({ result }),
  );
}

/**
 * Convert a served URL to a local source file path
 * @param {string} url
 * @returns {string | null}
 */
function urlToFilePath(url) {
  let pathname;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return null;
  }

  // Skip node_modules (lit, etc.)
  if (pathname.includes("/node_modules/")) return null;

  // /src/frontend/foo.js → src/frontend/foo.js
  if (pathname.startsWith("/src/frontend/")) {
    return pathname.slice(1);
  }

  // /src/shared/foo.js → src/shared/foo.js
  if (pathname.startsWith("/src/shared/")) {
    return pathname.slice(1);
  }

  // Legacy root-served frontend modules (/app.js) still map to src/frontend/*.
  if (pathname.startsWith("/") && /\.(js|css)$/.test(pathname)) {
    return `src/frontend${pathname}`;
  }

  return null;
}
