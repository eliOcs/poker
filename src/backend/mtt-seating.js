import * as Seat from "./poker/seat.js";

/**
 * @typedef {import('./poker/game.js').Game} Game
 * @typedef {import('./mtt.js').ManagedTournament} ManagedTournament
 * @typedef {import('./mtt.js').TournamentEntrant} TournamentEntrant
 */

/**
 * @param {ManagedTournament} tournament
 * @param {string|null} tableId
 * @returns {number}
 */
export function getTableCreatedOrder(tournament, tableId) {
  if (!tableId) return Number.MAX_SAFE_INTEGER;
  const table = tournament.tables.find((entry) => entry.tableId === tableId);
  return table?.createdOrder ?? Number.MAX_SAFE_INTEGER;
}

/**
 * @param {Map<string, Game>} games
 * @param {TournamentEntrant} entrant
 * @returns {{ game: Game, seat: import("./poker/seat.js").OccupiedSeat } | null}
 */
export function getEntrantSeatContext(games, entrant) {
  if (entrant.tableId === null || entrant.seatIndex === null) {
    return null;
  }
  const game = games.get(entrant.tableId);
  if (!game) {
    return null;
  }
  const seat = game.seats[entrant.seatIndex];
  if (!seat || seat.empty) {
    return null;
  }
  return {
    game,
    seat: /** @type {import("./poker/seat.js").OccupiedSeat} */ (seat),
  };
}

/**
 * @param {ManagedTournament} tournament
 * @param {Map<string, Game>} games
 * @returns {TournamentEntrant[]}
 */
export function getContendingEntrants(tournament, games) {
  return [...tournament.entrants.values()].filter((entrant) => {
    if (entrant.status !== "seated") {
      return false;
    }
    const seatContext = getEntrantSeatContext(games, entrant);
    return (
      seatContext !== null &&
      seatContext.seat.stack > 0 &&
      !seatContext.seat.sittingOut
    );
  });
}

/**
 * @param {Game} game
 * @param {ManagedTournament} tournament
 * @returns {number}
 */
export function findAvailableSeat(game, tournament) {
  for (let i = 0; i < game.seats.length; i += 1) {
    const seat = game.seats[i];
    if (!seat) continue;
    if (seat.empty) {
      return i;
    }

    const occupiedSeat = /** @type {import("./poker/seat.js").OccupiedSeat} */ (
      seat
    );
    const entrant = tournament.entrants.get(occupiedSeat.player.id);
    if (occupiedSeat.stack === 0 && entrant?.status === "eliminated") {
      return i;
    }
  }
  return -1;
}

/**
 * @param {ManagedTournament} tournament
 * @param {Game} game
 * @param {TournamentEntrant} entrant
 * @param {number} seatIndex
 */
export function seatEntrantAtTable(tournament, game, entrant, seatIndex) {
  const seatedPlayer = Seat.occupied(
    { id: entrant.playerId, name: entrant.name },
    entrant.stack,
    false,
  );
  seatedPlayer.totalBuyIn = tournament.initialStack;
  seatedPlayer.handsPlayed = entrant.handsPlayed;
  seatedPlayer.disconnected = false;
  game.seats[seatIndex] = seatedPlayer;
  entrant.status = "seated";
  entrant.tableId = game.id;
  entrant.seatIndex = seatIndex;
}

/**
 * @param {ManagedTournament} tournament
 * @param {Game} game
 * @returns {number[]}
 */
export function getActiveSeatIndexes(tournament, game) {
  /** @type {number[]} */
  const activeSeatIndexes = [];
  for (let i = 0; i < game.seats.length; i += 1) {
    const seat = game.seats[i];
    if (!seat || seat.empty) continue;
    const occupiedSeat = /** @type {import("./poker/seat.js").OccupiedSeat} */ (
      seat
    );
    if (occupiedSeat.stack <= 0) continue;
    const entrant = tournament.entrants.get(occupiedSeat.player.id);
    if (entrant?.status === "seated" || entrant?.status === "winner") {
      activeSeatIndexes.push(i);
    }
  }
  return activeSeatIndexes;
}

/**
 * @param {ManagedTournament} tournament
 * @param {Game} sourceGame
 * @param {number} sourceSeatIndex
 * @param {Game} destinationGame
 */
export function movePlayer(
  tournament,
  sourceGame,
  sourceSeatIndex,
  destinationGame,
) {
  const sourceSeat = /** @type {import('./poker/seat.js').OccupiedSeat} */ (
    sourceGame.seats[sourceSeatIndex]
  );
  const destinationSeatIndex = findAvailableSeat(destinationGame, tournament);
  if (destinationSeatIndex === -1) {
    throw new Error("destination table has no available seat");
  }

  const entrant = tournament.entrants.get(sourceSeat.player.id);
  if (!entrant) {
    throw new Error("cannot move player without tournament entrant");
  }

  const movedSeat = Seat.occupied(
    { id: sourceSeat.player.id, name: sourceSeat.player.name },
    sourceSeat.stack,
    false,
  );
  movedSeat.totalBuyIn = sourceSeat.totalBuyIn;
  movedSeat.handsPlayed = sourceSeat.handsPlayed;
  movedSeat.disconnected = false;

  destinationGame.seats[destinationSeatIndex] = movedSeat;
  sourceGame.seats[sourceSeatIndex] = Seat.empty();
  if (sourceGame.tournament) {
    sourceGame.tournament.redirects = sourceGame.tournament.redirects || {};
    sourceGame.tournament.redirects[sourceSeat.player.id] = destinationGame.id;
  }

  entrant.tableId = destinationGame.id;
  entrant.seatIndex = destinationSeatIndex;
  entrant.stack = movedSeat.stack;
  entrant.status = "seated";
}

/**
 * @param {ManagedTournament} tournament
 * @param {TournamentEntrant} a
 * @param {TournamentEntrant} b
 * @returns {number}
 */
export function compareForcedFinishEntrants(tournament, a, b) {
  if (a.stack !== b.stack) {
    return b.stack - a.stack;
  }
  const tableOrderCompare =
    getTableCreatedOrder(tournament, a.tableId) -
    getTableCreatedOrder(tournament, b.tableId);
  if (tableOrderCompare !== 0) {
    return tableOrderCompare;
  }
  if (
    a.seatIndex !== null &&
    b.seatIndex !== null &&
    a.seatIndex !== b.seatIndex
  ) {
    return a.seatIndex - b.seatIndex;
  }
  return a.playerId.localeCompare(b.playerId);
}
