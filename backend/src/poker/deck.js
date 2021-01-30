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

const schema = joi.object({
  suit: joi.string().valid(...suits),
  rank: joi.string().valid(...ranks),
});

function create() {
  const deck = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

function deal(deck, number) {
  const dealt = [];
  const remaining = deck;
  for (let i = 0; i < number; i += 1) {
    const randomIndex = Math.floor(Math.random() * remaining.length);
    dealt.push(remaining.splice(randomIndex, 1));
  }
  return { remaining, dealt };
}

function validateCard(card) {
  joi.assert(card, schema);
}

export default { create, validateCard, deal };
