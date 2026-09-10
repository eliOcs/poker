import { watchPlayerActions } from "./action-observer.js";

/**
 * One serial queue per page. Notifications received during a click are
 * coalesced, while other pages can act without waiting for this queue.
 * @param {import('@playwright/test').Page} page
 * @param {{act: () => Promise<unknown>, social?: () => Promise<unknown>, onError: (error: unknown) => void}} tasks
 */
export async function startActionRunner(page, tasks) {
  let stopped = false;
  let pending = false;
  let socialPending = false;
  let running;
  let retryTimer;

  function wake(ready) {
    if (stopped || page.isClosed()) return;
    pending = ready;
    if (!running && !stopped) {
      running = drain().finally(() => {
        running = undefined;
        if (pending || socialPending) wake(pending);
      });
    }
  }

  async function drain() {
    while (!stopped && !page.isClosed() && (pending || socialPending)) {
      const action = pending;
      if (action) pending = false;
      else socialPending = false;
      try {
        await (action ? tasks.act() : tasks.social?.());
      } catch (error) {
        tasks.onError(error);
        // Retry an interrupted interaction locally, without polling idle tabs.
        clearTimeout(retryTimer);
        retryTimer = setTimeout(() => wake(true), 1000);
      }
    }
  }

  const stopWatching = await watchPlayerActions(page, wake);

  async function stop() {
    stopped = true;
    pending = false;
    socialPending = false;
    clearTimeout(retryTimer);
    await stopWatching();
    await running;
    // An in-flight task may have scheduled a retry during shutdown.
    clearTimeout(retryTimer);
  }

  return {
    stop,
    requestSocial() {
      if (stopped || !tasks.social) return;
      socialPending = true;
      wake(pending);
    },
  };
}
