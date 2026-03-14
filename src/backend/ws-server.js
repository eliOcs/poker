import { WebSocketServer } from "ws";
import playerView from "./poker/player-view.js";
import * as Player from "./poker/player.js";
import * as PokerGame from "./poker/game.js";
import * as logger from "./logger.js";
import { createLog, emitLog, getSessionPlayerLogContext } from "./logger.js";
import { parseCookies } from "./http-routes.js";
import { processPokerAction } from "./websocket-handler.js";
import { RateLimitError } from "./rate-limit.js";
import { matchLiveRoute } from "../shared/routes.js";

/**
 * @typedef {import('./user.js').User} UserType
 * @typedef {import('./poker/game.js').Game} Game
 * @typedef {import('./poker/game.js').BroadcastMessage} BroadcastMessage
 * @typedef {import('./logger.js').Log} Log
 */

/**
 * @typedef {object} WebSocketServerParams
 * @property {import('http').Server} server
 * @property {Record<string, UserType>} users
 * @property {Map<string, Game>} games
 * @property {Map<import('ws').WebSocket, { user: UserType, gameId: string }>} clientConnections
 * @property {ReturnType<import('./rate-limit.js').createRateLimiter>} actionRateLimiter
 * @property {(req: import('http').IncomingMessage) => string} getRequestRateLimitKey
 * @property {(user: UserType|undefined, gameId: string|undefined) => Promise<Game|null>} resolveGameForUpgrade
 * @property {(message: BroadcastMessage) => { recipients: number, maxPayloadBytes: number }} broadcastGameMessage
 * @property {(gameId: string) => void} broadcastGameStateMessage
 */

/**
 * @param {Log} log
 * @param {string} gameId
 * @param {UserType} user
 */
