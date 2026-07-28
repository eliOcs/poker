import * as Stakes from "./poker/stakes.js";
import * as Tournament from "../shared/tournament.js";
import { HttpError } from "./http-error.js";

/**
 * Parses seat count from request data
 * @param {unknown} data
 * @param {number} defaultSeats
 * @returns {number}
 */
export function parseSeats(data, defaultSeats) {
  if (
    data &&
    typeof data === "object" &&
    "seats" in data &&
    [2, 6, 9].includes(/** @type {number} */ (data.seats))
  ) {
    return /** @type {number} */ (data.seats);
  }
  return defaultSeats;
}

/**
 * Parses blinds from request data
 * @param {unknown} data
 * @returns {{ ante: number, small: number, big: number }}
 */
export function parseBlinds(data) {
  if (
    data &&
    typeof data === "object" &&
    "small" in data &&
    "big" in data &&
    Stakes.isValidPreset({
      small: /** @type {number} */ (data.small),
      big: /** @type {number} */ (data.big),
    })
  ) {
    return {
      ante: 0,
      small: /** @type {number} */ (data.small),
      big: /** @type {number} */ (data.big),
    };
  }
  return { ante: 0, small: Stakes.DEFAULT.small, big: Stakes.DEFAULT.big };
}

/**
 * Parses buy-in from request data
 * @param {unknown} data
 * @returns {number}
 */
export function parseBuyIn(data) {
  if (
    data &&
    typeof data === "object" &&
    "buyIn" in data &&
    typeof data.buyIn === "number" &&
    Tournament.isValidBuyin(data.buyIn)
  ) {
    return data.buyIn;
  }
  return Tournament.DEFAULT_BUYIN.amount;
}

/**
 * @param {unknown} data
 * @returns {Tournament.TournamentSpeed}
 */
export function parseTournamentSpeed(data) {
  if (!data || typeof data !== "object" || !("speed" in data)) {
    return Tournament.DEFAULT_TOURNAMENT_SPEED;
  }
  const { speed } = /** @type {{ speed?: unknown }} */ (data);
  if (!Tournament.isValidTournamentSpeed(speed)) {
    throw new HttpError(400, "invalid tournament speed");
  }
  return speed;
}

export const parseMttSpeed = parseTournamentSpeed;
