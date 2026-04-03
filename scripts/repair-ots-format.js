#!/usr/bin/env node

import { readdir } from "node:fs/promises";
import {
  getDataDir,
  readHandsFromFile,
  readTournamentSummary,
  writeTournamentSummary,
} from "../src/backend/poker/hand-history/io.js";

function parseArgs(argv) {
  const result = {
    dataDir: null,
    dryRun: false,
    gameIds: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      result.dryRun = true;
      continue;
    }
    if (arg === "--data-dir") {
      result.dataDir = argv[i + 1] || null;
      i += 1;
      continue;
    }
    result.gameIds.push(arg);
  }

  return result;
}

async function listTournamentIds(dataDir) {
  const entries = await readdir(dataDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ots"))
    .map((entry) => entry.name.slice(0, -4))
    .sort();
}

function buildPlayerLookups(hands) {
  const nameToIds = new Map();
  const playerIds = new Set();

  for (const hand of hands) {
    for (const player of hand.players) {
      playerIds.add(player.id);

      if (!player.name) {
        continue;
      }

      let ids = nameToIds.get(player.name);
      if (!ids) {
        ids = new Set();
        nameToIds.set(player.name, ids);
      }
      ids.add(player.id);
    }
  }

  return { nameToIds, playerIds };
}

function rewriteFinishes(summary, lookups, gameId) {
  let updated = false;

  const finishes = summary.tournament_finishes_and_winnings.map((finish) => {
    let nextPlayerName = finish.player_name;

    if (!lookups.playerIds.has(finish.player_name)) {
      const ids = lookups.nameToIds.get(finish.player_name);
      if (!ids || ids.size === 0) {
        console.warn(
          `[skip] ${gameId}: no player id found for "${finish.player_name}"`,
        );
        return finish;
      }

      if (ids.size > 1) {
        console.warn(
          `[skip] ${gameId}: ambiguous player id for "${finish.player_name}"`,
        );
        return finish;
      }

      nextPlayerName = ids.values().next().value;
    }

    if (nextPlayerName !== finish.player_name || "player_id" in finish) {
      updated = true;
    }

    const { player_id, ...rewrittenFinish } = finish;
    void player_id;
    return {
      ...rewrittenFinish,
      player_name: nextPlayerName,
    };
  });

  return {
    updated,
    summary: {
      ...summary,
      tournament_finishes_and_winnings: finishes,
    },
  };
}

async function repairTournament(gameId, dryRun) {
  const summary = await readTournamentSummary(gameId);
  if (!summary?.tournament_finishes_and_winnings?.length) {
    console.warn(`[skip] ${gameId}: missing tournament finishes`);
    return false;
  }

  const hands = await readHandsFromFile(gameId);
  if (hands.length === 0) {
    console.warn(`[skip] ${gameId}: missing hand history`);
    return false;
  }

  const { updated, summary: nextSummary } = rewriteFinishes(
    summary,
    buildPlayerLookups(hands),
    gameId,
  );
  if (!updated) {
    console.log(`[ok] ${gameId}: no changes needed`);
    return false;
  }

  if (dryRun) {
    console.log(`[dry-run] ${gameId}: would rewrite finishes to player ids`);
    return true;
  }

  await writeTournamentSummary(gameId, nextSummary);
  console.log(`[fixed] ${gameId}: rewrote finishes to player ids`);
  return true;
}

async function main() {
  const { dataDir, dryRun, gameIds } = parseArgs(process.argv.slice(2));
  if (dataDir) {
    process.env.DATA_DIR = dataDir;
  }

  const targetIds =
    gameIds.length > 0 ? gameIds : await listTournamentIds(getDataDir());
  let changed = 0;

  for (const gameId of targetIds) {
    if (await repairTournament(gameId, dryRun)) {
      changed += 1;
    }
  }

  console.log(
    `${dryRun ? "Dry run complete" : "Repair complete"}: ${changed} tournament${changed === 1 ? "" : "s"} updated`,
  );
}

await main();
