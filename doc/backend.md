# Backend

## Dependency Graph

![Backend dependency graph](deps-backend.svg)

## Project Structure

```
src/backend/
├── index.js             # HTTP + WebSocket server entry
├── http-routes.js       # HTTP route handlers
├── websocket-handler.js # WebSocket message handling
├── static-files.js      # Static file serving
├── logger.js            # Logging utilities
├── store.js             # Player session management
├── user.js              # User identity and creation
├── id.js                # ID generation utilities
├── http-error.js        # Structured HTTP error class
├── rate-limit.js        # Rate limiting
├── game-eviction.js     # Player eviction/timeout logic
└── poker/               # Game logic (pure functions)
    ├── game.js          # Game state initialization
    ├── game-tick.js     # Game tick orchestration
    ├── actions.js       # Game actions (generators)
    ├── betting.js       # Betting logic and turn management
    ├── dealing.js       # Card dealing logic
    ├── hand-rankings.js # Hand evaluation & comparison
    ├── hand-history/    # Hand history (OHH spec: https://hh-specs.handhistory.org/)
    │   ├── index.js     # History generation
    │   ├── io.js        # File I/O operations
    │   └── view.js      # History view formatting
    ├── player.js        # Player identity
    ├── player-view.js   # Server-side view filtering
    ├── pots.js          # Pot calculation and side pots
    ├── ranking.js       # Hand ranking utilities
    ├── recovery.js      # Game state recovery from hand history
    ├── seat.js          # Seat representation
    ├── showdown.js      # Showdown logic
    ├── stakes.js        # Blind/ante configuration
    ├── tournament-summary.js # Tournament summary (OTS spec: https://ts-specs.handhistory.org/)
    ├── tournament-tick.js    # Tournament blind level progression
    ├── deck.js          # Card deck management
    ├── rng.js           # Random number generation
    ├── types.js         # TypeScript type definitions
    └── circular-array.js

src/shared/              # Code shared between frontend and backend
├── stakes.js            # Chip denominations and stake presets
└── tournament.js        # Tournament configuration constants
```

## Communication Model

### WebSocket Protocol

Messages are JSON objects with an `action` field:

```javascript
// Client → Server
{ "action": "sit", "seat": 2 }
{ "action": "buyIn", "amount": 50 }

// Server → Client (game state every 200ms)
{ "seats": [...], "board": {...}, ... }
```

### Data Flow

1. Client sends action via WebSocket
2. Server executes action, mutating game state
3. Server generates player-specific view (hides opponent cards, shows available actions)
4. Server broadcasts updated state to all connected players

### Player Views

Each player receives a filtered view of the game state:

- Their own cards are visible
- Opponent cards are hidden
- Available actions are computed per-seat

## Game State

```javascript
{
  running: boolean,
  button: number,          // Dealer position
  blinds: { ante, small, big },
  seats: Seat[],           // Configurable: 2 (heads-up), 6 (6-max), 9 (full ring)
  deck: Card[],
  board: { cards: Card[] }
}
```

### Seat States

```javascript
// Empty
{
  empty: true;
}

// Occupied
{
  empty: (false, player, cards, stack, bet, actions);
}
```

## Patterns

### Generator-Based Actions

Complex multi-step actions use generators for pausable execution:

```javascript
export function* dealPreflop(game) {
  for (const seat of occupiedSeats(game)) {
    seat.cards.push(deal(game.deck));
    yield; // Pause between cards
  }
}
```

### Circular Iteration

Seats are arranged in a circle; use modulo for wraparound:

```javascript
const nextIndex = (i) => (i + 1) % seats.length;
```

### Pure Game Logic

Poker logic in `src/backend/poker/` is pure and testable:

- No I/O or side effects
- Takes game state, returns/mutates state
- Easily unit tested

## Hand History

Hand histories and tournament summaries are stored using open standard formats:

- **[Open Hand History (OHH)](https://hh-specs.handhistory.org/)** — Used for individual hand records (`src/backend/poker/hand-history/`)
- **[Open Tournament Summary (OTS)](https://ts-specs.handhistory.org/)** — Used for tournament summaries (`src/backend/poker/tournament-summary.js`)

## Currency Convention

- All monetary values are stored as **integers in cents** to avoid floating-point precision issues
- The `Cents` type alias (`@typedef {number} Cents` in `types.js`) is used throughout to make this explicit
- Conversion to display format (e.g., `"$1.50"`) happens only at the UI layer via `formatCurrency()`

## Testing

Backend tests live in `test/backend/poker/` and mirror the source structure.

- Use `node:test` and `node:assert`
- Test generators by calling `.next()` explicitly
- Deep equality for object comparisons

```bash
npm run test:backend   # Run backend unit tests
```
