import { getRank, getSuit } from "./deck.js";

/** @typedef {import('./deck.js').Card} Card */
/** @typedef {import('./deck.js').Rank} Rank */
/** @typedef {import('./deck.js').Suit} Suit */

/**
 * @typedef {'royal flush'|'straight flush'|'4 of a kind'|'full house'|'flush'|'straight'|'3 of a kind'|'2 pair'|'pair'|'high card'} HandName
 */

/**
 * @typedef {object} RoyalFlush
 * @property {'royal flush'} name
 */

/**
 * @typedef {object} StraightFlush
 * @property {'straight flush'} name
 * @property {Suit} suit
 * @property {Rank} from
 * @property {Rank} to
 */

/**
 * @typedef {object} FourOfAKind
 * @property {'4 of a kind'} name
 * @property {Rank} of
 * @property {Rank} kicker
 */

/**
 * @typedef {object} FullHouse
 * @property {'full house'} name
 * @property {Rank} of
 * @property {Rank} and
 */

/**
 * @typedef {object} Flush
 * @property {'flush'} name
 * @property {Suit} suit
 * @property {Rank} high
 */

/**
 * @typedef {object} Straight
 * @property {'straight'} name
 * @property {Rank} from
 * @property {Rank} to
 */

/**
 * @typedef {object} ThreeOfAKind
 * @property {'3 of a kind'} name
 * @property {Rank} of
 * @property {Rank[]} kickers
 */

/**
 * @typedef {object} TwoPair
 * @property {'2 pair'} name
 * @property {Rank} of
 * @property {Rank} and
 * @property {Rank} kicker
 */

/**
 * @typedef {object} Pair
 * @property {'pair'} name
 * @property {Rank} of
 * @property {Rank[]} kickers
 */

/**
 * @typedef {object} HighCard
 * @property {'high card'} name
 * @property {Rank[]} ranks
 */

/**
 * @typedef {RoyalFlush|StraightFlush|FourOfAKind|FullHouse|Flush|Straight|ThreeOfAKind|TwoPair|Pair|HighCard} EvaluatedHand
 */

/**
 * @typedef {object} BestHandResult
 * @property {EvaluatedHand} hand - The evaluated hand
 * @property {Card[]} cards - The 5 cards that form this hand
 */

const last = 4;
const first = 0;

/**
 * @param {Rank} rank
 * @param {{ ace?: 'high'|'low' }} [opts]
 * @returns {number}
 */
function getRankValue(rank, { ace = "high" } = {}) {
  switch (rank) {
    case "A":
      return ace === "high" ? 14 : 1;
    case "K":
      return 13;
    case "Q":
      return 12;
    case "J":
      return 11;
    case "T":
      return 10;
    default:
      return Number(rank);
  }
}

/**
 * Sorts cards by rank (highest first)
 * @param {Card[]} cards
 * @param {{ ace?: 'high'|'low' }} [opts]
 * @returns {Card[]}
 */
function sortByRank(cards, opts) {
  return [...cards].sort(
    (a, b) => getRankValue(getRank(b), opts) - getRankValue(getRank(a), opts),
  );
}

/**
 * Checks if cards form a straight
 * @param {Card[]} cards
 * @returns {Straight|false}
 */
function getStraight(cards) {
  /** @type {Array<'high'|'low'>} */
  const aceValues = ["high", "low"];
  for (const ace of aceValues) {
    const sorted = sortByRank(cards, { ace });
    const from = getRank(sorted[last]);
    const to = getRank(sorted[first]);
    if (getRankValue(to, { ace }) - getRankValue(from, { ace }) === 4) {
      return {
        name: "straight",
        from,
        to,
      };
    }
  }

  return false;
}

/**
 * Checks if cards form a flush
 * @param {Card[]} cards
 * @returns {Flush|false}
 */
function getFlush(cards) {
  const suit = getSuit(cards[0]);
  let high = getRank(cards[0]);
  for (let i = 1; i < cards.length; i += 1) {
    if (getSuit(cards[i]) !== suit) {
      return false;
    }
    if (getRankValue(getRank(cards[i])) > getRankValue(high)) {
      high = getRank(cards[i]);
    }
  }
  return { name: "flush", suit, high };
}

