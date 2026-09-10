/**
 * Show either card, both cards, or muck using the options currently on screen.
 * These decisions can appear after folding, outside the player's betting turn.
 * @param {import('./poker-player.js').PokerPlayer} player
 * @param {() => number} [random]
 * @returns {Promise<'muck'|'show'|null>}
 */
export async function takeRandomCardAction(player, random = Math.random) {
  if (!(await player.isConnected())) return null;
  const buttons = player.cardDecisionButtons;
  // These choices can disappear as the hand advances. Capture their text in
  // one non-waiting read; count() followed by textContent() can otherwise wait
  // the full action timeout for an option that no longer exists.
  const labels = await buttons.allTextContents();
  if (labels.length === 0) return null;

  const index = Math.floor(random() * labels.length);
  const label = labels[index].replace(/\s+/g, " ").trim();
  const button = buttons.nth(index);
  const action = label === "Muck" ? "muck" : "show";
  await button.click({ timeout: 1000 });
  return action;
}
