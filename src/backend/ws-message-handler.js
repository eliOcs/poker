import * as Player from "./poker/player.js";
import * as PokerGame from "./poker/game.js";
import { createLog, emitLog, getSessionPlayerLogContext } from "./logger.js";
import { processPokerAction } from "./websocket-handler.js";
import { RateLimitError } from "./rate-limit.js";

/**
 * @typedef {import('./user.js').User} UserType
 * @typedef {import('./poker/game.js').Game} Game
 * @typedef {import('./poker/game.js').BroadcastMessage} BroadcastMessage
 * @typedef {import('./logger.js').Log} Log
 * @typedef {import('./ws-server.js').WebSocketServerParams} WebSocketServerParams
 */

/**
 * @param {Log} log
 * @param {Game} game
 * @param {UserType} user
 */
export function assignWsSessionContext(log, game, user) {
  /** @type {{ tableId: string, tournamentId?: string }} */
  const gameContext = { tableId: game.id };
  if (game.tournamentId) gameContext.tournamentId = game.tournamentId;
  Object.assign(log.context, {
    game: gameContext,
    ...getSessionPlayerLogContext(user),
  });
}

/**
 * @param {Game} game
 * @param {UserType} user
 * @param {'emote'|'chat'} action
 * @param {Record<string, unknown>} args
 * @param {(message: BroadcastMessage) => void} broadcastGameMessage
 * @param {string} gameId
 */
function handleSocialAction(
  game,
  user,
  action,
  args,
  broadcastGameMessage,
  gameId,
) {
  const player = Player.fromUser(user);
  const seatIndex = PokerGame.findPlayerSeatIndex(game, player);
  if (
    seatIndex === -1 ||
    /** @type {import('./poker/seat.js').Seat} */ (game.seats[seatIndex]).empty
  ) {
    return;
  }

  if (action === "emote") {
    const emoji = typeof args.emoji === "string" ? args.emoji.trim() : "";
    if (!emoji) return;
    broadcastGameMessage({
      type: "social",
      gameId,
      action: "emote",
      seat: seatIndex,
      emoji,
    });
    return;
  }

  const message =
    typeof args.message === "string" ? args.message.trim().slice(0, 100) : "";
  if (!message) return;
  broadcastGameMessage({
    type: "social",
    gameId,
    action: "chat",
    seat: seatIndex,
    message,
  });
}

/**
 * @param {Game} game
 * @param {UserType} user
 * @param {string} action
 * @param {Record<string, unknown>} args
 * @param {(gameId: string) => void} broadcastGameState
 * @param {string} gameId
 */
function handlePreAction(game, user, action, args, broadcastGameState, gameId) {
  const player = Player.fromUser(user);
  const seatIndex = PokerGame.findPlayerSeatIndex(game, player);
  if (
    seatIndex === -1 ||
    /** @type {import('./poker/seat.js').Seat} */ (game.seats[seatIndex]).empty
  ) {
    return;
  }

  const seat = /** @type {import('./poker/seat.js').OccupiedSeat} */ (
    game.seats[seatIndex]
  );

  if (action === "clearPreAction") {
    seat.preAction = null;
    broadcastGameState(gameId);
    return;
  }

  if (game.hand.actingSeat === seatIndex) {
    throw new Error("cannot set pre-action on your turn");
  }

  const preType = /** @type {'checkFold'|'callAmount'} */ (args.type);
  seat.preAction =
    preType === "checkFold"
      ? { type: /** @type {const} */ ("checkFold"), amount: null }
      : {
          type: /** @type {const} */ ("callAmount"),
          amount: /** @type {number} */ (args.amount ?? 0),
        };
  broadcastGameState(gameId);
}

/**
 * @param {(message: BroadcastMessage) => void} broadcastGameMessage
 * @param {string} gameId
 * @param {import('./poker/game-hand-lifecycle.js').FinalizedHand} handData
 */
function broadcastHandEnded(broadcastGameMessage, gameId, handData) {
  broadcastGameMessage({
    type: "handEnded",
    gameId,
    handNumber: handData.handNumber,
    potResults: handData.potResults,
    historyHand: handData.historyHand,
  });
}

/**
 * @param {Game} game
 * @param {import('./poker/seat.js').Player} player
 * @param {string} action
 * @param {Record<string, unknown>} args
 * @param {string} gameId
 * @param {(message: BroadcastMessage) => { recipients: number, maxPayloadBytes: number }} broadcastGameMessage
 * @returns {{ broadcast: { recipients: number, maxPayloadBytes: number }, gameSnapshot: ReturnType<import('./poker/game-engine.js').gameStateSnapshot> }}
 */
