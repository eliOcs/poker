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

/** @param {number} ms */
export async function delay(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
