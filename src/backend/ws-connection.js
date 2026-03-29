import * as Player from "./poker/player.js";
import * as PokerGame from "./poker/game.js";
import playerView from "./poker/player-view.js";

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
 * Handles the disconnection of a player from a game seat.
 * @param {{ gameId: string|null, user: UserType }} conn
 * @param {WebSocketServerParams["games"]} games
 * @param {WebSocketServerParams["broadcastGameMessage"]} broadcastGameMessage
 * @param {WebSocketServerParams["broadcastGameStateMessage"]} broadcastGameStateMessage
 */
export function handlePlayerDisconnected(
  conn,
  games,
  broadcastGameMessage,
  broadcastGameStateMessage,
) {
  if (!conn.gameId) return;

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
}

/**
 * Sends the initial tournament payload to the client.
 * @param {import("ws").WebSocket} ws
 * @param {string|null} tournamentId
 * @param {string|null} initialTournamentPayload
 * @param {UserType} user
 * @param {WebSocketServerParams["buildTournamentStatePayload"]} buildTournamentStatePayload
 */
export function sendInitialTournamentPayload(
  ws,
  tournamentId,
  initialTournamentPayload,
  user,
  buildTournamentStatePayload,
) {
  if (initialTournamentPayload) {
    ws.send(initialTournamentPayload);
  } else if (tournamentId) {
    const payload = buildTournamentStatePayload(tournamentId, user);
    if (payload) ws.send(payload);
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
  ws.send(JSON.stringify(playerView(game, player), null, 2));
  PokerGame.ensureGameTick(game, broadcastGameMessage);
}
