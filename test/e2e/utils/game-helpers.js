/**
 * Create a new game via the UI home page
 * @param {import('./poker-player.js').PokerPlayer} player - Player who creates the game
 * @param {{ type?: 'cash' | 'sitngo' | 'tournament', stakesIndex?: number, buyInIndex?: number }} [options]
 */
export async function createGame(player, options = {}) {
  const { stakesIndex, buyInIndex } = options;
  const type =
    options.type === "tournament" ? "sitngo" : options.type || "cash";
  const page = player.page;

  await page.goto("/");

  if (type === "sitngo") {
    await page.getByLabel("Sit & Go").click();
    if (buyInIndex !== undefined) {
      await page.locator("select").first().selectOption(String(buyInIndex));
    }
  } else if (stakesIndex !== undefined) {
    await page.locator("select").first().selectOption(String(stakesIndex));
  }

  await page.getByRole("button", { name: "Create Game" }).click();
  await page.waitForURL(
    type === "sitngo" ? /\/sitngo\/[a-z0-9]+$/ : /\/cash\/[a-z0-9]+$/,
  );

  // Wait for game UI to load
  await player.game.waitFor();
  await player.board.waitFor();
}
