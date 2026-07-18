export function formatPosition(position) {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = position % 100;
  const suffix = suffixes[(v - 20) % 10] ?? suffixes[v] ?? "th";
  return `${position}${suffix}`;
}
