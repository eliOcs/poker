const last = 4;
const first = 0;

function getRankValue({ rank }, { ace = "high" } = {}) {
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
    (a, b) => getRankValue(b, opts) - getRankValue(a, opts)
  );
}

function getStraight(cards) {
  for (const ace of ["high", "low"]) {
    const sorted = sortByRank(cards, { ace });
    const from = sorted[last];
    const to = sorted[first];
    if (getRankValue(to, { ace }) - getRankValue(from, { ace }) === 4) {
      return {
        name: "straight",
        from: from.rank,
        to: to.rank,
      };
    }
  }

  return false;
}

function getFlush(cards) {
  const suit = cards[0].suit;
  let high = cards[0];
  for (let i = 1; i < cards.length; i += 1) {
    if (cards[i].suit !== suit) {
      return false;
    }
    if (getRankValue(cards[i]) > getRankValue(high)) {
      high = cards[i];
    }
  }
  return { name: "flush", suit, high: high.rank };
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
      if (getRankValue(firstGroup[0]) > getRankValue(secondGroup[0])) {
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

function compare(handRankingA, handRankingB) {
  function getHandStrength({ name }) {
    switch (name) {
      case "royal flush":
        return 9;
      case "straight flush":
        return 8;
      case "4 of a kind":
        return 7;
      case "full house":
        return 6;
      case "flush":
        return 5;
      case "3 of a kind":
        return 4;
      case "2 pair":
        return 3;
      case "pair":
        return 2;
      case "high card":
        return 1;
    }
  }

  return getHandStrength(handRankingB) - getHandStrength(handRankingA);
}

export default { calculate, compare };
