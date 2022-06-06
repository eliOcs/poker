export default function playerView(game, playerId) {
  game.seats = game.seats.map((seat, index) => ({
    ...seat,
    actions: seat.empty ? [{ action: "sit", seat: index }] : [],
  }));
  return game;
}
