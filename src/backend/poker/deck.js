import { random } from "./rng.js";

/** @typedef {'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K'} Rank */
/** @typedef {'s' | 'h' | 'd' | 'c'} Suit */
/** @typedef {`${Rank}${Suit}`} Card */

export const HIDDEN = "??";

/** @type {Suit[]} */
const suits = /** @type {Suit[]} */ (["s", "h", "d", "c"]);

/** @type {Rank[]} */
const ranks = /** @type {Rank[]} */ ([
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "T",
  "J",
  "Q",
  "K",
]);

/**
 * @param {Rank} rank
 * @param {Suit} suit
 * @returns {Card}
 */
export function createCard(rank, suit) {
  if (!ranks.includes(rank)) {
    throw new Error("invalid rank");
  }
  if (!suits.includes(suit)) {
    throw new Error("invalid suit");
  }
  return `${rank}${suit}`;
}

/**
 * @returns {Card[]}
 */
export function create() {
  /** @type {Card[]} */
  const deck = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push(/** @type {Card} */ (`${rank}${suit}`));
    }
  }
  return deck;
}

/**
 * @param {Card[]} deck will be altered
 * @returns {Card} random card from deck
 */
export function deal(deck) {
  const randomIndex = Math.floor(random() * deck.length);
  return deck.splice(randomIndex, 1)[0];
}

/**
 * @param {Card} card
 * @returns {Rank}
 */
export function getRank(card) {
  return /** @type {Rank} */ (card.slice(0, -1));
}

/**
 * @param {Card} card
 * @returns {Suit}
 */
export function getSuit(card) {
  return /** @type {Suit} */ (card.slice(-1));
}

/**
 * @param {Card|string} card
 * @returns {boolean}
 */
export function isHidden(card) {
  return card === HIDDEN;
}

/**
 * @param {string} card
 * @returns {card is Card}
 */
export function isValidCard(card) {
  if (typeof card !== "string" || card.length !== 2) return false;
  const rank = card.slice(0, -1);
  const suit = card.slice(-1);
  return (
    ranks.includes(/** @type {Rank} */ (rank)) &&
    suits.includes(/** @type {Suit} */ (suit))
  );
}
