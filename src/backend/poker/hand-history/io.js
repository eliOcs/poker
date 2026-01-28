import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

/**
 * @typedef {import('../types.js').Cents} Cents
 * @typedef {import('./index.js').OHHHand} OHHHand
 * @typedef {import('../tournament-summary.js').OTSSummary} OTSSummary
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
 * Gets the data directory path
 * @returns {string}
 */
export function getDataDir() {
  return process.env.DATA_DIR || "data";
}

/**
 * Writes a hand to the .ohh file
 * @param {string} gameId
 * @param {OHHHand} hand
 */
export async function writeHandToFile(gameId, hand) {
  const dataDir = getDataDir();

  // Ensure data directory exists
  if (!existsSync(dataDir)) {
    await mkdir(dataDir, { recursive: true });
  }

  const filePath = `${dataDir}/${gameId}.ohh`;
  const content = JSON.stringify({ ohh: hand }) + "\n\n";

  await appendFile(filePath, content, "utf8");
}

/**
 * Reads all hands from a game's .ohh file
 * @param {string} gameId
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

  return lines.map((line) => JSON.parse(line).ohh);
}

/**
 * Adds a hand to the cache
 * @param {string} cacheKey
 * @param {OHHHand} hand
 */
export function addToCache(cacheKey, hand) {
  cache.set(cacheKey, hand);

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
 * @param {string} gameId
 * @param {number} handNumber
 * @returns {Promise<OHHHand|null>}
 */
export async function getHand(gameId, handNumber) {
  const cacheKey = `${gameId}-${handNumber}`;

  // Check cache first
  if (hasInCache(cacheKey)) {
    return getFromCache(cacheKey) || null;
  }

  // Read from file
  const hands = await readHandsFromFile(gameId);
  const hand = hands.find((h) => h.game_number === `${gameId}-${handNumber}`);

  if (hand) {
    // Add to cache for future requests
    addToCache(cacheKey, hand);
  }

  return hand || null;
}

/**
 * Gets all hands for a game (for list endpoint)
 * @param {string} gameId
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
 * @param {string} gameId
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
