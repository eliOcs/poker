import { toCents } from "./io.js";

/**
 * @typedef {import("../types.js").Cents} Cents
 * @typedef {import("./index.js").OHHHand} OHHHand
 */

export const incrementalContributionActions = new Set([
  "Post SB",
  "Post BB",
  "Post Ante",
]);
export const cumulativeContributionActions = new Set(["Bet", "Raise", "Call"]);

/**
 * Builds contributions from incremental forced bets and cumulative betting
 * actions. OHH Bet/Raise/Call amounts store the player's total committed for
 * the round, while posted blinds and antes are individual increments.
 * @param {OHHHand["rounds"]} rounds
 * @param {(amount: number) => Cents} [normalizeAmount] - Converts input amounts to cents; defaults to OHH dollars.
 * @returns {Map<string, Cents>}
 */
export function buildContributionsByPlayer(rounds, normalizeAmount = toCents) {
  /** @type {Map<string, Cents>} */
  const contributions = new Map();

  for (const round of rounds) {
    addRoundContributions(round, contributions, normalizeAmount);
  }

  return contributions;
}

/**
 * @param {OHHHand["rounds"][number]} round
 * @param {Map<string, Cents>} contributions
 * @param {(amount: number) => Cents} normalizeAmount
 */
function addRoundContributions(round, contributions, normalizeAmount) {
  /** @type {Map<string, Cents>} */
  const roundTotals = new Map();

  for (const action of round.actions) {
    const incremental = incrementalContributionActions.has(action.action);
    if (!incremental && !cumulativeContributionActions.has(action.action)) {
      continue;
    }
    if (typeof action.amount !== "number") {
      throw new Error(
        `Contribution action ${action.action} is missing an amount for player: ${action.player_id}`,
      );
    }

    const actionAmount = normalizeAmount(action.amount);
    const previousTotal = roundTotals.get(action.player_id) ?? 0;
    const delta = incremental
      ? actionAmount
      : Math.max(0, actionAmount - previousTotal);
    roundTotals.set(
      action.player_id,
      incremental
        ? previousTotal + actionAmount
        : Math.max(previousTotal, actionAmount),
    );

    const current = contributions.get(action.player_id) ?? 0;
    contributions.set(action.player_id, current + delta);
  }
}

/**
 * Calculates a player's net result (winnings - contributions)
 * @param {OHHHand} hand
 * @param {string} playerId
 * @returns {Cents}
 */
export function calculateNetResult(hand, playerId) {
  const contributions =
    buildContributionsByPlayer(hand.rounds).get(playerId) ?? 0;

  let winnings = 0;
  for (const pot of hand.pots) {
    for (const win of pot.player_wins) {
      if (win.player_id === playerId) {
        winnings += toCents(win.win_amount);
      }
    }
  }

  return winnings - contributions;
}
