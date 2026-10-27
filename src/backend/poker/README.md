# Poker engine

Texas Hold'em rules and the game state they operate on. Everything the server
knows about a table is one plain `Game` object (`game.js`). Modules here are
functions that read or mutate it.

## Rules versus runtime

Most modules are **pure rules** with no I/O, timers or logging: betting and
turn order, dealing, pots and side pots, hand evaluation, showdown, player
views, tournament blinds. They take a game and mutate it or compute something
from it, and they are unit tested directly against constructed states.

A few modules form the **runtime** that drives those rules:

- `game-engine.js` owns each table's tick timer and the hand lifecycle. It
  starts hands, records history and emits broadcast events.
- `game-tick.js` is pure despite its role. Given a game, it advances counters
  and returns a `TickResult` describing what should happen next: deal the next
  street, auto-fold a timed-out player, start a hand. The engine then performs
  those effects. Separating the decision from the effect keeps all time-based
  behavior testable without fake timers.
- `hand-history/` records the hand as it happens and appends it to disk when
  the hand ends. `recovery.js` reads those files back.

**Time is counted in ticks, not wall-clock time.** A tick is one second. Clocks
and delays are tick counters, so `TIMER_SPEED` (used by e2e tests) speeds up
every timer uniformly, and tests can advance time by calling `tick`.

**Randomness** goes through `rng.js`. In production it uses `Math.random`. With
`RNG_SEED`, it uses a seeded generator so that tests replay the same deals.

## Actions

Player actions (`actions.js`) are plain functions `(game, payload)` that
validate the move against the current state and apply it. Invalid moves
throw. The WebSocket layer (`../websocket-handler.js`) calls them by name.
After a betting action, `processGameFlow` advances the hand: it closes the
betting round, deals the next street or goes to showdown.

Dealing, blinds and showdown are **generators** that yield between steps, such
as each card dealt. The engine runs them to completion, while tests can step
through them with `.next()` and assert on intermediate states.

Bets and raises move in the table's smallest chip, the largest standard
denomination that divides both blinds, as at a live table. The minimum raise
and an all-in are the exceptions, because a short all-in or a split pot can
leave amounts off that grid. One function, `snapToStep` in `src/shared`,
defines the rule: the server rejects any amount it would change, and the
client snaps to it, so neither side can produce an amount the other
refuses.

Seats form a ring; iteration wraps with modulo (`circular-array.js`).

## Player views

`player-view.js` turns the game into what one seat may see. Opponents' hole
cards are hidden unless shown at showdown. Only the viewer receives their
available actions, with legal bet ranges and their chip step. Both the hiding and the computation
of legal moves happen on the server, so the client cannot reveal hidden cards
or attempt illegal moves.

Two pot figures exist on purpose. `collectedPot` holds chips already gathered
from earlier rounds and antes. `totalPot` adds the bets in front of players.
The board shows `totalPot` while bets animate into the middle, so the number
does not jump. Pot-sized bet presets are also based on it.

## Hand history

Hands are stored in [Open Hand History](https://hh-specs.handhistory.org/)
format, one JSON object per hand appended to `<table-id>.ohh`. Tournament
results use [Open Tournament Summary](https://ts-specs.handhistory.org/)
(`tournament-summary.js`). Following the specs, amounts in these files are
decimal dollars. `io.js` converts at the file boundary, and everything in
memory is integer `Cents`.

`view.js` and `replay.js` build the history pages and step-by-step replays from
stored hands. They apply the same privacy rule as live views, so history never
reveals cards that were not shown.
