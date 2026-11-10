/**
 * Stands in for the server so the folded card choice can be tried in the
 * catalog: the Muck/Show menu and the cards both update the choice.
 * @param {HTMLElement} root
 */
export function simulateCardChoice(root) {
  const game = root.querySelector("phg-game");
  const choices = {
    muck: [false, false],
    showCard1: [true, false],
    showCard2: [false, true],
    showBothCards: [true, true],
  };
  const setPendingShow = (update) => {
    const seat = game.game.seats[0];
    game.game = {
      ...game.game,
      seats: [
        {
          ...seat,
          pendingShow: update(seat.pendingShow),
          // As before, the menu goes once a choice is made.
          actions: seat.actions.filter(({ action }) => !(action in choices)),
        },
        ...game.game.seats.slice(1),
      ],
    };
  };
  root.addEventListener("toggle-show-card", (event) => {
    setPendingShow((pendingShow) =>
      pendingShow.map((shown, index) =>
        index === event.detail.index ? !shown : shown,
      ),
    );
  });
  root.addEventListener("game-action", (event) => {
    const choice = choices[event.detail.action];
    if (choice) setPendingShow(() => choice);
  });
}