/**
 * Checks for groups (pairs, trips, quads, full house)
 * @param {Card[]} cards
 * @returns {FourOfAKind|FullHouse|ThreeOfAKind|TwoPair|Pair|false|undefined}
 */
function getGroups(cards) {
  /** @type {Record<string, Card[]>} */
  const groupsByRank = {};
  for (const card of cards) {
    const rank = getRank(card);
    if (groupsByRank[rank]) {
      groupsByRank[rank].push(card);
    } else {
      groupsByRank[rank] = [card];
    }
  }
  const groups = Object.values(groupsByRank).sort(
    (a, b) => b.length - a.length,
  );

  if (groups.length === 5) {
    return false;
  }

  const [firstGroup, secondGroup, ...restOfGroups] = groups;
  const firstRank = getRank(firstGroup[0]);
  const secondRank = getRank(secondGroup[0]);

  if (firstGroup.length === 2) {
    if (secondGroup.length === 2) {
      const name = "2 pair";
      const kicker = getRank(restOfGroups[0][0]);
      if (getRankValue(firstRank) > getRankValue(secondRank)) {
        return {
          name,
          of: firstRank,
          and: secondRank,
          kicker,
        };
      } else {
        return {
          name,
          of: secondRank,
          and: firstRank,
          kicker,
        };
      }
    }

    return {
      name: "pair",
      of: firstRank,
      kickers: sortByRank(groups.slice(1).flat()).map((card) => getRank(card)),
    };
  }

  if (firstGroup.length === 3) {
    if (secondGroup.length === 2) {
      return {
        name: "full house",
        of: firstRank,
        and: secondRank,
      };
    }

    return {
      name: "3 of a kind",
      of: firstRank,
      kickers: sortByRank(groups.slice(1).flat()).map((card) => getRank(card)),
    };
  }

  if (firstGroup.length === 4) {
    return {
      name: "4 of a kind",
      of: firstRank,
      kicker: secondRank,
    };
  }

  return undefined;
}

/**
 * Creates a high card hand
 * @param {Card[]} cards
 * @returns {HighCard}
 */
function getHighCard(cards) {
  return {
    name: "high card",
    ranks: sortByRank(cards).map((card) => getRank(card)),
  };
}

/**
 * Evaluates a 5-card hand
 * @param {Card[]} cards - Exactly 5 cards
 * @returns {EvaluatedHand}
 */
function calculate(cards) {
  const groups = getGroups(cards);

  if (groups) {
    return groups;
  }

  const flush = getFlush(cards);
  const straight = getStraight(cards);

  if (flush && straight) {
    if (straight.from === "T" && straight.to === "A") {
      return { name: "royal flush" };
    } else {
      return {
        name: "straight flush",
        suit: flush.suit,
        from: straight.from,
        to: straight.to,
      };
    }
  }

  if (straight) {
    return straight;
  }

  if (flush) {
    return flush;
  }

  return getHighCard(cards);
}

