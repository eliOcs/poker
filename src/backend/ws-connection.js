import * as Player from "./poker/player.js";
import * as PokerGame from "./poker/game.js";
import playerView from "./poker/player-view.js";
import { sendWebSocketJson } from "./ws-json.js";

/**
 * @typedef {import('./user.js').User} UserType
 * @typedef {import('./poker/game.js').Game} Game
 * @typedef {import('./ws-server.js').WebSocketServerParams} WebSocketServerParams
 */

/**
 * Marks the player as connected in their seat and broadcasts updated state.
 * @param {Game} game
 * @param {import("./poker/seat.js").Player} player
 * @param {string} gameId
 * @param {WebSocketServerParams["broadcastGameStateMessage"]} broadcastGameStateMessage
 */
export function markPlayerConnected(
  game,
  player,
  gameId,
  broadcastGameStateMessage,
) {
  const seatIndex = PokerGame.findPlayerSeatIndex(game, player);
  if (seatIndex === -1) return;
  const seat = game.seats[seatIndex];
  if (!seat || seat.empty) return;
  const occupiedSeat = /** @type {import('./poker/seat.js').OccupiedSeat} */ (
    seat
  );
  occupiedSeat.disconnected = false;
  broadcastGameStateMessage(gameId);
}

/**
 * Marks the player as connected at any live table in the tournament.
 * @param {WebSocketServerParams["games"]} games
 * @param {string} tournamentId
 * @param {import("./poker/seat.js").Player} player
 * @param {WebSocketServerParams["broadcastGameStateMessage"]} broadcastGameStateMessage
 */
export function markTournamentPlayerConnected(
  games,
  tournamentId,
  player,
  broadcastGameStateMessage,
) {
  for (const game of games.values()) {
    if (game.kind !== "mtt" || game.tournamentId !== tournamentId) continue;
    markPlayerConnected(game, player, game.id, broadcastGameStateMessage);
  }
}

/**
 * @param {{ user: UserType, gameId?: string, tournamentId?: string }} activeConn
 * @param {{ gameId?: string, tournamentId?: string, user: UserType }} closedConn
 * @param {Game} closedGame
 * @returns {boolean}
 */
function isSamePlayerPresence(activeConn, closedConn, closedGame) {
  if (activeConn.user.id !== closedConn.user.id) return false;
  if (activeConn.gameId === closedConn.gameId) return true;
  return (
    closedGame.kind === "mtt" &&
    activeConn.tournamentId === closedGame.tournamentId
  );
}

/**
 * Handles the disconnection of a player from a game seat.
 * @param {{ gameId?: string, tournamentId?: string, user: UserType }} conn
 * @param {WebSocketServerParams["games"]} games
 * @param {WebSocketServerParams["clientConnections"]} clientConnections
 * @param {WebSocketServerParams["broadcastGameMessage"]} broadcastGameMessage
 * @param {WebSocketServerParams["broadcastGameStateMessage"]} broadcastGameStateMessage
 */
export function handlePlayerDisconnected(
  conn,
  games,
  clientConnections,
  broadcastGameMessage,
  broadcastGameStateMessage,
) {
  if (!conn.gameId) return;

  const closedPlayer = Player.fromUser(conn.user);
  const closedGame = games.get(conn.gameId);
  if (!closedGame) return;

  for (const [ws, activeConn] of clientConnections) {
    if (
      ws.readyState === 1 &&
      isSamePlayerPresence(activeConn, conn, closedGame)
    ) {
      return;
    }
  }

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
}

/**
 * Sends the initial tournament state message to the client.
 * @param {import("ws").WebSocket} ws
 * @param {unknown|undefined} initialTournamentMessage
 */
export function sendInitialTournamentMessage(ws, initialTournamentMessage) {
  if (initialTournamentMessage) {
    sendWebSocketJson(ws, initialTournamentMessage);
  }
}

/**
 * Sends the initial game state view to the connected client.
 * @param {import("ws").WebSocket} ws
 * @param {Game} game
 * @param {import("./poker/seat.js").Player} player
 * @param {WebSocketServerParams["broadcastGameMessage"]} broadcastGameMessage
 */
export function sendInitialGameView(ws, game, player, broadcastGameMessage) {
  sendWebSocketJson(ws, playerView(game, player));
  PokerGame.ensureGameTick(game, broadcastGameMessage);
}
