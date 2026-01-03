import { test, expect } from "./utils/fixtures.js";
import {
  createGame,
  waitForPhase,
  playBettingRound,
} from "./utils/game-helpers.js";

test.describe("Poker Game Smoke Test", () => {
  test("plays 3 hands with varied actions (check, call, raise, all-in)", async ({
    request,
    player1,
    player2,
  }) => {
    // Create game
    const gameId = await createGame(request);

    // === SETUP ===
    // Player 1 joins and copies the game link
    await player1.joinGame(gameId);
    const gameUrl = await player1.copyGameLink();
    console.log("Game URL copied:", gameUrl);

    // Player 2 joins using the copied link
    await player2.joinGameByUrl(gameUrl);

    await player1.sit(0);
    await player2.sit(1);

    // Players buy in (20 big blinds = 1000 chips each)
    await player1.buyIn(20);
    await player2.buyIn(20);

    await player1.startGame();
    await player1.waitForHandStart();
    await player2.waitForHandStart();

    // === HAND 1: Check/Call through ===
    console.log("--- HAND 1: Check/Call ---");

    const hand1P1Cards = await player1.getHoleCards();
    const hand1P2Cards = await player2.getHoleCards();
    console.log("Player 1 cards:", hand1P1Cards);
    console.log("Player 2 cards:", hand1P2Cards);
    expect(hand1P1Cards).toHaveLength(2);
    expect(hand1P2Cards).toHaveLength(2);

    // Preflop: P1 (SB) calls, P2 (BB) checks
    await playBettingRound([player1, player2]);

    await waitForPhase(player1, "flop");
    console.log("Flop:", await player1.getBoardCards());
    expect(await player1.getBoardCards()).toHaveLength(3);

    // Flop through river: check/call
    await playBettingRound([player1, player2]);
    await waitForPhase(player1, "turn");
    console.log("Turn:", await player1.getBoardCards());

    await playBettingRound([player1, player2]);
    await waitForPhase(player1, "river");
    console.log("River:", await player1.getBoardCards());

    await playBettingRound([player1, player2]);
    console.log("Hand 1 complete");

    // === HAND 2: Raises ===
    console.log("--- HAND 2: Raises ---");
    await player1.waitForHandStart();
    await player2.waitForHandStart();

    console.log("Player 1 cards:", await player1.getHoleCards());
    console.log("Player 2 cards:", await player2.getHoleCards());

    // Preflop: P2 (SB) raises, P1 (BB) calls
    await player2.waitForTurn();
    console.log("Player 2 raises preflop");
    await player2.act("raise");

    await player1.waitForTurn();
    console.log("Player 1 calls the raise");
    await player1.act("call");

    await waitForPhase(player1, "flop");
    console.log("Flop:", await player1.getBoardCards());

    // Flop: P1 bets, P2 raises, P1 calls
    await player1.waitForTurn();
    console.log("Player 1 bets on flop");
    await player1.act("bet");

    await player2.waitForTurn();
    console.log("Player 2 raises on flop");
    await player2.act("raise");

    await player1.waitForTurn();
    console.log("Player 1 calls the raise");
    await player1.act("call");

    await waitForPhase(player1, "turn");
    console.log("Turn:", await player1.getBoardCards());

    // Turn and river: check through
    await playBettingRound([player1, player2]);
    await waitForPhase(player1, "river");
    console.log("River:", await player1.getBoardCards());

    await playBettingRound([player1, player2]);
    console.log("Hand 2 complete");

    // === HAND 3: All-in ===
    console.log("--- HAND 3: All-in ---");
    await player1.waitForHandStart();
    await player2.waitForHandStart();

    console.log("Player 1 cards:", await player1.getHoleCards());
    console.log("Player 2 cards:", await player2.getHoleCards());

    // Preflop: P1 (SB) goes all-in, P2 (BB) calls
    await player1.waitForTurn();
    console.log("Player 1 goes ALL-IN preflop!");
    await player1.act("allIn");

    await player2.waitForTurn();
    console.log("Player 2 calls the all-in");
    await player2.act("call");

    // With our bug fix, when one player is all-in, the board runs out automatically
    // (no need for the remaining player to check through each street)
    await player1.page.waitForFunction(
      () => {
        const game = document.querySelector("phg-game");
        // Wait for hand to complete (back to waiting phase)
        return game?.game?.hand?.phase === "waiting";
      },
      { timeout: 10000 },
    );
    console.log("Board ran out automatically - hand complete");

    console.log("Hand 3 complete (all-in showdown)");

    // Wait a moment for state to settle after showdown
    await player1.page.waitForTimeout(500);

    // Verify game state after all-in
    const p1Stack = await player1.getStack();
    const p2Stack = await player2.getStack();
    const totalChips = p1Stack + p2Stack;
    console.log(
      `Final stacks - P1: ${p1Stack}, P2: ${p2Stack}, Total: ${totalChips}`,
    );

    // Total chips should be preserved (2000) or close to it
    // (next hand may have started and taken blinds before we read stacks)
    expect(totalChips).toBeGreaterThanOrEqual(1925); // 2000 - 75 (SB + BB)
    expect(totalChips).toBeLessThanOrEqual(2000);
    // At least one player should have chips
    expect(Math.max(p1Stack, p2Stack)).toBeGreaterThan(0);
  });
});
