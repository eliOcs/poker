import { formatError } from "./stress-helpers.js";

const EMOTES = ["🤣", "😎", "🤨", "🤯", "🥶", "🤑"];
const MESSAGES = [
  "Nice hand!",
  "Good luck everyone!",
  "The river keeps things interesting.",
  "One more hand?",
  "That was a tough decision!",
  "I came for the cards, stayed for the company.",
];

/**
 * @param {import('./poker-player.js').PokerPlayer} player
 * @param {Map<import('./poker-player.js').PokerPlayer, number>} nextSocialAt
 * @param {() => number} [random]
 */
export async function takeRandomSocialAction(
  player,
  nextSocialAt,
  random = Math.random,
) {
  const now = Date.now();
  if (now < (nextSocialAt.get(player) ?? 0)) return null;
  nextSocialAt.set(player, now + 8000 + Math.floor(random() * 12000));

  const available = [];
  if (await player.hasAction("emote")) available.push("emote");
  if (await player.hasAction("chat")) available.push("chat");
  if (available.length === 0) return null;
  const action = available[Math.floor(random() * available.length)];
  const values = action === "emote" ? EMOTES : MESSAGES;
  const value = values[Math.floor(random() * values.length)];
  await player[action](value, { timeout: 1000 });
  return { action, value };
}

/**
 * Run between betting passes so a player's modal and betting clicks never race.
 * @param {import('./poker-player.js').PokerPlayer[]} players
 * @param {Map<import('./poker-player.js').PokerPlayer, number>} nextSocialAt
 * @param {{logActions?: boolean}} [options]
 */
export async function playRandomSocialActions(
  players,
  nextSocialAt,
  { logActions = true } = {},
) {
  await Promise.all(
    players.map(async (player) => {
      try {
        const result = await takeRandomSocialAction(player, nextSocialAt);
        if (result && logActions)
          console.log(`${player.name} ${result.action}: ${result.value}`);
      } catch (error) {
        console.log(
          `${player.name} social action failed: ${formatError(error)}`,
        );
        // A table move or turn change may interrupt the dialog. Clear it before betting.
        if (!player.page.isClosed()) {
          await player.page.keyboard.press("Escape").catch((error) => {
            console.log(
              `${player.name} dialog cleanup failed: ${formatError(error)}`,
            );
          });
        }
      }
    }),
  );
}
