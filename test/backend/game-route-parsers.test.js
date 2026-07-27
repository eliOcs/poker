import { describe, it } from "node:test";
import assert from "node:assert";
import {
  parseMttSpeed,
  parseSitAndGoLength,
} from "../../src/backend/game-route-parsers.js";

describe("parseSitAndGoLength", () => {
  it("accepts the supported approximate durations", () => {
    for (const durationMinutes of [60, 120, 180]) {
      assert.equal(parseSitAndGoLength({ durationMinutes }), durationMinutes);
    }
  });

  it("uses the default when the duration is omitted", () => {
    assert.equal(parseSitAndGoLength(undefined), 120);
    assert.equal(parseSitAndGoLength({}), 120);
  });

  it("rejects explicitly invalid durations", () => {
    assert.throws(
      () => parseSitAndGoLength({ durationMinutes: 90 }),
      (error) => error.status === 400,
    );
    assert.throws(
      () => parseSitAndGoLength({ durationMinutes: "60" }),
      (error) => error.status === 400,
    );
  });
});

describe("parseMttSpeed", () => {
  it("accepts every speed wire value", () => {
    for (const speed of ["normal", "semi-turbo", "turbo"]) {
      assert.equal(parseMttSpeed({ speed }), speed);
    }
  });

  it("defaults an omitted speed to normal", () => {
    assert.equal(parseMttSpeed(undefined), "normal");
    assert.equal(parseMttSpeed({}), "normal");
  });

  it("rejects explicitly unsupported values", () => {
    for (const speed of ["fast", "Normal", 20, null]) {
      assert.throws(
        () => parseMttSpeed({ speed }),
        (error) => error.status === 400,
      );
    }
  });
});
