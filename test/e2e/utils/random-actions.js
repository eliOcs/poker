const WEIGHTED_ACTIONS = [
  { threshold: 0.02, action: "allIn" },
  { threshold: 0.25, action: "raise" },
  { threshold: 0.25, action: "bet" },
  { threshold: 0.6, action: "call" },
];

const PASSIVE_FALLBACKS = ["check", "fold"];

/**
 * Get available actions for a player.
 * @param {import('./poker-player.js').PokerPlayer} player
 * @returns {Promise<string[]>}
 */
export async function getAvailableActions(player) {
  const actions = [];
  if (await player.hasAction("rebuy")) actions.push("rebuy");
  if (await player.hasAction("leave")) actions.push("leave");
  if (await player.hasAction("check")) actions.push("check");
  if (await player.hasAction("call")) actions.push("call");
  if (await player.hasAction("fold")) actions.push("fold");
  if (await player.hasAction("bet")) actions.push("bet");
  if (await player.hasAction("raise")) actions.push("raise");
  if (await player.hasAction("allIn")) actions.push("allIn");
  if (await player.hasAction("callClock")) actions.push("callClock");
  return actions;
}

/**
 * Select an action using a random weighted strategy.
 * @param {string[]} availableActions
 * @returns {string}
 */
export function selectRandomAction(availableActions) {
  if (availableActions.includes("rebuy")) {
    return Math.random() < 0.5 ? "rebuy" : "leave";
  }
  const roll = Math.random();
  for (const { threshold, action } of WEIGHTED_ACTIONS) {
    if (roll < threshold && availableActions.includes(action)) return action;
  }
  const fallback = PASSIVE_FALLBACKS.find((action) =>
    availableActions.includes(action),
  );
  return fallback || availableActions[0];
}
