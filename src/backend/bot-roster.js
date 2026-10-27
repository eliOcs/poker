import { randomAvatar } from "../shared/avatar.js";
import { getAvatarRevision } from "./avatar.js";
import { mulberry32 } from "./poker/rng.js";

/**
 * @typedef {import('./poker/seat.js').Player} Player
 * @typedef {import('../shared/avatar.js').AvatarConfiguration} AvatarConfiguration
 */

const NAMES = [
  "Ada",
  "Bit",
  "Chip",
  "Dot",
  "Echo",
  "Gizmo",
  "Hal",
  "Pixel",
  "Robo",
  "Sparky",
  "Turing",
  "Volt",
];

/**
 * The bots a table draws its opponents from. Each keeps the same generated
 * avatar for good, so a bot looks the same at every table and after restarts.
 * Ids are shorter than generated user ids, so they never collide.
 * @type {ReadonlyArray<{ player: Player, avatar: AvatarConfiguration }>}
 */
export const BOTS = NAMES.map((name, index) => {
  const avatar = randomAvatar(mulberry32(index + 1));
  return {
    player: {
      id: `bot${name.toLowerCase()}`,
      name,
      avatarRevision: getAvatarRevision(avatar),
      bot: true,
    },
    avatar,
  };
});

/**
 * @param {string} playerId
 * @returns {AvatarConfiguration|undefined}
 */
export function getBotAvatar(playerId) {
  return BOTS.find((bot) => bot.player.id === playerId)?.avatar;
}
