import { test, expect } from "./utils/fixtures.js";
import { createGame } from "./utils/game-helpers.js";

test.describe("Poker Game Smoke Test", () => {
  test("plays 3 hands with varied actions (check, call, raise, all-in)", async ({
    player1,
    player2,
  }) => {
    // Create game via UI with $0.05/$0.10 stakes (index 2)
    await createGame(player1, { stakesIndex: 2 });
    expect(await player1.getStakes()).toBe("$0.05/$0.10");

    const gameUrl = await player1.copyGameLink();
    await player2.joinGameByUrl(gameUrl);

    await player1.sit(0);
    await player2.sit(1);
    await player1.buyIn(20);
    await player2.buyIn(20);

    await player1.startGame();

    // RNG_SEED=12345 makes everything deterministic.
    // Heads-up positions: P1=seat0, P2=seat1, button alternates each hand.
    // act() auto-waits for the action button via Playwright.

    const holeCards = (player) =>
      player.mySeat.locator(
        ".hole-cards phg-card:not(.hidden):not(.placeholder)",
      );
    const boardCards = player1.board.locator(
      ".community-cards phg-card:not(.placeholder)",
    );

    // === HAND 1: Check/Call (P1=SB, P2=BB) ===
    await expect(holeCards(player1)).toHaveCount(2);
    await expect(holeCards(player2)).toHaveCount(2);

    // Preflop: SB calls, BB checks
    await player1.act("call");
    await player2.act("check");

    // Flop: BB acts first postflop
    await expect(boardCards).toHaveCount(3);
    await player2.act("check");
    await player1.act("check");

    // Turn
    await expect(boardCards).toHaveCount(4);
    await player2.act("check");
    await player1.act("check");

    // River
    await expect(boardCards).toHaveCount(5);
    await player2.act("check");
    await player1.act("check");

    // === HAND 2: Raises (P2=SB, P1=BB) ===
    await expect(holeCards(player1)).toHaveCount(2);
    await expect(holeCards(player2)).toHaveCount(2);

    // Preflop: SB raises, BB calls
    await player2.act("raise");
    await player1.act("call");

    // Flop: BB bets, SB raises, BB calls
    await expect(boardCards).toHaveCount(3);
    await player1.act("bet");
    await player2.act("raise");
    await player1.act("call");

    // Turn: BB checks, SB checks
    await expect(boardCards).toHaveCount(4);
    await player1.act("check");
    await player2.act("check");

    // River: BB checks, SB checks
    await expect(boardCards).toHaveCount(5);
    await player1.act("check");
    await player2.act("check");

    // === HAND 3: All-in (P1=SB, P2=BB) ===
    await expect(holeCards(player1)).toHaveCount(2);
    await expect(holeCards(player2)).toHaveCount(2);

    // Preflop: SB goes all-in, BB calls
    await player1.act("allIn");
    await player2.act("call");

    // Wait for all-in runout to complete (5 board cards) then hand to end (0 cards)
    await expect(boardCards).toHaveCount(5, { timeout: 15000 });
    await expect(boardCards).toHaveCount(0, { timeout: 15000 });

    const p1Stack = await player1.getStack();
    const p2Stack = await player2.getStack();
    expect([p1Stack, p2Stack].some((s) => s !== "$0")).toBeTruthy();

    // === VERIFY HAND HISTORY ===
    await player1.openHistory();
    await player1.waitForHistoryLoaded();
    expect(await player1.getHistoryHandCount()).toBe(3);
    expect(await player1.getHistoryPlayerCount()).toBe(2);
  });
});
