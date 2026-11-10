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

/**
 * How one of the player's hole cards shows their show-or-muck choice. While
 * the choice is open the card is a toggle; once it settles, a card the table
 * did not see turns face down.
 * @param {string} card
 * @param {{ show: [boolean, boolean], open: boolean }|undefined} choice
 * @param {number} index
 */
export function getHoleCardState(card, choice, index) {
  if (!choice) return { card, className: "", toggle: undefined };
  const shown = choice.show[index];
  const className = shown ? "card-choice card-choice--shown" : "card-choice";
  if (!choice.open) {
    return { card: shown ? card : "??", className, toggle: undefined };
  }
  return {
    card,
    className: `${className} card-choice--open`,
    toggle: {
      role: "button",
      tabindex: "0",
      pressed: String(shown),
      label: `Show ${index === 0 ? "left" : "right"} card when the hand ends`,
    },
  };
}

/**
 * Each seat's turn in a round of the deal, which goes one card at a time
 * around the table starting left of the button.
 * @param {{ cards?: string[] }[]} seats
 * @param {number} button
 * @returns {{ turn: number, players: number }[]} turn is -1 for a seat dealt out
 */
export function getDealTurns(seats, button) {
  const turns = seats.map(() => -1);
  let players = 0;
  for (let step = 1; step <= seats.length; step++) {
    const index = (button + step) % seats.length;
    if (seats[index]?.cards?.length) turns[index] = players++;
  }
  return turns.map((turn) => ({ turn, players }));
}
