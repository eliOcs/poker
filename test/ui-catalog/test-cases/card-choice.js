import {
  emptySeats,
  gameView,
  createGame,
  createPlayer,
} from "./game-helpers.js";

/** A folded player choosing which cards to show, during and after the hand. */
export const CARD_CHOICE_TEST_CASES = {
  "game-folded-card-choice": () =>
    gameView(
      createGame({
        button: 1,
        hand: {
          phase: "turn",
          collectedPot: 800,
          currentBet: 200,
          actingSeat: 2,
        },
        board: { cards: ["Ah", "Kd", "7c", "3s"] },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            folded: true,
            stack: 4300,
            cards: ["As", "Qs"],
            cardChoice: { show: [true, false], open: true },
            actions: [
              { action: "emote" },
              { action: "chat" },
              { action: "muck" },
              { action: "showCard1", cards: ["As"] },
              { action: "showCard2", cards: ["Qs"] },
              { action: "showBothCards", cards: ["As", "Qs"] },
            ],
          }),
          createPlayer("Alice", {
            stack: 2600,
            bet: 200,
            cards: ["??", "??"],
            lastAction: "Bet $200",
          }),
          createPlayer("Bob", {
            isActing: true,
            stack: 2800,
            cards: ["??", "??"],
          }),
          ...emptySeats(6),
        ],
      }),
    ),

  // After the hand, the card the folded player kept hidden turns face down.
  "game-folded-card-choice-showdown": () =>
    gameView(
      createGame({
        button: 1,
        hand: {
          phase: "showdown",
          collectedPot: 0,
          currentBet: 0,
          actingSeat: -1,
        },
        board: { cards: ["Ah", "Kd", "7c", "3s", "9h"] },
        winnerMessage: {
          playerName: "Bob",
          handRank: "Pair, Aces",
          amount: 1200,
        },
        seats: [
          createPlayer("You", {
            isCurrentPlayer: true,
            folded: true,
            stack: 4300,
            cards: ["As", "Qs"],
            cardChoice: { show: [true, false], open: false },
            actions: [{ action: "emote" }, { action: "chat" }],
          }),
          createPlayer("Alice", {
            stack: 2600,
            cards: ["Jc", "Td"],
            handResult: -400,
            handRank: "High Card, Ace",
          }),
          createPlayer("Bob", {
            stack: 4000,
            cards: ["Ac", "8d"],
            handResult: 1200,
            handRank: "Pair, Aces",
            winningCards: ["Ac", "Ah", "Kd", "9h", "8d"],
          }),
          ...emptySeats(6),
        ],
      }),
    ),
};

/**
 * Stands in for the server so the folded card choice can be tried in the
 * catalog: the Muck/Show menu and the cards both update the choice, and the
 * menu closes once a choice is made, as the server does.
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
  const setShow = (update) => {
    const seat = game.game.seats[0];
    game.game = {
      ...game.game,
      seats: [
        {
          ...seat,
          cardChoice: { show: update(seat.cardChoice.show), open: true },
          // As before, the menu goes once a choice is made.
          actions: seat.actions.filter(({ action }) => !(action in choices)),
        },
        ...game.game.seats.slice(1),
      ],
    };
  };
  root.addEventListener("game-action", (event) => {
    const { action, card } = event.detail;
    if (action === "toggleShowCard") {
      setShow((show) =>
        show.map((shown, index) => (index === card ? !shown : shown)),
      );
    }
    const choice = choices[action];
    if (choice) setShow(() => choice);
  });
}
