import { describe, it } from "node:test";
import assert from "node:assert";
import * as PokerGame from "../../src/backend/poker/game.js";
import * as Player from "../../src/backend/poker/player.js";
import * as Seat from "../../src/backend/poker/seat.js";
import { findActiveGamePath } from "../../src/backend/game-routes.js";

describe("game-routes", () => {
  it("returns the live cash path for a seated player", () => {
    const user = { id: "u1", name: "Alice", settings: {} };
    const game = PokerGame.create({ kind: "cash" });
    game.seats[2] = Seat.occupied(Player.fromUser(user), 5000);

    const path = findActiveGamePath(new Map([[game.id, game]]), user.id);

    assert.strictEqual(path, `/cash/${game.id}`);
  });

  it("returns a path for a sitting out player while the game is running", () => {
    const user = { id: "u1", name: "Alice", settings: {} };
    const game = PokerGame.create({ kind: "cash" });
    game.seats[2] = Seat.occupied(Player.fromUser(user), 5000, true);

    const path = findActiveGamePath(new Map([[game.id, game]]), user.id);

    assert.strictEqual(path, `/cash/${game.id}`);
  });

  it("does not return a path for a finished sitngo", () => {
    const user = { id: "u1", name: "Alice", settings: {} };
    const game = PokerGame.createTournament();
    game.seats[2] = Seat.occupied(Player.fromUser(user), 5000);
    game.tournament.winner = 2;
    game.running = false;

    const path = findActiveGamePath(new Map([[game.id, game]]), user.id);

    assert.strictEqual(path, null);
  });

  it("returns the MTT table path for a seated player", () => {
    const user = { id: "u1", name: "Alice", settings: {} };
    const table = PokerGame.createMttTable({
      tournamentId: "mtt123",
      tableName: "Table 1",
      startTime: null,
    });
    table.seats[1] = Seat.occupied(Player.fromUser(user), 5000);

    const path = findActiveGamePath(new Map([[table.id, table]]), user.id);

    assert.strictEqual(path, `/mtt/mtt123/tables/${table.id}`);
  });

  it("ignores games where the player is not seated", () => {
    const user = { id: "u1", name: "Alice", settings: {} };
    const game = PokerGame.create({ kind: "cash" });

    const path = findActiveGamePath(new Map([[game.id, game]]), user.id);

    assert.strictEqual(path, null);
  });
});
