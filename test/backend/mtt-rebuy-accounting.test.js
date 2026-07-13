import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { createMttContext, createUser } from "./mtt-test-context.js";
import { createTempDataDir } from "./temp-data-dir.js";
import { readTournamentSummary } from "../../src/backend/poker/hand-history/io.js";
import { finalizeManagedTournament } from "../../src/backend/poker/tournament-summary.js";

describe("mtt rebuy accounting", () => {
  const ctx = createMttContext();
  let testDataDir;

  beforeEach(async () => {
    testDataDir = await createTempDataDir();
    process.env.DATA_DIR = testDataDir;
    ctx.setup();
  });

  afterEach(async () => {
    ctx.teardown();
    if (existsSync(testDataDir)) {
      await rm(testDataDir, { recursive: true });
    }
    delete process.env.DATA_DIR;
  });

  /**
   * @param {number} maxRebuys
   */
  function createFinishedTournament(maxRebuys) {
    const tournamentId = ctx.manager.createTournament({
      owner: createUser("owner"),
      buyIn: 500,
      tableSize: 6,
      ...(maxRebuys === undefined ? {} : { maxRebuys }),
    });
    ctx.manager.registerPlayer(tournamentId, createUser("p2"));
    ctx.manager.registerPlayer(tournamentId, createUser("p3"));
    const tournament = ctx.manager.getTournament(tournamentId);
    assert.ok(tournament);
    tournament.status = "finished";
    tournament.startedAt = "2026-03-14T00:00:10.000Z";
    tournament.endedAt = "2026-03-14T00:30:00.000Z";
    for (const [index, entrant] of [
      ...tournament.entrants.values(),
    ].entries()) {
      entrant.status = index === 0 ? "winner" : "eliminated";
      entrant.finishPosition = index + 1;
      entrant.stack = index === 0 ? tournament.initialStack * 3 : 0;
    }
    return tournament;
  }

  it("preserves the baseline OTS shape when rebuys are disabled", async () => {
    const tournament = createFinishedTournament(0);

    await finalizeManagedTournament(tournament);

    const summary = await readTournamentSummary(tournament.id);
    assert.ok(summary);
    assert.deepEqual(summary.flags, ["MTT"]);
    assert.equal(summary.prize_pool, 15);
    assert.equal("rebuy_cost" in summary, false);
    assert.equal("tournament_rebuys" in summary, false);
  });

  it("records accepted rebuys and enlarges MTT awards", async () => {
    const tournament = createFinishedTournament(2);
    const owner = tournament.entrants.get("owner");
    const p3 = tournament.entrants.get("p3");
    assert.ok(owner);
    assert.ok(p3);
    owner.rebuysUsed = 1;
    p3.rebuysUsed = 2;

    await finalizeManagedTournament(tournament);

    const summary = await readTournamentSummary(tournament.id);
    assert.ok(summary);
    assert.deepEqual(summary.flags, ["MTT", "Re-Entry"]);
    assert.equal(summary.rebuy_cost, 5);
    assert.equal(summary.prize_pool, 30);
    assert.deepEqual(summary.tournament_rebuys, [
      { player_name: "owner", rebuys: 1 },
      { player_name: "p3", rebuys: 2 },
    ]);
    assert.deepEqual(
      summary.tournament_finishes_and_winnings.map((finish) => finish.prize),
      [30, 0, 0],
    );
  });

  it("writes Re-Entry fields for a default tournament with no accepted rebuys", async () => {
    const tournament = createFinishedTournament(undefined);

    await finalizeManagedTournament(tournament);

    const summary = await readTournamentSummary(tournament.id);
    assert.ok(summary);
    assert.equal(tournament.maxRebuys, 1);
    assert.deepEqual(summary.flags, ["MTT", "Re-Entry"]);
    assert.equal(summary.rebuy_cost, 5);
    assert.deepEqual(summary.tournament_rebuys, []);
  });
});
