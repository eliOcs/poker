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
  const count = await buttons.count();
  if (count === 0) return null;

  const button = buttons.nth(Math.floor(random() * count));
  const action =
    (await button.textContent())?.trim() === "Muck" ? "muck" : "show";
  await button.click({ timeout: 1000 });
  return action;
}
