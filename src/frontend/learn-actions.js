/** @type {import("../backend/learn-types.js").LearnAction[]} */
export const DEFAULT_LEARN_ACTIONS = ["fold", "call", "raise"];
/** @satisfies {Record<import("../backend/learn-types.js").LearnAction, {label: string, variant: string, legend: string}>} */
export const LEARN_ACTIONS = {
  fold: { label: "Fold", variant: "danger", legend: "fold" },
  call: { label: "Call", variant: "success", legend: "call" },
  check: { label: "Check", variant: "success", legend: "call" },
  raise: { label: "Raise", variant: "action", legend: "raise" },
};
