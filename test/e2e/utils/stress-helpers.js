/**
 * @param {unknown} err
 * @returns {string}
 */
export function formatError(err) {
  return err instanceof Error ? err.message : String(err);
}

/**
 * @param {{lastProgressAt: number, lastProgressReason: string}} state
 * @param {string} reason
 */
export function markProgress(state, reason) {
  state.lastProgressAt = Date.now();
  state.lastProgressReason = reason;
}

/**
 * @template T
 * @param {T[]} items
 * @param {(item: T, index: number) => Promise<void>} task
 */
export async function runSequentially(items, task) {
  for (let index = 0; index < items.length; index += 1) {
    await task(items[index], index);
  }
}

/** @param {number} ms */
export async function delay(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
