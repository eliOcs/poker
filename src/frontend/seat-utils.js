import { formatCurrency } from "./styles.js";

export function formatPosition(position) {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = position % 100;
  const suffix = suffixes[(v - 20) % 10] ?? suffixes[v] ?? "th";
  return `${position}${suffix}`;
}

export function formatHandResult(result) {
  if (result > 0) return `+${formatCurrency(result)}`;
  if (result < 0) return `-${formatCurrency(Math.abs(result))}`;
  return formatCurrency(0);
}

export function getResultClass(result) {
  if (result > 0) return "won";
  if (result < 0) return "lost";
  return "";
}
