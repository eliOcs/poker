import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

const ENABLED = process.env.E2E_COVERAGE === "1";
const OUTPUT_DIR = "coverage/e2e/tmp";
const ROOT = process.cwd();

/**
 * Start JS coverage collection on a page (no-op unless E2E_COVERAGE=1)
 * @param {import('@playwright/test').Page} page
 */
export async function startCoverage(page) {
  if (!ENABLED) return;
  await page.coverage.startJSCoverage({ resetOnNavigation: false });
}

/**
 * Stop JS coverage, rewrite URLs to local paths, and write V8 JSON
 * @param {import('@playwright/test').Page} page
 */
export async function stopCoverage(page) {
  if (!ENABLED) return;

  const entries = await page.coverage.stopJSCoverage();

  const result = entries
    .map((entry) => {
      const filePath = urlToFilePath(entry.url);
      if (!filePath) return null;
      return { ...entry, url: resolve(ROOT, filePath) };
    })
    .filter(Boolean);

  if (result.length === 0) return;

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(
    `${OUTPUT_DIR}/${randomUUID()}.json`,
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
  if (pathname.startsWith("/") && pathname.endsWith(".js")) {
    return `src/frontend${pathname}`;
  }

  return null;
}
