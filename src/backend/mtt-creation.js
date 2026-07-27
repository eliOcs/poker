import * as Id from "./id.js";
import * as Tournament from "../shared/tournament.js";
import { DEFAULT_TOURNAMENT_NAME } from "./mtt-metadata.js";
import { DEFAULT_MAX_REBUYS } from "./mtt-rebuy-policy.js";
import { validateMttConfiguration } from "./mtt-schedule.js";
import {
  DEFAULT_ENTRY_PERIOD_LEVELS,
  validateEntryPeriodLevels,
} from "./mtt-entry-policy.js";

/**
 * @param {{ owner: import('./user.js').User, buyIn: number, tableSize: number, createdAt: string, speed?: unknown, maxRebuys?: unknown, entryPeriodLevels?: unknown }} options
 * @returns {import('./mtt.js').ManagedTournament}
 */
export function createManagedTournament({
  owner,
  buyIn,
  tableSize,
  createdAt,
  speed = Tournament.DEFAULT_MTT_SPEED,
  maxRebuys = DEFAULT_MAX_REBUYS,
  entryPeriodLevels = DEFAULT_ENTRY_PERIOD_LEVELS,
}) {
  const configuration = validateMttConfiguration({
    buyIn,
    speed,
    maxRebuys,
  });
  return {
    id: Id.generate(),
    name: DEFAULT_TOURNAMENT_NAME,
    status: "registration",
    ownerId: owner.id,
    ownerName: owner.name,
    buyIn,
    tableSize,
    initialStack: Tournament.INITIAL_STACK,
    speed: configuration.speed,
    maxRebuys: configuration.maxRebuys,
    entryPeriodLevels: validateEntryPeriodLevels(entryPeriodLevels),
    entryPeriodOpen: false,
    level: 1,
    levelTicks: 0,
    onBreak: false,
    pendingBreak: false,
    pendingRebalance: false,
    breakTicks: 0,
    ...Tournament.createDefaultTournamentSchedule(configuration.speed),
    createdAt,
    entrants: new Map(),
    tables: [],
    nextRegistrationOrder: 0,
  };
}