function assignWsSessionContext(log, gameId, user) {
  Object.assign(log.context, {
    game: { id: gameId },
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
 * @param {ReturnType<import('./rate-limit.js').createRateLimiter>} actionRateLimiter
 * @param {(req: import('http').IncomingMessage) => string} getRequestRateLimitKey
 * @param {import('http').IncomingMessage} request
 * @param {import('stream').Duplex} socket
 * @returns {boolean}
 */
function allowUpgradeRequest(
  actionRateLimiter,
  getRequestRateLimitKey,
  request,
  socket,
) {
  const rateLimitKey = getRequestRateLimitKey(request);
  try {
    actionRateLimiter.check(rateLimitKey, { source: "ws-upgrade" });
  } catch (err) {
    socket.end(
      `HTTP/1.1 429 Too Many Requests\r\nRetry-After: ${err instanceof RateLimitError ? err.retryAfterSeconds : 1}\r\nConnection: close\r\n\r\n`,
    );
    return false;
  }
  return true;
}

/**
 * @param {Record<string, UserType>} users
 * @param {import('http').IncomingMessage} request
 * @returns {{ user: UserType|undefined, gameId: string|undefined }}
 */
function getUpgradeSession(users, request) {
  const cookies = parseCookies(request.headers.cookie ?? "");
  const liveRoute = request.url ? matchLiveRoute(request.url) : null;
  return {
    user: users[cookies.phg ?? ""],
    gameId:
      liveRoute &&
      (liveRoute.kind === "cash" ||
        liveRoute.kind === "sitngo" ||
        liveRoute.kind === "mtt_table")
        ? liveRoute.tableId
        : undefined,
  };
}

/**
 * @param {import('http').IncomingMessage} request
 * @param {import('stream').Duplex} socket
 * @param {Buffer} head
 * @param {WebSocketServerParams & { wss: WebSocketServer }} params
 */
async function handleUpgrade(request, socket, head, params) {
  const {
    users,
    actionRateLimiter,
    getRequestRateLimitKey,
    resolveGameForUpgrade,
    wss,
  } = params;

  if (
    !allowUpgradeRequest(
      actionRateLimiter,
      getRequestRateLimitKey,
      request,
      socket,
    )
  ) {
    return;
  }

  const { user, gameId } = getUpgradeSession(users, request);
  const game = await resolveGameForUpgrade(user, gameId);

  if (!user || !game || !gameId) {
    logger.warn("ws upgrade rejected", {
      request: { url: request.url },
      session: { hasPlayer: !!user },
      game: { id: gameId ?? null, found: !!game },
    });
    socket.end("HTTP/1.1 401 Unauthorized\r\n\r\n");
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request, user, game, gameId);
  });
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
 * @param {WebSocketServerParams} params
 * @returns {{ wss: WebSocketServer }}
 */
export function createWebSocketServer(params) {
  const {
    server,
    clientConnections,
    games,
    actionRateLimiter,
    broadcastGameMessage,
    broadcastGameStateMessage,
  } = params;
  const wss = new WebSocketServer({ noServer: true, maxPayload: 4096 });

  server.on("upgrade", (request, socket, head) => {
    void handleUpgrade(request, socket, head, { ...params, wss }).catch(
      (err) => {
        logger.error("ws upgrade failed", {
          request: { url: request.url },
          error: { message: err.message },
        });
        socket.end("HTTP/1.1 500 Internal Server Error\r\n\r\n");
      },
    );
  });

  wss.on("connection", (ws, _request, user, game, gameId) => {
    const playerRateLimitKey = `player:${user.id}`;
    clientConnections.set(ws, { user, gameId });
    logger.info("ws connected", {
      game: { id: gameId },
      ...getSessionPlayerLogContext(user),
    });

    const player = Player.fromUser(user);
    const seatIndex = PokerGame.findPlayerSeatIndex(game, player);
    if (seatIndex !== -1 && !game.seats[seatIndex].empty) {
      const seat = /** @type {import('./poker/seat.js').OccupiedSeat} */ (
        game.seats[seatIndex]
      );
      seat.disconnected = false;
      broadcastGameStateMessage(gameId);
    }

    ws.on("close", () => {
      const conn = clientConnections.get(ws);
      clientConnections.delete(ws);

      if (!conn) return;

      logger.info("ws disconnected", {
        game: { id: conn.gameId },
        ...getSessionPlayerLogContext(conn.user),
      });

      const closedPlayer = Player.fromUser(conn.user);
      const closedGame = games.get(conn.gameId);
      if (!closedGame) return;

      const closedSeatIndex = PokerGame.findPlayerSeatIndex(
        closedGame,
        closedPlayer,
      );
      if (
        closedSeatIndex === -1 ||
        /** @type {import('./poker/seat.js').Seat} */ (
          closedGame.seats[closedSeatIndex]
        ).empty
      ) {
        return;
      }

      const closedSeat = /** @type {import('./poker/seat.js').OccupiedSeat} */ (
        closedGame.seats[closedSeatIndex]
      );
      closedSeat.disconnected = true;
      PokerGame.ensureGameTick(closedGame, broadcastGameMessage);
      broadcastGameStateMessage(conn.gameId);
    });

    ws.on("message", (rawMessage) => {
      const log = createLog("ws_action");
      assignWsSessionContext(log, gameId, user);

      try {
        const rateLimit = actionRateLimiter.check(playerRateLimitKey, {
          source: "ws-action",
        });
        log.context.rateLimit = rateLimit.context;

        /** @type {{ action: string } & Record<string, unknown>} */
        const messageData = JSON.parse(String(rawMessage));
        const { action, ...args } = messageData;
        log.context.action = { name: action, ...args };

        if (action === "emote" || action === "chat") {
          handleSocialAction(
            game,
            user,
            action,
            args,
            broadcastGameMessage,
            gameId,
          );
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
      } catch (err) {
        if (err instanceof RateLimitError) {
          log.context.rateLimit = err.rateLimit;
        }
        log.context.error = { message: err.message };
        ws.send(JSON.stringify({ error: { message: err.message } }, null, 2));
      } finally {
        emitLog(log);
      }
    });

    ws.send(JSON.stringify(playerView(game, player), null, 2));
    PokerGame.ensureGameTick(game, broadcastGameMessage);
  });

  return { wss };
}
