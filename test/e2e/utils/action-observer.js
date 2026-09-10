/** Install in each document, including documents created by navigation. */
function observeActions() {
  window.__stressActionObserver?.disconnect();
  let previous = "";
  const inspect = () => {
    const panel = document.querySelector("phg-game phg-action-panel");
    const buttons = [...(panel?.querySelectorAll("button") ?? [])].filter(
      (button) =>
        !button.matches(":disabled, .button--pre-action") &&
        button.checkVisibility({ visibilityProperty: true }) &&
        /^(Check|Fold|Call\s+\$|Bet\b|Raise to|All-In|Buy In|Rebuy|Leave|Muck|Show\b|Call the clock)/.test(
          button.textContent.replace(/\s+/g, " ").trim(),
        ),
    );
    const signature = JSON.stringify([
      location.pathname,
      buttons.map((button) => button.textContent.replace(/\s+/g, " ").trim()),
    ]);
    if (signature === previous) return;
    previous = signature;
    // Empty choices also invalidate a notification queued during a previous turn.
    void window.__stressActionsChanged(buttons.length > 0).catch(() => {});
  };
  const observer = new MutationObserver(inspect);
  window.__stressActionObserver = observer;
  observer.observe(document, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["class", "style", "hidden", "disabled"],
  });
  inspect();
}

/**
 * Notify only when rendered decisions change; timers and other table updates
 * stay inside the browser. Observe the document so panel replacements work too.
 * @param {import('@playwright/test').Page} page
 * @param {(ready: boolean) => void} onChange
 */
export async function watchPlayerActions(page, onChange) {
  let stopped = false;
  await page.exposeBinding("__stressActionsChanged", ({ frame }, ready) => {
    if (!stopped && frame === page.mainFrame()) onChange(ready);
  });
  await page.addInitScript(observeActions);
  await page.evaluate(observeActions);
  return async () => {
    stopped = true;
    if (!page.isClosed()) {
      await page
        .evaluate(() => window.__stressActionObserver?.disconnect())
        .catch(() => {});
    }
  };
}
