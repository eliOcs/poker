import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert";
import * as PokerGame from "../../src/backend/poker/game.js";
import playerView from "../../src/backend/poker/player-view.js";
import { createMessageHandler } from "../../src/backend/ws-message-handler.js";
import { createMttContext, createUser } from "./mtt-test-context.js";

/**
 * @param {ReturnType<typeof createMttContext>} ctx
 * @param {{ maxRebuys?: number, playerCount?: number, tableSize?: number }} [options]
 */
function createStartedTournament(
  ctx,
  { maxRebuys, playerCount = 4, tableSize = 6 } = {},
) {
  const owner = createUser("owner", "Owner");
  const tournamentId = ctx.manager.createTournament({
    owner,
    buyIn: 500,
    tableSize,
    ...(maxRebuys === undefined ? {} : { maxRebuys }),
  });
  for (let index = 2; index <= playerCount; index += 1) {
    ctx.manager.registerPlayer(
      tournamentId,
      createUser(`p${index}`, `Player ${index}`),
    );
  }
  ctx.manager.startTournament(tournamentId, owner.id);

  const tournament = ctx.manager.getTournament(tournamentId);
  assert.ok(tournament);
  return { tournamentId, tournament };
}

/**
 * Sends an action through the production WebSocket dispatcher.
 *
 * @param {ReturnType<typeof createMttContext>} ctx
 * @param {import('../../src/backend/poker/game.js').Game} game
 * @param {import('../../src/backend/poker/seat.js').Player} player
 * @param {"rebuy"|"leave"} action
 */
function dispatchManagedAction(ctx, game, player, action) {
  const sent = [];
  const handler = createMessageHandler({
    ws: {
      send(payload) {
        sent.push(JSON.parse(payload));
      },
    },
    user: createUser(player.id, player.name),
    game,
    gameId: game.id,
    player,
    playerRateLimitKey: `player:${player.id}`,
    actionRateLimiter: { check: () => ({ context: {} }) },
    broadcastGameMessage: () => ({ recipients: 0, maxPayloadBytes: 0 }),
    broadcastGameStateMessage: () => {},
    handleManagedTableAction: ctx.manager.handleTableAction,
  });

  handler(JSON.stringify({ action }));
  assert.deepEqual(sent, []);
}

