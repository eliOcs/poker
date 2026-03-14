import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

/**
 * @typedef {import('../types.js').Cents} Cents
 * @typedef {import('./index.js').OHHHand} OHHHand
 * @typedef {import('../tournament-summary.js').OTSSummary} OTSSummary
 * @typedef {import('../../id.js').Id} Id
 */

/**
 * OHH file representation where `winning_cards` can be explicitly null.
 * @typedef {object} OHHHandFile
 * @property {string} spec_version
 * @property {string} site_name
 * @property {string} game_number
 * @property {string} start_date_utc
 * @property {string} game_type
 * @property {{ bet_type: string }} bet_limit
 * @property {number} table_size
 * @property {number} dealer_seat
 * @property {number} small_blind_amount
 * @property {number} big_blind_amount
 * @property {number} ante_amount
 * @property {Array<{ id: string, seat: number, name: string|null, starting_stack: number }>} players
 * @property {Array<{ id: number, street: string, cards?: string[], actions: Array<object> }>} rounds
 * @property {Array<{ number: number, amount: number, winning_hand: string|null, winning_cards: string[]|null, player_wins: Array<{ player_id: string, win_amount: number, contributed_rake: number }> }>} pots
 * @property {boolean} [tournament]
 * @property {object} [tournament_info]
 */

/**
 * @param {Cents} cents
 * @returns {number}
 */
export function toDollars(cents) {
  return cents / 100;
}

/**
 * @param {number} dollars
 * @returns {Cents}
 */
export function toCents(dollars) {
  return Math.round(dollars * 100);
}

// FIFO cache for recent hands
const CACHE_LIMIT = 1000;
/** @type {Map<string, OHHHand>} */
const cache = new Map();

/**
 * Converts file-level nullable fields to app-level undefined fields.
 * @param {OHHHandFile} hand
 * @returns {OHHHand}
 */
function normalizeFromFile(hand) {
  const pots = hand.pots.map((pot) => {
    return {
      ...pot,
      winning_cards: pot.winning_cards === null ? undefined : pot.winning_cards,
    };
  });
  return { ...hand, pots };
}

/**
 * Converts app-level undefined fields to file-level null fields.
 * @param {OHHHand} hand
 * @returns {OHHHandFile}
 */
function denormalizeForFile(hand) {
  const pots = hand.pots.map((pot) => ({
    ...pot,
    winning_cards: pot.winning_cards === undefined ? null : pot.winning_cards,
  }));
  return { ...hand, pots };
}

/**
 * Gets the data directory path
 * @returns {string}
 */
export function getDataDir() {
  return process.env.DATA_DIR || "data";
}

/**
 * Writes a hand to the .ohh file
 * @param {Id} gameId
 * @param {OHHHand} hand
 */
export async function writeHandToFile(gameId, hand) {
  const dataDir = getDataDir();

  // Ensure data directory exists
  if (!existsSync(dataDir)) {
    await mkdir(dataDir, { recursive: true });
  }

  const filePath = `${dataDir}/${gameId}.ohh`;
  const content = JSON.stringify({ ohh: denormalizeForFile(hand) }) + "\n\n";

  await appendFile(filePath, content, "utf8");
}

/**
 * Reads all hands from a game's .ohh file
 * @param {Id} gameId
 * @returns {Promise<OHHHand[]>}
 */
export async function readHandsFromFile(gameId) {
  const dataDir = getDataDir();
  const filePath = `${dataDir}/${gameId}.ohh`;

  if (!existsSync(filePath)) {
    return [];
  }

  const content = await readFile(filePath, "utf8");
  const lines = content.split("\n\n").filter(Boolean);

  return lines.map((line) => normalizeFromFile(JSON.parse(line).ohh));
}

/**
 * Rewrites player ids in a game's hand history file.
 * @param {Id} gameId
 * @param {Id} fromPlayerId
 * @param {Id} toPlayerId
 * @returns {Promise<boolean>} true when the file was updated
 */
export async function rewritePlayerIdInHandHistory(
  gameId,
  fromPlayerId,
  toPlayerId,
) {
  if (fromPlayerId === toPlayerId) {
    throw new Error("Cannot rewrite hand history to the same player id");
  }

  const dataDir = getDataDir();
  const filePath = `${dataDir}/${gameId}.ohh`;
  if (!existsSync(filePath)) {
    return false;
  }

  const originalContent = await readFile(filePath, "utf8");
  const fromLiteral = JSON.stringify(fromPlayerId);
  const toLiteral = JSON.stringify(toPlayerId);
  const rewrittenContent = originalContent.replaceAll(fromLiteral, toLiteral);

  if (rewrittenContent === originalContent) return false;

  await writeFile(filePath, rewrittenContent, "utf8");

  const hands = await readHandsFromFile(gameId);
  for (const hand of hands) {
    addToCache(hand.game_number, hand);
  }

  return true;
}

/**
 * Adds a hand to the cache
 * @param {string} cacheKey
 * @param {OHHHand} hand
 */
export function addToCache(cacheKey, hand) {
  cache.set(cacheKey, normalizeFromFile(denormalizeForFile(hand)));

  // Evict oldest if over limit
  if (cache.size > CACHE_LIMIT) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
}

/**
 * Gets a hand from cache
 * @param {string} cacheKey
 * @returns {OHHHand|undefined}
 */
export function getFromCache(cacheKey) {
  return cache.get(cacheKey);
}

/**
 * Checks if a hand is in cache
 * @param {string} cacheKey
 * @returns {boolean}
 */
export function hasInCache(cacheKey) {
  return cache.has(cacheKey);
}

/**
 * Gets a hand from cache or file
 * @param {Id} gameId
 * @param {number} handNumber
 * @returns {Promise<OHHHand|undefined>}
 */
export async function getHand(gameId, handNumber) {
  const cacheKey = `${gameId}-${handNumber}`;

  // Check cache first
  if (hasInCache(cacheKey)) {
    return getFromCache(cacheKey);
  }

  // Read from file
  const hands = await readHandsFromFile(gameId);
  const hand = hands.find((h) => h.game_number === `${gameId}-${handNumber}`);

  if (hand) {
    // Add to cache for future requests
    addToCache(cacheKey, hand);
  }

  return hand;
}

/**
 * Gets all hands for a game (for list endpoint)
 * @param {Id} gameId
 * @returns {Promise<OHHHand[]>}
 */
export async function getAllHands(gameId) {
  return readHandsFromFile(gameId);
}

/**
 * Clears the cache (for testing)
 */
export function clearCache() {
  cache.clear();
}

/**
 * Gets cache size (for testing)
 * @returns {number}
 */
export function getCacheSize() {
  return cache.size;
}

/**
 * Writes a tournament summary to the .ots file
 * @param {Id} gameId
 * @param {OTSSummary} summary
 */
export async function writeTournamentSummary(gameId, summary) {
  const dataDir = getDataDir();

  // Ensure data directory exists
  if (!existsSync(dataDir)) {
    await mkdir(dataDir, { recursive: true });
  }

  const filePath = `${dataDir}/${gameId}.ots`;
  const content = JSON.stringify({ ots: summary }, null, 2);

  await writeFile(filePath, content, "utf8");
}

/**
 * Reads a tournament summary from the .ots file
 * @param {Id} gameId
 * @returns {Promise<OTSSummary|null>}
 */
export async function readTournamentSummary(gameId) {
  const filePath = `${getDataDir()}/${gameId}.ots`;

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = await readFile(filePath, "utf8");
    const parsed = JSON.parse(content);
    return parsed?.ots ? parsed.ots : null;
  } catch {
    return null;
  }
}
