/**
 * Page Debug Utility
 *
 * Attaches console/error listeners to Playwright pages for debugging.
 * Can be used with both e2e tests and UI catalog tests.
 */

/**
 * Attach debug listeners to a Playwright page
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {object} [options]
 * @param {string} [options.prefix=''] - Prefix for log messages (e.g., player name)
 * @param {boolean} [options.logRequests=false] - Log all HTTP requests
 * @param {boolean} [options.logResponses=false] - Log all HTTP responses
 * @param {boolean} [options.logErrorsOnly=true] - Only log error responses (4xx/5xx)
 */
export function attachDebugListeners(page, options = {}) {
  const {
    prefix = "",
    logRequests = false,
    logResponses = false,
    logErrorsOnly = true,
  } = options;

  const tag = prefix ? `[${prefix}] ` : "";
  const formatLocation = (location) => {
    if (!location?.url) return "";
    return ` (${location.url}:${location.lineNumber}:${location.columnNumber})`;
  };

  const logStack = (label, stack) => {
    if (!stack) return;
    const normalized = String(stack).trim();
    if (!normalized) return;
    console.log(`${tag}${label} STACK:\n${normalized}`);
  };

  const readErrorStack = async (arg) => {
    try {
      return await arg.evaluate((value) => {
        if (value instanceof Error) return value.stack || value.message || null;
        if (
          value &&
          typeof value === "object" &&
          typeof value.stack === "string"
        ) {
          return value.stack;
        }
        return null;
      });
    } catch {
      return null;
    }
  };

  // Console messages from the page
  page.on("console", async (msg) => {
    const type = msg.type();
    const text = msg.text();
    const location = formatLocation(msg.location());
    // Skip verbose messages unless they're errors/warnings
    if (type === "error" || type === "warning") {
      console.log(`${tag}CONSOLE ${type.toUpperCase()}: ${text}${location}`);
      if (type === "error") {
        const args = msg.args();
        let stackCount = 0;
        for (const arg of args) {
          const stack = await readErrorStack(arg);
          if (stack) {
            stackCount += 1;
            const label =
              stackCount === 1
                ? "CONSOLE ERROR"
                : `CONSOLE ERROR [${stackCount}]`;
            logStack(label, stack);
          }
        }
      }
    } else if (!logErrorsOnly) {
      console.log(`${tag}CONSOLE ${type}: ${text}${location}`);
    }
  });

  // JavaScript errors on the page
  page.on("pageerror", (err) => {
    console.log(`${tag}PAGE ERROR: ${err.message}`);
    logStack("PAGE ERROR", err.stack);
  });

  // Failed network requests
  page.on("requestfailed", (req) => {
    console.log(
      `${tag}REQUEST FAILED: ${req.url()} - ${req.failure()?.errorText}`,
    );
  });

  // HTTP responses (errors or all)
  if (logResponses || logErrorsOnly) {
    page.on("response", (res) => {
      const status = res.status();
      if (status >= 400) {
        console.log(`${tag}HTTP ${status}: ${res.url()}`);
      } else if (logResponses) {
        console.log(`${tag}HTTP ${status}: ${res.url()}`);
      }
    });
  }

  // HTTP requests
  if (logRequests) {
    page.on("request", (req) => {
      console.log(`${tag}REQUEST: ${req.method()} ${req.url()}`);
    });
  }
}

/**
 * Standalone debug script runner for manual testing
 * @param {string} url - URL to load
 * @param {string} selector - Selector to wait for
 * @param {number} [timeout=5000] - Timeout in ms
 */
export async function debugPage(url, selector, timeout = 5000) {
  const { chromium } = await import("@playwright/test");

  const browser = await chromium.launch();
  const page = await browser.newPage();

  attachDebugListeners(page, { logErrorsOnly: false });

  console.log(`Loading ${url}...`);
  await page.goto(url);
  console.log("Page loaded, waiting for component...");

  try {
    await page.locator(selector).waitFor({ timeout });
    console.log(`Component ${selector} found!`);
  } catch {
    console.log(`Component ${selector} NOT found after ${timeout}ms`);
    console.log("Page content:", (await page.content()).slice(0, 1000));
  }

  await browser.close();
}
