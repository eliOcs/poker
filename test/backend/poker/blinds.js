import { describe, it, before, beforeEach } from "node:test";
import assert from "assert";
import * as Game from "../../../src/backend/poker/game.js";
import * as Player from "../../../src/backend/poker/player.js";
import { sit, buyIn, blinds } from "../../../src/backend/poker/actions.js";
import { drainGenerator } from "./test-helpers.js";

describe("blinds", function () {
  let g;
  let b;
  before(function () {
    g = Game.create({ blinds: { small: 25, big: 50 } });
    sit(g, { seat: 0, player: Player.create() });
    buyIn(g, { seat: 0, amount: 1000 });
    sit(g, { seat: 1, player: Player.create() });
    buyIn(g, { seat: 1, amount: 1000 });
    b = blinds(g);
  });

  // Heads-up: button (seat 0) posts small blind
  it("should force small blind for button in heads-up", function () {
    b.next();
    assert.equal(g.seats[0].bet, 25);
    assert.equal(g.seats[0].stack, 50000 - 25); // Stack reduced
  });

  // Heads-up: player after button posts big blind
  it("should force big blind for player after button in heads-up", function () {
    b.next();
    assert.equal(g.seats[1].bet, 50);
    assert.equal(g.seats[1].stack, 50000 - 50); // Stack reduced
  });
});

describe("tournament blinds", function () {
  let game;

  beforeEach(function () {
    game = Game.createTournament();
    // Set up 4 players at seats 0, 1, 2, 4 (need 3+ active to avoid heads-up)
    sit(game, { seat: 0, player: Player.create() });
    sit(game, { seat: 1, player: Player.create() });
    sit(game, { seat: 2, player: Player.create() });
    sit(game, { seat: 4, player: Player.create() });
    game.button = 0;
  });

  it("should charge blinds to sitting out players in SB position", function () {
    // Seat 1 is sitting out (small blind position with button at 0)
    // With 3 active players (0, 2, 4), it's not heads-up
    game.seats[1].sittingOut = true;
    const stackBefore = game.seats[1].stack;

    drainGenerator(blinds(game));

    // Sitting out player should still be charged small blind
    assert.equal(
      game.seats[1].bet,
      game.blinds.small,
      "Sitting out player should post small blind",
    );
    assert.equal(
      game.seats[1].stack,
      stackBefore - game.blinds.small,
      "Stack should be reduced by small blind",
    );
  });

  it("should auto-fold sitting out players after posting blind", function () {
    game.seats[1].sittingOut = true;

    drainGenerator(blinds(game));

    assert.equal(
      game.seats[1].folded,
      true,
      "Sitting out player should be auto-folded after posting blind",
    );
  });

  it("should charge big blind to sitting out players", function () {
    // Seat 2 is sitting out (big blind position with button at 0, SB at 1)
    game.seats[2].sittingOut = true;
    const stackBefore = game.seats[2].stack;

    drainGenerator(blinds(game));

    assert.equal(
      game.seats[2].bet,
      game.blinds.big,
      "Sitting out player should post big blind",
    );
    assert.equal(
      game.seats[2].stack,
      stackBefore - game.blinds.big,
      "Stack should be reduced by big blind",
    );
    assert.equal(
      game.seats[2].folded,
      true,
      "Sitting out player should be auto-folded after posting blind",
    );
  });

  it("should not skip sitting out player for blind position", function () {
    // All players active - button at 0, SB at 1, BB at 2
    drainGenerator(blinds(game));
    assert.equal(game.seats[1].bet, game.blinds.small);
    assert.equal(game.seats[2].bet, game.blinds.big);

    // Reset bets
    game.seats[1].bet = 0;
    game.seats[2].bet = 0;

    // Now sit out seat 1 - it should still be SB position
    game.seats[1].sittingOut = true;

    drainGenerator(blinds(game));

    // Seat 1 should still post SB even though sitting out
    assert.equal(
      game.seats[1].bet,
      game.blinds.small,
      "Sitting out seat should still be in blind position",
    );
    assert.equal(game.seats[2].bet, game.blinds.big);
  });

  it("should skip sitting out players with zero chips", function () {
    // Seat 1 sitting out with 0 chips should be skipped
    game.seats[1].sittingOut = true;
    game.seats[1].stack = 0;

    drainGenerator(blinds(game));

    // Seat 1 (0 chips) should be skipped, seat 2 becomes SB
    assert.equal(game.seats[1].bet, 0, "Zero stack player should not post");
    assert.equal(game.seats[2].bet, game.blinds.small, "Next player posts SB");
    assert.equal(game.seats[4].bet, game.blinds.big, "Next player posts BB");
  });

  it("should use heads-up rules when only 2 active players", function () {
    // Sit out seats 1 and 2, leaving only 0 and 4 active
    game.seats[1].sittingOut = true;
    game.seats[2].sittingOut = true;

    drainGenerator(blinds(game));

    // Heads-up: button (seat 0) posts SB, seat 4 posts BB
    // Sitting out players don't post blinds in heads-up
    assert.equal(
      game.seats[0].bet,
      game.blinds.small,
      "Button posts SB in heads-up",
    );
    assert.equal(
      game.seats[4].bet,
      game.blinds.big,
      "Other player posts BB in heads-up",
    );
    assert.equal(
      game.seats[1].bet,
      0,
      "Sitting out player skipped in heads-up",
    );
    assert.equal(
      game.seats[2].bet,
      0,
      "Sitting out player skipped in heads-up",
    );
  });
});