const compare = {
  ranking: {
    "royal flush": 9,
    "straight flush": 8,
    "4 of a kind": 7,
    "full house": 6,
    flush: 5,
    straight: 4,
    "3 of a kind": 3,
    "2 pair": 2,
    pair: 1,
    "high card": 0,
  },

  any: function (a, b) {
    if (a.name === b.name) {
      return compare[a.name](a, b);
    } else {
      return compare.ranking[b.name] - compare.ranking[a.name];
    }
  },

  "royal flush": () => 0,

  "straight flush": (a, b) => getRankValue(b.to) - getRankValue(a.to),

  "4 of a kind": function (a, b) {
    const quadrupletComparison = getRankValue(b.of) - getRankValue(a.of);
    if (quadrupletComparison === 0) {
      return getRankValue(b.kicker) - getRankValue(a.kicker);
    } else {
      return quadrupletComparison;
    }
  },

  "full house": function (a, b) {
    const tripletRankComparison = getRankValue(b.of) - getRankValue(a.of);
    if (tripletRankComparison === 0) {
      return getRankValue(b.and) - getRankValue(a.and);
    } else {
      return tripletRankComparison;
    }
  },

  flush: (a, b) => getRankValue(b.high) - getRankValue(a.high),

  straight: (a, b) => getRankValue(b.to) - getRankValue(a.to),

  "3 of a kind": function (a, b) {
    const tripletComparison = getRankValue(b.of) - getRankValue(a.of);
    if (tripletComparison === 0) {
      for (let i = 0; i < 2; i += 1) {
        const kickerComparison =
          getRankValue(b.kickers[i]) - getRankValue(a.kickers[i]);
        if (kickerComparison === 0) {
          continue;
        } else {
          return kickerComparison;
        }
      }
      return 0;
    } else {
      return tripletComparison;
    }
  },

  "2 pair": function (a, b) {
    const firstPairComparison = getRankValue(b.of) - getRankValue(a.of);
    if (firstPairComparison === 0) {
      const secondHandComparison = getRankValue(b.and) - getRankValue(a.and);
      if (secondHandComparison === 0) {
        return getRankValue(b.kicker) - getRankValue(a.kicker);
      } else {
        return secondHandComparison;
      }
    } else {
      return firstPairComparison;
    }
  },

  pair: function (a, b) {
    const pairComparison = getRankValue(b.of) - getRankValue(a.of);
    if (pairComparison === 0) {
      for (let i = 0; i < 3; i += 1) {
        const kickerComparison =
          getRankValue(b.kickers[i]) - getRankValue(a.kickers[i]);
        if (kickerComparison === 0) {
          continue;
        } else {
          return kickerComparison;
        }
      }
      return 0;
    } else {
      return pairComparison;
    }
  },

  "high card": function (a, b) {
    for (let i = 0; i < 5; i += 1) {
      const kickerComparison =
        getRankValue(b.ranks[i]) - getRankValue(a.ranks[i]);
      if (kickerComparison === 0) {
        continue;
      } else {
        return kickerComparison;
      }
    }
    return 0;
  },
};

/**
 * Generates all k-combinations of an array
 * @template T
 * @param {T[]} array
 * @param {number} k
 * @returns {T[][]}
 */
function combinations(array, k) {
  if (k === 1) {
    return array.map((item) => [item]);
  }

  const result = [];
  for (let i = 0; i < array.length; i++) {
    const subcombinations = combinations(
      array.slice(i + 1, array.length),
      k - 1,
    );
    for (const combination of subcombinations) {
      combination.unshift(array[i]);
      result.push(combination);
    }
  }
  return result;
}

/**
 * Finds the best 5-card hand from 7 cards
 * @param {Card[]} cards - 7 cards (hole + board)
 * @returns {BestHandResult}
 */
function bestCombination(cards) {
  const combos = combinations(cards, 5);
  const evaluated = combos.map((combo) => ({
    hand: calculate(combo),
    cards: combo,
  }));
  evaluated.sort((a, b) => compare.any(a.hand, b.hand));
  return evaluated[0];
}

/**
 * @param {Rank} rank
 * @returns {string}
 */
function formatRank(rank) {
  if (rank === "T") {
    return "10";
  }
  return rank;
}

/** @type {Record<string, (hand: any) => string>} */
const HAND_FORMATTERS = {
  "royal flush": () => "Royal Flush",
  "straight flush": (h) => `Straight Flush, ${formatRank(h.to)} high`,
  "4 of a kind": (h) => `Four ${formatRank(h.of)}s`,
  "full house": (h) =>
    `Full House, ${formatRank(h.of)}s over ${formatRank(h.and)}s`,
  flush: (h) => `Flush, ${formatRank(h.high)} high`,
  straight: (h) => `Straight, ${formatRank(h.to)} high`,
  "3 of a kind": (h) => `Three ${formatRank(h.of)}s`,
  "2 pair": (h) => `Two Pair, ${formatRank(h.of)}s and ${formatRank(h.and)}s`,
  pair: (h) => `Pair of ${formatRank(h.of)}s`,
  "high card": (h) => `${formatRank(h.ranks[0])} High`,
};

/**
 * Formats an evaluated hand as a human-readable string
 * @param {EvaluatedHand} hand
 * @returns {string}
 */
function formatHand(hand) {
  const formatter = HAND_FORMATTERS[hand.name];
  return formatter ? formatter(hand) : "";
}

export default {
  calculate,
  compare: compare.any,
  bestCombination,
  formatHand,
  getRankValue,
};
