/**
 * The cards to keep on screen while they animate away, when an update takes
 * every card off; none when the cards stay, or when motion is reduced.
 * @param {string[]|undefined} before
 * @param {string[]|undefined} after
 * @returns {string[]|undefined}
 */
export function getLeavingCards(before, after) {
  if (!before?.length || after?.length) return;
  if (globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }
  return before;
}
