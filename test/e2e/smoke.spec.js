import { test, expect } from "./utils/fixtures.js";
import { createGame } from "./utils/game-helpers.js";
import { waitForLatestEmail } from "./utils/email.js";

test.describe("Poker Game Smoke Test", () => {
  test("plays 3 hands with varied actions (check, call, raise, all-in)", async ({
    player1,
    player2,
    player3,
  }) => {
    // Create game via UI with $0.05/$0.10 stakes (index 2)
    await createGame(player1, { stakesIndex: 2 });
    expect(await player1.getStakes()).toBe("$0.05/$0.10");

    const gameUrl = await player1.copyGameLink();
    await player2.joinGameByUrl(gameUrl);
    await player3.joinGameByUrl(gameUrl);

    await player1.sit(0);
    await player2.sitAnywhere();
    await player1.buyIn(20);
    await player2.buyIn(20);

    const player1Email = "player1@example.com";
    const player1StackBeforeSignIn = await player1.getStack();
    const emailWaitStartedAt = Date.now();
    const [signInEmail] = await Promise.all([
      waitForLatestEmail(player1Email, emailWaitStartedAt),
      player1.requestSignIn(player1Email),
    ]);
    await player1.completeSignInFromEmail(signInEmail.html);
    await expect(player1.mySeat).toBeVisible();
    expect(await player1.getStack()).toBe(player1StackBeforeSignIn);
    await player1.openDrawer();
    await expect(
      player1.game.getByRole("button", { name: "Sign in" }),
    ).toHaveCount(0);
    await player1.closeDrawer();

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
    // While waiting, P2 sends an emote (not their turn yet)
    await player2.emote("😎");
    const emoteBubble = player2.mySeat.locator(".emote-bubble");
    await expect(emoteBubble).toBeVisible();
    await expect(emoteBubble).toHaveText("😎");

    // P2 also sends a chat message
    await player2.chat("nice hand");
    const chatBubble = player2.mySeat.locator(".chat-bubble");
    await expect(chatBubble).toBeVisible();
    await expect(chatBubble).toHaveText("nice hand");

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

    // === SIT OUT / SIT IN (between hands) ===
    // Sitting out cancels the auto-start countdown (only 1 active player)
    await player1.sitOut();
    expect(await player1.isSittingOut()).toBeTruthy();
    await player1.sitIn();
    expect(await player1.isSittingOut()).toBeFalsy();
    await player1.startGame();

    // === HAND 2: Raises (P2=SB, P1=BB) ===
    await expect(holeCards(player1)).toHaveCount(2);
    await expect(holeCards(player2)).toHaveCount(2);

    // Preflop: SB raises using "3 BB" preset, BB calls
    await player2.actWithPreset("raise", "3 BB");
    await player1.act("call");

    // Flop: BB bets using "Pot" preset, SB raises by typing amount, BB calls
    await expect(boardCards).toHaveCount(3);
    await player1.actWithPreset("bet", "Pot");
    await player2.actWithAmount("raise", 1.2);
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

    // Wait for all-in runout to complete (5 board cards)
    await expect(boardCards).toHaveCount(5);

    // P3 sits and buys in during the runout, before the hand ends and auto-start fires
    await player3.sit(2);
    await player3.buyIn(20);

    // === DISCONNECT / CALL CLOCK / RECONNECT ===
    await expect(boardCards).toHaveCount(0);

    // === HAND 4: Disconnect + Call Clock (3 players, P2=SB, P1=BB, P3=UTG) ===
    await player3.waitForHandStart();
    await expect(holeCards(player3)).toHaveCount(2);

    // Preflop: P2 (SB) calls, then it's P3's turn
    await player2.act("call");

    // P3 disconnects during their turn
    await player3.page.close();

    // P1 and P2 see P3 as disconnected
    const p3DisconnectedOnP1 = player1.game.locator(
      "phg-seat:nth-child(3).disconnected",
    );
    await expect(p3DisconnectedOnP1).toBeVisible();

    // Wait for "Call the clock" to become available
    // eslint-disable-next-line
    await player1.page.waitForTimeout(2_000);
    const callClockBtn = player1.actionPanel.getByRole("button", {
      name: "Call the clock",
    });
    await callClockBtn.click();

    // Wait for clock to expire and P3 to auto-fold
    // eslint-disable-next-line
    await player1.page.waitForTimeout(7_000);

    // P3 is auto-folded — P1 (BB) closes preflop, then check through remaining streets
    await player1.act("check");

    await expect(boardCards).toHaveCount(3);
    await player1.act("check");
    await player2.act("check");

    await expect(boardCards).toHaveCount(4);
    await player1.act("check");
    await player2.act("check");

    await expect(boardCards).toHaveCount(5);
    await player1.act("check");
    await player2.act("check");

    // === HAND 5: Sit In Mid-Hand (P1=SB, P2=BB — P3 sitting out) ===
    // Wait for hand 5 to auto-start before reconnecting P3.
    // This ensures sitOutDisconnectedPlayers() has already run,
    // preventing a race where P3 reconnects before being sat out.
    await player1.waitForHandStart();

    // P3 reconnects — open a new page in the same browser context (same cookies)
    const gameId = player1.page.url().match(/\/games\/([a-z0-9]+)/)[1];
    const p3Page = await player3.context.newPage();
    player3.page = p3Page;
    await player3.joinGame(gameId);

    // P3 sees they are sitting out (sat out automatically when disconnected)
    expect(await player3.isSittingOut()).toBeTruthy();

    // P3 sits in while the hand is in progress
    await player3.sitIn();
    expect(await player3.isSittingOut()).toBeFalsy();

    // Preflop: P1 (SB) calls, P2 (BB) checks
    await player1.act("call");
    await player2.act("check");

    // Flop/Turn/River: check through
    await expect(boardCards).toHaveCount(3);
    await player2.act("check");
    await player1.act("check");

    await expect(boardCards).toHaveCount(4);
    await player2.act("check");
    await player1.act("check");

    await expect(boardCards).toHaveCount(5);
    await player2.act("check");
    await player1.act("check");

    // === HAND 6: P3 dealt in (3 players) ===
    await expect(holeCards(player3)).toHaveCount(2);

    // === VERIFY HAND HISTORY (Player 1 - desktop) ===
    await player1.openHistory();
    await player1.waitForHistoryLoaded();
    expect(await player1.getHistoryHandCount()).toBeGreaterThanOrEqual(3);
    expect(await player1.getHistoryPlayerCount()).toBeGreaterThanOrEqual(2);

    // Desktop: sidebar is visible, nav bar is hidden
    const history1 = player1.history;
    const activeItem = () => history1.locator(".hand-item.active");
    await expect(activeItem()).toHaveCount(1);

    // Click hand #1 in sidebar
    await history1.locator(".hand-item", { hasText: "#1" }).click();
    await expect(activeItem().locator(".hand-number")).toHaveText("#1");

    // Navigate forward with arrow keys
    await player1.page.keyboard.press("ArrowRight");
    await expect(activeItem().locator(".hand-number")).toHaveText("#2");

    // === VERIFY HAND HISTORY (Player 2 - mobile viewport) ===
    // Use URL navigation since drawer History button may be outside mobile viewport
    await player2.goToHistory(gameId);
    // On mobile, sidebar is hidden — use nav-bar to verify history loaded
    const history2 = player2.history;
    const navNumber = history2.locator(".nav-number");
    const prevBtn = history2.locator('.nav-btn[title="Previous hand"]');
    const nextBtn = history2.locator('.nav-btn[title="Next hand"]');

    // Next button disabled at last hand
    await expect(nextBtn).toBeDisabled();

    // Navigate to previous hand
    await prevBtn.click();
    const navText = await navNumber.textContent();
    expect(navText).toMatch(/#\d+/);

    // Previous hand navigation works
    await nextBtn.click();
    await expect(nextBtn).toBeDisabled();

    // === VERIFY SIGNED-IN ACCOUNT LINK ===
    await player1.joinGame(gameId);
    const accountPath = await player1.game
      .locator(".drawer-account")
      .getAttribute("href");
    const profilePagePromise = player1.context.waitForEvent("page");
    await player1.game.locator(".drawer-account").click();
    const profilePage = await profilePagePromise;
    await profilePage.waitForLoadState("domcontentloaded");
    expect(accountPath).toMatch(/^\/players\/[a-z0-9]+$/);
    await expect(profilePage).toHaveURL(new RegExp(`${accountPath}$`));
    await expect(profilePage.locator("phg-player-profile")).toBeVisible();
  });
});