function handleGameAction(
  game,
  player,
  action,
  args,
  gameId,
  broadcastGameMessage,
) {
  const handData = processPokerAction(game, player, action, args);
  if (handData) broadcastHandEnded(broadcastGameMessage, gameId, handData);

  const broadcast = broadcastGameMessage({ type: "gameState", gameId });
  PokerGame.ensureGameTick(game, broadcastGameMessage);
  return { broadcast, gameSnapshot: PokerGame.gameStateSnapshot(game) };
}

/**
 * @param {import("ws").RawData} rawMessage
 * @returns {string}
 */
function getRawMessageText(rawMessage) {
  if (typeof rawMessage === "string") return rawMessage;
  if (rawMessage instanceof Buffer) return rawMessage.toString("utf8");
  if (Array.isArray(rawMessage)) {
    return Buffer.concat(rawMessage).toString("utf8");
  }
  return Buffer.from(new Uint8Array(rawMessage)).toString("utf8");
}

/**
 * Dispatches a WebSocket action and updates the log context accordingly.
 * @param {{
 *   game: Game,
 *   player: import("./poker/seat.js").Player,
 *   user: UserType,
 *   action: string,
 *   args: Record<string, unknown>,
 *   gameId: string,
 *   log: Log,
 *   broadcastGameMessage: WebSocketServerParams["broadcastGameMessage"],
 *   broadcastGameStateMessage: WebSocketServerParams["broadcastGameStateMessage"],
 * }} params
 */
function dispatchGameAction({
  game,
  player,
  user,
  action,
  args,
  gameId,
  log,
  broadcastGameMessage,
  broadcastGameStateMessage,
}) {
  if (action === "emote" || action === "chat") {
    handleSocialAction(game, user, action, args, broadcastGameMessage, gameId);
    log.context.game = {
      ...(log.context.game || {}),
      handNumber: game.handNumber,
    };
    return;
  }

  if (action === "preAction" || action === "clearPreAction") {
    handlePreAction(
      game,
      user,
      action,
      args,
      broadcastGameStateMessage,
      gameId,
    );
    log.context.game = {
      ...(log.context.game || {}),
      handNumber: game.handNumber,
    };
    return;
  }

  const { broadcast, gameSnapshot } = handleGameAction(
    game,
    player,
    action,
    args,
    gameId,
    broadcastGameMessage,
  );
  Object.assign(log.context, {
    game: { ...(log.context.game || {}), ...gameSnapshot },
    broadcast,
  });
}

/**
 * @param {{
 *   ws: import("ws").WebSocket,
 *   user: UserType,
 *   game: Game|null,
 *   gameId: string|null,
 *   player: import("./poker/seat.js").Player,
 *   playerRateLimitKey: string,
 *   actionRateLimiter: WebSocketServerParams["actionRateLimiter"],
 *   broadcastGameMessage: WebSocketServerParams["broadcastGameMessage"],
 *   broadcastGameStateMessage: WebSocketServerParams["broadcastGameStateMessage"],
 * }} params
 * @returns {(rawMessage: import("ws").RawData) => void}
 */
export function createMessageHandler({
  ws,
  user,
  game,
  gameId,
  player,
  playerRateLimitKey,
  actionRateLimiter,
  broadcastGameMessage,
  broadcastGameStateMessage,
}) {
  return (rawMessage) => {
    if (!game || !gameId) {
      ws.send(
        JSON.stringify(
          {
            error: {
              message:
                "game actions are unavailable on tournament lobby connections",
            },
          },
          null,
          2,
        ),
      );
      return;
    }

    const log = createLog("ws_action");
    assignWsSessionContext(log, game, user);

    try {
      const rateLimit = actionRateLimiter.check(playerRateLimitKey, {
        source: "ws-action",
      });
      log.context.rateLimit = rateLimit.context;

      /** @type {{ action: string } & Record<string, unknown>} */
      const messageData = JSON.parse(getRawMessageText(rawMessage));
      const { action, ...args } = messageData;
      log.context.action = { name: action, ...args };

      dispatchGameAction({
        game,
        player,
        user,
        action,
        args,
        gameId,
        log,
        broadcastGameMessage,
        broadcastGameStateMessage,
      });
    } catch (err) {
      if (err instanceof RateLimitError) {
        log.context.rateLimit = err.rateLimit;
      }
      log.context.error = { message: err.message };
      ws.send(JSON.stringify({ error: { message: err.message } }, null, 2));
    } finally {
      emitLog(log);
    }
  };
}
