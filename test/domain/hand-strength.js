"use strict";
const tap = require("tap");
const handStrength = require("../../src/domain/hand-strength");

tap.same(
  handStrength([
    { rank: "ace", suit: "clubs" },
    { rank: "king", suit: "clubs" },
    { rank: "queen", suit: "clubs" },
    { rank: "jack", suit: "clubs" },
    { rank: "10", suit: "clubs" },
  ]),
  { name: "royal flush" }
);

tap.same(
  handStrength([
    { rank: "3", suit: "hearts" },
    { rank: "4", suit: "hearts" },
    { rank: "5", suit: "hearts" },
    { rank: "6", suit: "hearts" },
    { rank: "7", suit: "hearts" },
  ]),
  { name: "straight flush", from: "3", to: "7" }
);

tap.same(
  handStrength([
    { rank: "3", suit: "hearts" },
    { rank: "king", suit: "hearts" },
    { rank: "king", suit: "clubs" },
    { rank: "king", suit: "spades" },
    { rank: "king", suit: "diamonds" },
  ]),
  { name: "4 of a kind", of: "king" }
);

tap.same(
  handStrength([
    { rank: "3", suit: "hearts" },
    { rank: "3", suit: "diamonds" },
    { rank: "10", suit: "hearts" },
    { rank: "10", suit: "clubs" },
    { rank: "10", suit: "spades" },
  ]),
  { name: "full house", of: "10", and: "3" }
);

tap.same(
  handStrength([
    { rank: "queen", suit: "diamonds" },
    { rank: "10", suit: "diamonds" },
    { rank: "7", suit: "diamonds" },
    { rank: "4", suit: "diamonds" },
    { rank: "2", suit: "diamonds" },
  ]),
  { name: "flush", high: "queen" }
);

tap.same(
  handStrength([
    { rank: "ace", suit: "clubs" },
    { rank: "2", suit: "diamonds" },
    { rank: "3", suit: "hearts" },
    { rank: "4", suit: "splades" },
    { rank: "5", suit: "hearts" },
  ]),
  { name: "straight", from: "ace", to: "5" }
);

tap.same(
  handStrength([
    { rank: "ace", suit: "clubs" },
    { rank: "5", suit: "hearts" },
    { rank: "2", suit: "diamonds" },
    { rank: "2", suit: "hearts" },
    { rank: "2", suit: "splades" },
  ]),
  { name: "3 of a kind", of: "2", kickers: ["ace", "5"] }
);

tap.same(
  handStrength([
    { rank: "jack", suit: "clubs" },
    { rank: "jack", suit: "hearts" },
    { rank: "4", suit: "diamonds" },
    { rank: "4", suit: "hearts" },
    { rank: "9", suit: "splades" },
  ]),
  { name: "2 pair", of: "jack", and: "4", kicker: "9" }
);

tap.same(
  handStrength([
    { rank: "3", suit: "clubs" },
    { rank: "jack", suit: "hearts" },
    { rank: "4", suit: "diamonds" },
    { rank: "4", suit: "hearts" },
    { rank: "9", suit: "splades" },
  ]),
  { name: "1 pair", of: "4", kickers: ["jack", "9", "3"] }
);

tap.same(
  handStrength([
    { rank: "3", suit: "clubs" },
    { rank: "jack", suit: "hearts" },
    { rank: "4", suit: "diamonds" },
    { rank: "king", suit: "hearts" },
    { rank: "9", suit: "splades" },
  ]),
  { name: "high card", rank: "king", kickers: ["jack", "9", "4", "3"] }
);
