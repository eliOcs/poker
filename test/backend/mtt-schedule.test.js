import { describe, it } from "node:test";
import assert from "node:assert";
import { calculateMttSchedule } from "../../src/backend/mtt-schedule.js";
import {
  estimateBreakDurationMinutes,
  estimateScheduleBreakDurationMinutes,
  estimateTournamentDurationMinutes,
  recoverMttSpeed,
} from "../../src/shared/tournament.js";

const BASE_OPTIONS = {
  entrantCount: 8,
  initialStack: 500_000,
  rebuysEnabled: true,
};

describe("mtt schedule", () => {
  it("uses one growth model with 20, 15, and 10 minute levels", () => {
    const normal = calculateMttSchedule({ ...BASE_OPTIONS, speed: "normal" });
    const semiTurbo = calculateMttSchedule({
      ...BASE_OPTIONS,
      speed: "semi-turbo",
    });
    const turbo = calculateMttSchedule({ ...BASE_OPTIONS, speed: "turbo" });

    assert.deepEqual(normal.blindLevels, semiTurbo.blindLevels);
    assert.deepEqual(normal.blindLevels, turbo.blindLevels);
    assert.equal(normal.levelDurationTicks, 20 * 60);
    assert.equal(semiTurbo.levelDurationTicks, 15 * 60);
    assert.equal(turbo.levelDurationTicks, 10 * 60);
    assert.equal(normal.durationMinutes, 260);
    assert.equal(semiTurbo.durationMinutes, 195);
    assert.equal(turbo.durationMinutes, 130);
    assert.deepEqual(normal.breakAfterLevels, [4, 8, 12]);
  });

  it("uses entrant stacks and the 50% rebuy forecast to extend play", () => {
    const smallField = calculateMttSchedule({
      ...BASE_OPTIONS,
      entrantCount: 2,
      rebuysEnabled: false,
      speed: "normal",
    });
    const rebuyField = calculateMttSchedule({
      ...BASE_OPTIONS,
      entrantCount: 2,
      speed: "normal",
    });
    const largerField = calculateMttSchedule({
      ...BASE_OPTIONS,
      entrantCount: 8,
      speed: "normal",
    });

    assert.equal(smallField.durationMinutes, 160);
    assert.equal(rebuyField.durationMinutes, 180);
    assert.equal(largerField.durationMinutes, 260);
    assert.ok(rebuyField.blindLevels.length > smallField.blindLevels.length);
    assert.ok(largerField.blindLevels.length > rebuyField.blindLevels.length);
  });

  it("estimates only breaks before the finish and recovers legacy speeds", () => {
    assert.equal(estimateBreakDurationMinutes(13), 15);
    assert.equal(estimateScheduleBreakDurationMinutes(260, 1200), 15);
    assert.throws(
      () => estimateScheduleBreakDurationMinutes(0, 1200),
      /positive finite numbers/,
    );
    assert.throws(
      () => estimateScheduleBreakDurationMinutes(260, Number.NaN),
      /positive finite numbers/,
    );
    assert.equal(recoverMttSpeed("TuRbO", 20), "turbo");
    assert.equal(recoverMttSpeed("unknown", 900), "semi-turbo");
    assert.equal(recoverMttSpeed(undefined, undefined), "normal");
  });

  it("estimates typical natural finishes instead of schedule runout", () => {
    assert.deepEqual(
      [2, 6, 9].map((players) =>
        ["normal", "semi-turbo", "turbo"].map((speed) =>
          estimateTournamentDurationMinutes(players, speed),
        ),
      ),
      [
        [40, 30, 20],
        [60, 45, 30],
        [80, 60, 40],
      ],
    );
    assert.deepEqual(
      [2, 6, 9].map((players) =>
        ["normal", "semi-turbo", "turbo"].map((speed) =>
          estimateTournamentDurationMinutes(players, speed, {
            rebuysEnabled: true,
          }),
        ),
      ),
      [
        [60, 45, 30],
        [80, 60, 40],
        [105, 80, 55],
      ],
    );
    assert.deepEqual(
      [10, 20, 30].map((players) =>
        ["normal", "semi-turbo", "turbo"].map((speed) =>
          estimateTournamentDurationMinutes(players, speed, {
            rebuysEnabled: true,
          }),
        ),
      ),
      [
        [125, 95, 65],
        [165, 125, 85],
        [190, 145, 100],
      ],
    );
  });
});
