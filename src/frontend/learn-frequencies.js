/** Neutral starting mix, independent of the reference answer. */
export function initialFrequencies() {
  return [35, 35, 30];
}

/** Keep the changed slider fixed and share the remainder between other actions. */
export function balanceFrequencies(frequencies, action, value) {
  const others = [0, 1, 2].filter((i) => i !== action);
  const changed = Math.max(0, Math.min(100, Math.round(value / 5) * 5));
  const remainingUnits = (100 - changed) / 5;
  const weights = others.map((i) => frequencies[i]);
  const weightTotal = weights.reduce((sum, n) => sum + n, 0);
  let unallocated = remainingUnits;
  const result = [0, 0, 0];
  result[action] = changed;
  others.forEach((i, index) => {
    const share = weightTotal
      ? weights[index] / weightTotal
      : 1 / others.length;
    const units =
      index === others.length - 1
        ? unallocated
        : Math.round(remainingUnits * share);
    result[i] = units * 5;
    unallocated -= units;
  });
  return result;
}
