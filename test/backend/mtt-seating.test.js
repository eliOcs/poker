import { describe, it } from "node:test";
import assert from "node:assert";
import * as PokerGame from "../../src/backend/poker/game.js";
import * as Seat from "../../src/backend/poker/seat.js";
import {
  getRemainingEntrants,
  getSeatedContenders,
  getWaitingEntrants,
} from "../../src/backend/mtt-seating.js";

describe("mtt entrant populations", () => {
  it("names waiting, seated, and remaining entrant populations explicitly", () => {
    const game = PokerGame.create();
    game.seats[0] = Seat.occupied({ id: "seated" }, 100);
    game.seats[1] = Seat.occupied({ id: "busted" }, 0);
    const entrants = [
      createEntrant("waiting-later", "registered", 4),
      createEntrant("eliminated", "eliminated", 1),
      createEntrant("seated", "seated", 2, game.id, 0),
      createEntrant("busted", "seated", 3, game.id, 1),
      createEntrant("waiting-first", "registered", 0),
      createEntrant("winner", "winner", 5),
    ];
    const tournament =
      /** @type {import("../../src/backend/mtt.js").ManagedTournament} */ (
        /** @type {unknown} */ ({
          entrants: new Map(
            entrants.map((entrant) => [entrant.playerId, entrant]),
          ),
        })
      );
    const games = new Map([[game.id, game]]);

    assert.deepEqual(
      getWaitingEntrants(tournament).map((entrant) => entrant.playerId),
      ["waiting-first", "waiting-later"],
    );
    assert.deepEqual(
      getSeatedContenders(tournament, games).map((entrant) => entrant.playerId),
      ["seated"],
    );
    assert.deepEqual(
      getRemainingEntrants(tournament, games).map(
        (entrant) => entrant.playerId,
      ),
      ["waiting-first", "seated", "waiting-later", "winner"],
    );
  });
});

/**
 * @param {string} playerId
 * @param {import("../../src/backend/mtt.js").EntrantStatus} status
 * @param {number} registrationOrder
 * @param {string} [tableId]
 * @param {number} [seatIndex]
 * @returns {import("../../src/backend/mtt.js").TournamentEntrant}
 */
function createEntrant(
  playerId,
  status,
  registrationOrder,
  tableId,
  seatIndex,
) {
  return {
    playerId,
    status,
    stack: status === "seated" ? 100 : 0,
    handsPlayed: 0,
    rebuysUsed: 0,
    registrationOrder,
    registeredAt: "2026-01-01T00:00:00.000Z",
    tableId,
    seatIndex,
  };
}
