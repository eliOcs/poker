/**
 * Neutral starting mix, independent of the reference answer.
 * @param {number} [count]
 * @returns {import('../backend/learn-types.js').Frequencies}
 */
export function initialFrequencies(count = 3) {
  return count === 2 ? [50, 50] : [35, 35, 30];
}

/**
 * Keep the changed slider fixed and share the remainder between other actions.
 * @param {import('../backend/learn-types.js').Frequencies} frequencies
 * @param {number} action Index of the changed action in the frequency array.
 * @param {import('../backend/learn-types.js').Percentage} value
 * @returns {import('../backend/learn-types.js').Frequencies}
 */
export function balanceFrequencies(frequencies, action, value) {
  const others = frequencies.map((_, i) => i).filter((i) => i !== action);
  const changed = Math.max(0, Math.min(100, Math.round(value / 5) * 5));
  const remainingUnits = (100 - changed) / 5;
  const weights = others.map((i) => /** @type {number} */ (frequencies[i]));
  const weightTotal = weights.reduce((sum, n) => sum + n, 0);
  let unallocated = remainingUnits;
  const result = frequencies.map(() => 0);
  result[action] = changed;
  others.forEach((i, index) => {
    const share = weightTotal
      ? /** @type {number} */ (weights[index]) / weightTotal
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
