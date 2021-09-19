import joi from "joi";

const suits = ["hearts", "clubs", "diamonds", "spades"];

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

export const cardSchema = joi.object({
  suit: joi.string().valid(...suits),
  rank: joi.string().valid(...ranks),
});

export function create() {
  const deck = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

export function deal(deck) {
  const randomIndex = Math.floor(Math.random() * deck.length);
  return deck.splice(randomIndex, 1)[0];
}
