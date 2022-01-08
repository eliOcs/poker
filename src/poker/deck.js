/**
 * @typedef {string} Suit
 */
/**
 * @type {[Suit]}
 */
const suits = ["hearts", "clubs", "diamonds", "spades"];

/**
 * @typedef {string} Rank
 */
/**
 * @type {[Rank]}
 */
const ranks = [
  "ace",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "jack",
  "queen",
  "king",
];

/**
 * @typedef {object} Card
 * @property {Rank} rank
 * @property {Suit} suit
 */
export function createCard({ rank, suit }) {
  if (!ranks.includes(rank)) {
    throw new Error("invalid rank");
  }
  if (!suits.includes(suit)) {
    throw new Error("invalid suit");
  }
  return { rank, suit };
}

/**
 * @returns {[Card]} deck
 */
export function create() {
  const deck = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

/**
 * @param {[Card]} deck will be altered
 * @returns {Card} random card in deck
 */
export function deal(deck) {
  const randomIndex = Math.floor(Math.random() * deck.length);
  return deck.splice(randomIndex, 1)[0];
}
