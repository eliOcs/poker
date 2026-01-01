# Poker Home Games

A web-based Texas Hold'em poker game with real-time multiplayer support.

## Architecture

### Philosophy

- **Pragmatic over perfect** - Simple solutions that work, no over-engineering
- **Modern runtime only** - Targets latest Node.js (20+) and modern browsers (no polyfills)
- **Minimal dependencies** - Use native APIs when possible (e.g., `node:test`, `crypto`)
- **Backend authority** - All game logic runs server-side; frontend is a thin rendering layer

### Tech Stack

- **Backend**: Node.js with native ES modules, HTTP, WebSocket (`ws`)
- **Frontend**: Lit web components loaded from CDN (no build step)
- **Protocol**: WebSocket for real-time bidirectional communication
- **Testing**: Node.js built-in test runner (`node --test`)

### Project Structure

```
src/
├── backend.js           # HTTP + WebSocket server
├── poker/               # Game logic (pure functions)
│   ├── game.js          # Game state initialization
│   ├── actions.js       # Game actions (generators)
│   ├── hand-rankings.js # Hand evaluation & comparison
│   ├── player.js        # Player identity
│   ├── player-view.js   # Server-side view filtering
│   ├── seat.js          # Seat representation
│   ├── deck.js          # Card deck management
│   └── circular-array.js
└── frontend/            # Browser UI
    ├── index.html       # Entry point with importmap
    ├── index.js         # Lit component
    └── colors.js        # Base16 color theme

test/poker/              # Tests mirror src/poker structure
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
  button: number,          // Dealer position (0-5)
  blinds: { ante, small, big },
  seats: Seat[],           // 6 seats
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

Poker logic in `src/poker/` is pure and testable:

- No I/O or side effects
- Takes game state, returns/mutates state
- Easily unit tested

## Development

### Commands

```bash
npm start      # Run dev server with file watching
npm test       # Run tests
npm run lint   # ESLint
npm run format # Prettier
```

### Environment (.env)

```
DOMAIN=localhost
PORT=3000
```

### Frontend Development

- Lit components loaded from CDN via importmap (no bundler)
- Environment variables injected at serve time via stream transform
- Hot reload via browser refresh (backend has `--watch`)

## Conventions

### Code Style

- ES modules (`import`/`export`)
- No semicolons (Prettier default)
- Single quotes for strings
- 2-space indentation

### Naming

- `camelCase` for functions and variables
- Files match their primary export
- Test files mirror source structure

### Testing

- Use `node:test` and `node:assert`
- Descriptive test names
- Test generators by calling `.next()` explicitly
- Deep equality for object comparisons

## Dependencies

**Runtime** (keep minimal):

- `ws` - WebSocket server
- `mime-types` - MIME type detection for static files

**Frontend** (CDN):

- `lit` - Web components

**Dev**:

- `eslint`, `prettier` - Code quality
- `sinon` - Test mocks (if needed)
