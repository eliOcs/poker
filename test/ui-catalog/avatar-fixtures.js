import { readFileSync } from "node:fs";
import { canonicalizeAvatar, DEFAULT_AVATAR } from "../../src/shared/avatar.js";

const fixtures = JSON.parse(
  readFileSync(new URL("./avatars.json", import.meta.url), "utf8"),
);

// Saved output from the avatar editor, randomized once with fixtures.seed.
const avatars = fixtures.avatars.map(canonicalizeAvatar);

/** Keep each fixture player's appearance stable across pages and test order. */
export function getCatalogAvatar(playerId) {
  if (playerId === "lz1abc12x9k2") {
    return { revision: "catalog-avatar", avatar: DEFAULT_AVATAR };
  }
  let hash = 0;
  for (const character of playerId) {
    hash = (Math.imul(hash, 31) + character.codePointAt(0)) >>> 0;
  }
  return {
    revision: fixtures.revision,
    avatar: avatars[hash % avatars.length],
  };
}
