import { describe, it } from "node:test";
import assert from "node:assert";
import {
  parseMttSpeed,
  parseTournamentSpeed,
} from "../../src/backend/game-route-parsers.js";

describe("parseTournamentSpeed", () => {
  it("accepts every speed wire value", () => {
    for (const speed of ["normal", "semi-turbo", "turbo"]) {
      assert.equal(parseTournamentSpeed({ speed }), speed);
    }
  });

  it("defaults an omitted speed to normal", () => {
    assert.equal(parseTournamentSpeed(undefined), "normal");
    assert.equal(parseTournamentSpeed({}), "normal");
  });

  it("rejects explicitly unsupported values", () => {
    for (const speed of ["fast", "Normal", 20, null]) {
      assert.throws(
        () => parseTournamentSpeed({ speed }),
        (error) => error.status === 400,
      );
    }
  });

  it("keeps the MTT parser alias for existing callers", () => {
    assert.equal(parseMttSpeed({ speed: "turbo" }), "turbo");
  });
});
