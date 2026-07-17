export const FINAL_TABLE_NAME = "Final Table";

const REGULAR_TABLE_NAME = /^Table (\d+)$/;

/**
 * @typedef {import('./mtt.js').ManagedTournament} ManagedTournament
 */

/**
 * @param {ManagedTournament} tournament
 * @returns {number}
 */
function getNextTableCreatedOrder(tournament) {
  return (
    tournament.tables.reduce(
      (maxCreatedOrder, table) => Math.max(maxCreatedOrder, table.createdOrder),
      -1,
    ) + 1
  );
}

/**
 * @param {ManagedTournament} tournament
 * @returns {string}
 */
export function getNextRegularTableName(tournament) {
  const highestTableNumber = tournament.tables.reduce((highest, table) => {
    const match = REGULAR_TABLE_NAME.exec(table.tableName);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `Table ${highestTableNumber + 1}`;
}

/**
 * @param {ManagedTournament} tournament
 * @param {{ finalTable: boolean }} options
 * @returns {{ tableName: string, createdOrder: number }}
 */
export function allocateManagedTableIdentity(tournament, { finalTable }) {
  return {
    tableName: finalTable
      ? FINAL_TABLE_NAME
      : getNextRegularTableName(tournament),
    createdOrder: getNextTableCreatedOrder(tournament),
  };
}

/**
 * @param {ManagedTournament} tournament
 * @param {import('./mtt.js').ManagedTable} table
 * @param {import('./poker/game.js').Game} game
 */
export function renameManagedFinalTable(tournament, table, game) {
  const tableName = getNextRegularTableName(tournament);
  table.tableName = tableName;
  game.tableName = tableName;
}
