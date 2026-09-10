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
  if (!(await player.isConnected())) return [];

  // Read the rendered choices together instead of checking the connection and
  // querying the browser again for each possible action.
  const [buttonTexts, hasSlider] = await Promise.all([
    player.actionPanel
      .locator("button:visible:not(.button--pre-action)")
      .allTextContents(),
    player.actionPanel.locator('input[type="range"]').isVisible(),
  ]);
  const labels = buttonTexts.map((text) => text.replace(/\s+/g, " ").trim());
  /** @type {[string, RegExp][]} */
  const buttonNames = [
    ["rebuy", /^Rebuy$/],
    ["leave", /^Leave\b/],
    ["check", /^Check$/],
    ["call", /^Call\s+\$/],
    ["fold", /^Fold$/],
    ["bet", /^Bet\b/],
    ["raise", /^Raise to\b/],
    ["allIn", /^All-In\b/],
    ["callClock", /^Call the clock$/],
  ];
  return buttonNames
    .filter(([action, pattern]) =>
      action === "allIn"
        ? hasSlider
        : labels.some((label) => pattern.test(label)),
    )
    .map(([action]) => action);
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
