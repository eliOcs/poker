/**
 * Whether cards cleared off the table animate away; not when motion is reduced.
 */
export function animatesLeaving() {
  return !globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * The cards to keep on screen while they animate away, when an update takes
 * every card off; none when the cards stay, or when motion is reduced.
 * @param {string[]|undefined} before
 * @param {string[]|undefined} after
 * @returns {string[]|undefined}
 */
export function getLeavingCards(before, after) {
  if (!before?.length || after?.length || !animatesLeaving()) return;
  return before;
}
