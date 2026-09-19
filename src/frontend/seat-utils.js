import { formatAmount } from "./currency.js";

export function formatPosition(position) {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = position % 100;
  const suffix = suffixes[(v - 20) % 10] ?? suffixes[v] ?? "th";
  return `${position}${suffix}`;
}

export function formatHandResult(result, displayBigBlind = 0) {
  if (result > 0) return `+${formatAmount(result, displayBigBlind)}`;
  if (result < 0) return `-${formatAmount(Math.abs(result), displayBigBlind)}`;
  return formatAmount(0, displayBigBlind);
}

export function getResultClass(result) {
  if (result > 0) return "won";
  if (result < 0) return "lost";
  return "";
}
