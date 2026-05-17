const DEFAULT_TOURNAMENT_NAME = "Multi-Table Tournament";
const MAX_TOURNAMENT_NAME_LENGTH = 60;

/**
 * @param {unknown} name
 * @returns {string}
 */
export function normalizeTournamentName(name) {
  return typeof name === "string" && name.trim()
    ? name.trim().substring(0, MAX_TOURNAMENT_NAME_LENGTH)
    : DEFAULT_TOURNAMENT_NAME;
}

export { DEFAULT_TOURNAMENT_NAME };
