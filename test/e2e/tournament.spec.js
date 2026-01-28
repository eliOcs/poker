/* eslint-disable complexity */
import { test, expect } from "./utils/fixtures.js";
import { createGame } from "./utils/game-helpers.js";
import * as fs from "node:fs";
import * as path from "node:path";

// Tournament E2E test - plays many hands with aggressive/passive mix strategy
test.setTimeout(420000); // 7 minutes for longer tournament

const ACTIONS_FILE = path.join(
  process.cwd(),
  "test/e2e/data/tournament-actions.json",
);

test.describe("Tournament E2E", () => {
  test("6 players play at least 50 hands until one wins", async ({
    request,
    player1,
    player2,
    player3,
    player4,
    player5,
    player6,
  }) => {
    // Create tournament game
    const gameId = await createGame(request, { type: "tournament" });
    console.log("Tournament created:", gameId);

    const players = [player1, player2, player3, player4, player5, player6];

    // All players join the game
    await player1.joinGame(gameId);
    const gameUrl = await player1.copyGameLink();

    await Promise.all([
      player2.joinGameByUrl(gameUrl),
      player3.joinGameByUrl(gameUrl),
      player4.joinGameByUrl(gameUrl),
      player5.joinGameByUrl(gameUrl),
      player6.joinGameByUrl(gameUrl),
    ]);

    // Each player sits at their seat (0-5)
    for (let i = 0; i < players.length; i++) {
      await players[i].sit(i);
    }
    console.log("All players seated");

    // Verify starting stack (5000 chips)
    const p1Stack = await player1.getStack();
    console.log(`Starting stack: $${p1Stack}`);
    expect(p1Stack).toBe(5000);

    // Verify initial tournament state
    const initialLevel = await player1.getTournamentLevel();
    const initialBlinds = await player1.getBlinds();
    console.log(
      `Initial level: ${initialLevel}, blinds: $${initialBlinds?.small}/$${initialBlinds?.big}`,
    );
    expect(initialLevel).toBe(1);
    expect(initialBlinds?.small).toBe(25);
    expect(initialBlinds?.big).toBe(50);

    // Start the tournament
    await player1.startGame();
    await player1.waitForHandStart();
    console.log("Tournament started");

    // Tracking for verification - start at hand 1 since we just started a hand
    let handCount = 1;
    let actionCount = 0;
    const maxActions = 8000;
    let maxLevelSeen = 1;
    let lastActionWasNonPreflop = false; // Track when we leave preflop

    // Load or create actions record
    let recordedActions = [];
    let isRecording = true;
    try {
      recordedActions = require(".data/tournament-actions.json");
      isRecording = false;
      console.log(`Replaying  recorded actions`);
    } catch {
      console.log("Starting fresh recording");
    }

    const newActions = [];
    let actionIndex = 0;

    /**
     * Select an action using recorded data or random strategy
     */
    function selectAction(availableActions) {
      if (!isRecording && actionIndex < recordedActions.length) {
        const recorded = recordedActions[actionIndex];
        actionIndex++;
        // Return recorded action if it's available, otherwise fall back
        if (availableActions.includes(recorded.action)) {
          return recorded.action;
        }
      }

      // Strategy: mostly passive play with occasional aggression
      const roll = Math.random();

      if (availableActions.includes("check")) {
        // When we can check, rarely bet/raise (5% of the time)
        if (roll < 0.05 && availableActions.includes("bet")) {
          return "bet";
        }
        if (roll < 0.05 && availableActions.includes("raise")) {
          return "raise";
        }
        return "check";
      }

      // Facing a bet: call 50%, fold 15%, raise 4%, all-in 1%
      if (roll < 0.01 && availableActions.includes("allIn")) {
        return "allIn";
      } else if (roll < 0.05 && availableActions.includes("raise")) {
        return "raise";
      } else if (roll < 0.6 && availableActions.includes("call")) {
        return "call";
      } else if (availableActions.includes("fold")) {
        return "fold";
      } else if (availableActions.includes("call")) {
        return "call";
      }
      return availableActions[0];
    }

    /**
     * Get available actions for a player
     */
    async function getAvailableActions(player) {
      const actions = [];
      if (await player.hasAction("check")) actions.push("check");
      if (await player.hasAction("call")) actions.push("call");
      if (await player.hasAction("fold")) actions.push("fold");
      if (await player.hasAction("bet")) actions.push("bet");
      if (await player.hasAction("raise")) actions.push("raise");
      if (await player.hasAction("allIn")) actions.push("allIn");
      return actions;
    }

    // Track active players (not eliminated)
    const activePlayers = new Set([0, 1, 2, 3, 4, 5]);

    while (actionCount < maxActions) {
      actionCount++;

      // Check for tournament winner on all active player views
      let hasWinner = false;
      for (const idx of activePlayers) {
        try {
          if (await players[idx].hasTournamentWinner()) {
            hasWinner = true;
            break;
          }
        } catch {
          // Player page might be closed
        }
      }

      if (hasWinner) {
        // Find any player that can tell us the winner name
        let winnerName = null;
        for (const idx of activePlayers) {
          try {
            winnerName = await players[idx].getTournamentWinnerName();
            if (winnerName) break;
          } catch {
            // Continue to next player
          }
        }
        console.log(
          `Tournament Winner: ${winnerName} (after ${handCount} hands)`,
        );
        console.log(`Max level seen: ${maxLevelSeen}`);
        expect(winnerName).toBeTruthy();

        // Save actions if recording
        if (isRecording && newActions.length > 0) {
          fs.mkdirSync(path.dirname(ACTIONS_FILE), { recursive: true });
          fs.writeFileSync(ACTIONS_FILE, JSON.stringify(newActions, null, 2));
          console.log(`Saved ${newActions.length} actions to ${ACTIONS_FILE}`);
        }
        return;
      }

      // Find an active player to check game state
      let activePlayer = null;
      for (const idx of activePlayers) {
        try {
          // Check if page is still usable
          await players[idx].page.evaluate(() => true);
          activePlayer = players[idx];
          break;
        } catch {
          activePlayers.delete(idx);
        }
      }

      if (!activePlayer) {
        console.log("No active players left");
        break;
      }

      // Check for level changes
      const currentLevel = await activePlayer
        .getTournamentLevel()
        .catch(() => null);
      if (currentLevel && currentLevel > maxLevelSeen) {
        maxLevelSeen = currentLevel;
        const blinds = await activePlayer.getBlinds();
        console.log(
          `Level change: now level ${currentLevel}, blinds $${blinds?.small}/$${blinds?.big}`,
        );
      }

      // Check for break
      const onBreak = await activePlayer.isOnBreak().catch(() => false);
      if (onBreak) {
        console.log("Tournament on break - waiting...");
        await activePlayer.page.waitForTimeout(1000);
        continue;
      }

      // Track hand transitions via phase
      const currentPhase = await activePlayer.getPhase().catch(() => "");
      // Track when we're not in preflop
      if (currentPhase && currentPhase !== "preflop") {
        lastActionWasNonPreflop = true;
      }
      // If we're back to preflop after being in another phase, it's a new hand
      if (lastActionWasNonPreflop && currentPhase === "preflop") {
        handCount++;
        lastActionWasNonPreflop = false;
        if (handCount % 10 === 0) {
          console.log(`Completed ${handCount} hands...`);
        }
      }

      // Take one action - find who can act (only among active players)
      let acted = false;
      for (const seatIdx of activePlayers) {
        try {
          const player = players[seatIdx];
          if (await player.isMyTurn().catch(() => false)) {
            const availableActions = await getAvailableActions(player);
            if (availableActions.length > 0) {
              const action = selectAction(availableActions);

              // Record action
              if (isRecording) {
                newActions.push({ seat: seatIdx, action, hand: handCount });
              }

              await player.act(action);
              acted = true;
              break;
            }
          }
        } catch {
          // Player eliminated or page closed
          activePlayers.delete(seatIdx);
        }
      }

      if (!acted && activePlayer) {
        try {
          await activePlayer.page.waitForTimeout(50);
        } catch {
          // Player page closed, continue
        }
      }
    }

    // Should have found a winner by now
    const hasWinner = await player1.hasTournamentWinner();
    if (hasWinner) {
      const winnerName = await player1.getTournamentWinnerName();
      console.log(
        `Tournament Winner: ${winnerName} (after ${handCount} hands)`,
      );
      expect(handCount).toBeGreaterThanOrEqual(50);

      // Verify OTS file was created
      const otsFilePath = path.join(process.cwd(), `data/${gameId}.ots`);
      await new Promise((resolve) => setTimeout(resolve, 500));
      expect(fs.existsSync(otsFilePath)).toBe(true);

      const otsContent = fs.readFileSync(otsFilePath, "utf-8");
      const ots = JSON.parse(otsContent);
      expect(ots.ots.tournament_finishes_and_winnings.length).toBe(6);
      console.log("OTS file verified successfully");

      if (isRecording && newActions.length > 0) {
        fs.mkdirSync(path.dirname(ACTIONS_FILE), { recursive: true });
        fs.writeFileSync(ACTIONS_FILE, JSON.stringify(newActions, null, 2));
        console.log(`Saved ${newActions.length} actions to ${ACTIONS_FILE}`);
      }
    } else {
      expect(hasWinner).toBe(true);
    }
  });
});
