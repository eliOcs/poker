const last = 4;
const first = 0;

function getRankValue(rank, { ace = "high" } = {}) {
  switch (rank) {
    case "ace":
      return ace === "high" ? 14 : 1;
    case "king":
      return 13;
    case "queen":
      return 12;
    case "jack":
      return 11;
    default:
      return Number(rank);
  }
}

function sortByRank(cards, opts) {
  return [...cards].sort(
    (a, b) => getRankValue(b.rank, opts) - getRankValue(a.rank, opts)
  );
}

function getStraight(cards) {
  for (const ace of ["high", "low"]) {
    const sorted = sortByRank(cards, { ace });
    const from = sorted[last].rank;
    const to = sorted[first].rank;
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

function getFlush(cards) {
  const suit = cards[0].suit;
  let high = cards[0].rank;
  for (let i = 1; i < cards.length; i += 1) {
    if (cards[i].suit !== suit) {
      return false;
    }
    if (getRankValue(cards[i].rank) > getRankValue(high)) {
      high = cards[i].rank;
    }
  }
  return { name: "flush", suit, high };
}

function getGroups(cards) {
  let groups = {};
  for (const card of cards) {
    if (groups[card.rank]) {
      groups[card.rank].push(card);
    } else {
      groups[card.rank] = [card];
    }
  }
  groups = Object.values(groups).sort((a, b) => b.length - a.length);

  if (groups.length === 5) {
    return false;
  }

  const [firstGroup, secondGroup, ...restOfGroups] = groups;

  if (firstGroup.length === 2) {
    if (secondGroup.length === 2) {
      const name = "2 pair";
      const kicker = restOfGroups[0][0].rank;
      if (
        getRankValue(firstGroup[0].rank) > getRankValue(secondGroup[0].rank)
      ) {
        return {
          name,
          of: firstGroup[0].rank,
          and: secondGroup[0].rank,
          kicker,
        };
      } else {
        return {
          name,
          of: secondGroup[0].rank,
          and: firstGroup[0].rank,
          kicker,
        };
      }
    }

    return {
      name: "pair",
      of: firstGroup[0].rank,
      kickers: sortByRank(groups.slice(1).flat()).map((card) => card.rank),
    };
  }

  if (firstGroup.length === 3) {
    if (secondGroup.length === 2) {
      return {
        name: "full house",
        of: firstGroup[0].rank,
        and: secondGroup[0].rank,
      };
    }

    return {
      name: "3 of a kind",
      of: firstGroup[0].rank,
      kickers: sortByRank(groups.slice(1).flat()).map((card) => card.rank),
    };
  }

  if (firstGroup.length === 4) {
    return {
      name: "4 of a kind",
      of: firstGroup[0].rank,
      kicker: secondGroup[0].rank,
    };
  }
}

function getHighCard(cards) {
  return {
    name: "high card",
    ranks: sortByRank(cards).map(({ rank }) => rank),
  };
}

function calculate(cards) {
  const groups = getGroups(cards);

  if (groups) {
    return groups;
  }

  const flush = getFlush(cards);
  const straight = getStraight(cards);

  if (flush && straight) {
    if (straight.from === "10" && straight.to === "ace") {
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
    "3 of a kind": 4,
    "2 pair": 3,
    pair: 2,
    "high card": 1,
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
      return getRankValue(b.and) - getRankValue(a.and);
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
  },
};

function combinations(array, k) {
  if (k === 1) {
    return array.map((item) => [item]);
  }

  const result = [];
  for (let i = 0; i < array.length; i++) {
    const subcombinations = combinations(
      array.slice(i + 1, array.length),
      k - 1
    );
    for (const combination of subcombinations) {
      combination.unshift(array[i]);
      result.push(combination);
    }
  }
  return result;
}

function bestCombination(cards) {
  return combinations(cards, 5).map(calculate).sort(compare.any)[0];
}

export default { calculate, compare: compare.any, bestCombination };
