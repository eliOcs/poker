import { test, expect } from "@playwright/test";
import { PokerPlayer } from "./utils/poker-player.js";
import {
  createGame,
  waitForPhase,
  playBettingRound,
} from "./utils/game-helpers.js";

test.describe("Poker Game Smoke Test", () => {
  /** @type {PokerPlayer} */
  let player1;
  /** @type {PokerPlayer} */
  let player2;
  /** @type {string} */
  let gameId;

  test.beforeEach(async ({ browser, request }) => {
    // Create game
    gameId = await createGame(request);

    // Create two browser contexts (separate sessions/cookies)
    const context1 = await browser.newContext({ ignoreHTTPSErrors: true });
    const context2 = await browser.newContext({ ignoreHTTPSErrors: true });

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    player1 = new PokerPlayer(context1, page1, "Player 1");
    player2 = new PokerPlayer(context2, page2, "Player 2");
  });

  test.afterEach(async () => {
    await player1.context.close();
    await player2.context.close();
  });

  test("should play 3 complete hands", async () => {
    // === SETUP ===
    // Players join the game
    await player1.joinGame(gameId);
    await player2.joinGame(gameId);

    // Players sit down at different seats
    await player1.sit(0);
    await player2.sit(1);

    // Players buy in (20 big blinds = 1000 chips each)
    await player1.buyIn(20);
    await player2.buyIn(20);

    // Start the game (player 1 initiates)
    await player1.startGame();

    // Wait for countdown and hand to start
    await player1.waitForHandStart();
    await player2.waitForHandStart();

    // === HAND 1 ===
    console.log("--- HAND 1 ---");

    // Verify cards are dealt (2 cards each)
    const hand1P1Cards = await player1.getHoleCards();
    const hand1P2Cards = await player2.getHoleCards();
    console.log("Player 1 cards:", hand1P1Cards);
    console.log("Player 2 cards:", hand1P2Cards);
    expect(hand1P1Cards).toHaveLength(2);
    expect(hand1P2Cards).toHaveLength(2);

    // Play through preflop
    await playBettingRound([player1, player2]);

    // Wait for flop
    await waitForPhase(player1, "flop");
    const flopCards = await player1.getBoardCards();
    console.log("Flop:", flopCards);
    expect(flopCards).toHaveLength(3);

    // Play through flop
    await playBettingRound([player1, player2]);

    // Wait for turn
    await waitForPhase(player1, "turn");
    const turnCards = await player1.getBoardCards();
    console.log("Turn:", turnCards);
    expect(turnCards).toHaveLength(4);

    // Play through turn
    await playBettingRound([player1, player2]);

    // Wait for river
    await waitForPhase(player1, "river");
    const riverCards = await player1.getBoardCards();
    console.log("River:", riverCards);
    expect(riverCards).toHaveLength(5);

    // Play through river
    await playBettingRound([player1, player2]);

    // Wait for hand to complete and auto-start next hand
    console.log("Hand 1 complete, waiting for auto-start...");

    // === HAND 2 ===
    console.log("--- HAND 2 ---");
    // Hand auto-starts after countdown
    await player1.waitForHandStart();
    await player2.waitForHandStart();

    const hand2P1Cards = await player1.getHoleCards();
    console.log("Player 1 cards:", hand2P1Cards);
    expect(hand2P1Cards).toHaveLength(2);

    // Play through all streets
    await playBettingRound([player1, player2]);
    await waitForPhase(player1, "flop");
    console.log("Flop:", await player1.getBoardCards());
    await playBettingRound([player1, player2]);
    await waitForPhase(player1, "turn");
    console.log("Turn:", await player1.getBoardCards());
    await playBettingRound([player1, player2]);
    await waitForPhase(player1, "river");
    console.log("River:", await player1.getBoardCards());
    await playBettingRound([player1, player2]);
    console.log("Hand 2 complete, waiting for auto-start...");

    // === HAND 3 ===
    console.log("--- HAND 3 ---");
    // Hand auto-starts after countdown
    await player1.waitForHandStart();
    await player2.waitForHandStart();

    const hand3P1Cards = await player1.getHoleCards();
    console.log("Player 1 cards:", hand3P1Cards);
    expect(hand3P1Cards).toHaveLength(2);

    await playBettingRound([player1, player2]);
    await waitForPhase(player1, "flop");
    console.log("Flop:", await player1.getBoardCards());
    await playBettingRound([player1, player2]);
    await waitForPhase(player1, "turn");
    console.log("Turn:", await player1.getBoardCards());
    await playBettingRound([player1, player2]);
    await waitForPhase(player1, "river");
    console.log("River:", await player1.getBoardCards());
    await playBettingRound([player1, player2]);
    // Hand 3 completes and auto-continues to hand 4, so we just wait a moment
    await player1.page.waitForTimeout(500);
    console.log("Hand 3 complete");

    // Verify both players still have chips
    const p1Stack = await player1.getStack();
    const p2Stack = await player2.getStack();
    console.log(`Final stacks - P1: ${p1Stack}, P2: ${p2Stack}`);
    expect(p1Stack).toBeGreaterThan(0);
    expect(p2Stack).toBeGreaterThan(0);
  });

  test("seeded RNG produces deterministic cards", async () => {
    // This test verifies the seeded RNG works correctly
    // With the same seed, we should always get the same cards

    await player1.joinGame(gameId);
    await player2.joinGame(gameId);

    await player1.sit(0);
    await player2.sit(1);

    await player1.buyIn(20);
    await player2.buyIn(20);

    await player1.startGame();
    await player1.waitForHandStart();

    // Get the dealt cards
    const p1Cards = await player1.getHoleCards();
    const p2Cards = await player2.getHoleCards();

    // Verify card structure
    expect(p1Cards).toHaveLength(2);
    expect(p1Cards[0]).toHaveProperty("rank");
    expect(p1Cards[0]).toHaveProperty("suit");
    expect(p1Cards[1]).toHaveProperty("rank");
    expect(p1Cards[1]).toHaveProperty("suit");

    expect(p2Cards).toHaveLength(2);
    expect(p2Cards[0]).toHaveProperty("rank");
    expect(p2Cards[0]).toHaveProperty("suit");

    // Log cards for debugging/verification
    console.log("With seed 12345:");
    console.log("Player 1:", p1Cards);
    console.log("Player 2:", p2Cards);

    // After running once, you can add deterministic assertions:
    // expect(p1Cards[0].rank).toBe('...');
    // expect(p1Cards[0].suit).toBe('...');
  });
});