describe("mtt rebuy integration", () => {
  const ctx = createMttContext();
  beforeEach(() => ctx.setup());
  afterEach(() => ctx.teardown());

  it("keeps immediate elimination when the production rebuy limit is zero", () => {
    const { tournament } = createStartedTournament(ctx);
    const game = ctx.games.get(tournament.tables[0].tableId);
    assert.ok(game);
    const bustedSeat = game.seats[1];
    assert.ok(!bustedSeat.empty);
    bustedSeat.stack = 0;
    bustedSeat.sittingOut = true;

    ctx.manager.handleHandFinalized(game);

    assert.equal(game.pendingRebuyDecision, undefined);
    assert.equal(game.seats[1].empty, true);
    assert.equal(
      tournament.entrants.get(bustedSeat.player.id)?.status,
      "eliminated",
    );
    assert.throws(
      () => ctx.manager.handleTableAction(bustedSeat.player, game, "rebuy"),
      /rebuy decision is not pending/,
    );
  });

  it("offers concurrent decisions and resolves authenticated actions through the dispatcher", () => {
    const { tournamentId, tournament } = createStartedTournament(ctx, {
      maxRebuys: 1,
    });
    const game = ctx.games.get(tournament.tables[0].tableId);
    assert.ok(game);
    const rebuySeatIndex = 1;
    const leaveSeatIndex = 3;
    const rebuySeat = game.seats[rebuySeatIndex];
    const leaveSeat = game.seats[leaveSeatIndex];
    const waitingSeat = game.seats[0];
    assert.ok(!rebuySeat.empty && !leaveSeat.empty && !waitingSeat.empty);

    game.handNumber = 1;
    game.button = 0;
    rebuySeat.stack = 0;
    rebuySeat.sittingOut = true;
    leaveSeat.stack = 0;
    leaveSeat.sittingOut = true;

    ctx.manager.handleHandFinalized(game);

    assert.equal(game.countdown, undefined);
    assert.deepEqual(game.pendingRebuyDecision?.entries, [
      { playerId: rebuySeat.player.id, seatIndex: rebuySeatIndex },
      { playerId: leaveSeat.player.id, seatIndex: leaveSeatIndex },
    ]);

    const rebuyView = playerView(game, rebuySeat.player);
    const leaveView = playerView(game, leaveSeat.player);
    const waitingView = playerView(game, waitingSeat.player);
    assert.deepEqual(rebuyView.seats[rebuySeatIndex].actions, [
      { action: "rebuy" },
      { action: "leave" },
    ]);
    assert.deepEqual(leaveView.seats[leaveSeatIndex].actions, [
      { action: "rebuy" },
      { action: "leave" },
    ]);
    assert.equal(
      waitingView.seats[0].actions.some(
        (candidate) => candidate.action === "rebuy",
      ),
      false,
    );
    assert.deepEqual(
      rebuyView.seats.map((seat) => !seat.empty && seat.isActing),
      [false, true, false, true, false, false],
    );
    assert.deepEqual(
      playerView(game, rebuySeat.player).seats[rebuySeatIndex].actions,
      rebuyView.seats[rebuySeatIndex].actions,
    );

    dispatchManagedAction(ctx, game, rebuySeat.player, "rebuy");

    assert.equal(tournament.entrants.get(rebuySeat.player.id)?.rebuysUsed, 1);
    assert.equal(rebuySeat.stack, tournament.initialStack);
    assert.equal(game.seats[rebuySeatIndex], rebuySeat);
    assert.ok(game.pendingRebuyDecision);
    assert.throws(
      () => ctx.manager.handleTableAction(rebuySeat.player, game, "rebuy"),
      /rebuy decision is already resolved/,
    );
    assert.equal(
      ctx.manager.getTournamentView(tournamentId, rebuySeat.player.id)
        .prizePool,
      2_500,
    );

    dispatchManagedAction(ctx, game, leaveSeat.player, "leave");

    assert.equal(game.pendingRebuyDecision, undefined);
    assert.equal(game.seats[leaveSeatIndex].empty, true);
    assert.equal(
      tournament.entrants.get(leaveSeat.player.id)?.status,
      "eliminated",
    );
    assert.equal(game.countdown, 5);

    PokerGame.startHand(game);
    assert.equal(game.button, rebuySeatIndex);
  });

  it("blocks winner detection and table movement until the final decision", () => {
    const { tournament } = createStartedTournament(ctx, {
      maxRebuys: 1,
      playerCount: 3,
      tableSize: 2,
    });
    const sourceGame = ctx.games.get(tournament.tables[0].tableId);
    assert.ok(sourceGame);
    const bustedSeat = sourceGame.seats[1];
    assert.ok(!bustedSeat.empty);
    bustedSeat.stack = 0;
    bustedSeat.sittingOut = true;

    ctx.playerMoves = [];
    ctx.manager.handleHandFinalized(sourceGame);

    assert.equal(tournament.status, "running");
    assert.equal(ctx.playerMoves.length, 0);
    assert.ok(sourceGame.pendingRebuyDecision);

    dispatchManagedAction(ctx, sourceGame, bustedSeat.player, "rebuy");

    assert.equal(tournament.status, "running");
    assert.equal(sourceGame.pendingRebuyDecision, undefined);
    assert.equal(sourceGame.seats[1], bustedSeat);
  });

  it("does not declare a winner while the other player can still rebuy", () => {
    const { tournament } = createStartedTournament(ctx, {
      maxRebuys: 1,
      playerCount: 2,
      tableSize: 2,
    });
    const game = ctx.games.get(tournament.tables[0].tableId);
    assert.ok(game);
    const bustedSeat = game.seats[1];
    assert.ok(!bustedSeat.empty);
    bustedSeat.stack = 0;
    bustedSeat.sittingOut = true;

    ctx.manager.handleHandFinalized(game);
    assert.equal(tournament.status, "running");

    dispatchManagedAction(ctx, game, bustedSeat.player, "leave");

    assert.equal(tournament.status, "finished");
  });
});
