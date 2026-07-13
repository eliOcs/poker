import { describe, it } from "node:test";
import assert from "node:assert";
import * as ActionClock from "../../../src/backend/poker/action-clock.js";

describe("action clock", () => {
  it("starts with no elapsed wait or active countdown", () => {
    const clock = ActionClock.create();

    assert.deepStrictEqual(clock, { waitTicks: 0, countdownTicks: 0 });
    assert.strictEqual(ActionClock.canStart(clock), false);
    assert.strictEqual(ActionClock.isActive(clock), false);
    assert.strictEqual(ActionClock.isExpired(clock), false);
    assert.strictEqual(ActionClock.getRemaining(clock), undefined);
  });

  it("becomes manually eligible at the wait boundary", () => {
    const clock = ActionClock.create();

    for (let i = 0; i < ActionClock.CLOCK_WAIT_TICKS - 1; i += 1) {
      ActionClock.tickWait(clock);
    }
    assert.strictEqual(ActionClock.canStart(clock), false);

    ActionClock.tickWait(clock);
    assert.strictEqual(clock.waitTicks, ActionClock.CLOCK_WAIT_TICKS);
    assert.strictEqual(ActionClock.canStart(clock), true);
  });

  it("starts a countdown once without resetting elapsed wait", () => {
    const clock = {
      waitTicks: ActionClock.CLOCK_WAIT_TICKS,
      countdownTicks: 0,
    };

    assert.strictEqual(ActionClock.start(clock), true);
    assert.deepStrictEqual(clock, {
      waitTicks: ActionClock.CLOCK_WAIT_TICKS,
      countdownTicks: 1,
    });
    assert.strictEqual(
      ActionClock.getRemaining(clock),
      ActionClock.CLOCK_DURATION_TICKS - 1,
    );
    assert.strictEqual(ActionClock.canStart(clock), false);

    assert.strictEqual(ActionClock.start(clock), false);
    assert.strictEqual(clock.countdownTicks, 1);
  });

  it("expires exactly once at the countdown boundary", () => {
    const clock = ActionClock.create();
    ActionClock.start(clock);

    for (let i = 1; i < ActionClock.CLOCK_DURATION_TICKS - 1; i += 1) {
      assert.strictEqual(ActionClock.tick(clock), false);
    }
    assert.strictEqual(
      clock.countdownTicks,
      ActionClock.CLOCK_DURATION_TICKS - 1,
    );
    assert.strictEqual(ActionClock.isExpired(clock), false);
    assert.strictEqual(ActionClock.getRemaining(clock), 1);

    assert.strictEqual(ActionClock.tick(clock), true);
    assert.strictEqual(ActionClock.isExpired(clock), true);
    assert.strictEqual(ActionClock.getRemaining(clock), 0);

    assert.strictEqual(ActionClock.tick(clock), false);
    assert.strictEqual(clock.countdownTicks, ActionClock.CLOCK_DURATION_TICKS);
  });

  it("does not tick an inactive countdown", () => {
    const clock = ActionClock.create();

    assert.strictEqual(ActionClock.tick(clock), false);
    assert.strictEqual(clock.countdownTicks, 0);
  });

  it("reset prevents a stale countdown from expiring later", () => {
    const clock = {
      waitTicks: ActionClock.CLOCK_WAIT_TICKS,
      countdownTicks: ActionClock.CLOCK_DURATION_TICKS - 1,
    };

    ActionClock.reset(clock);

    assert.deepStrictEqual(clock, { waitTicks: 0, countdownTicks: 0 });
    assert.strictEqual(ActionClock.tick(clock), false);
    assert.strictEqual(ActionClock.isExpired(clock), false);
    assert.strictEqual(ActionClock.getRemaining(clock), undefined);
  });

  it("preserves the existing betting clock durations", () => {
    assert.strictEqual(ActionClock.CLOCK_WAIT_TICKS, 15);
    assert.strictEqual(ActionClock.CLOCK_DURATION_TICKS, 60);
  });
});
