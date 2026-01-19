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
- **Frontend**: Lit web components installed via npm (no build step, served via importmap)
- **Protocol**: WebSocket for real-time bidirectional communication
- **Testing**: Node.js test runner, web-test-runner, Playwright

### Project Structure

```
src/
├── backend/             # Server-side code
│   ├── index.js         # HTTP + WebSocket server entry
│   ├── http-routes.js   # HTTP route handlers
│   ├── websocket-handler.js # WebSocket message handling
│   ├── static-files.js  # Static file serving
│   ├── logger.js        # Logging utilities
│   ├── player-store.js  # Player session management
│   └── poker/           # Game logic (pure functions)
│       ├── game.js          # Game state initialization
│       ├── game-tick.js     # Game tick orchestration
│       ├── actions.js       # Game actions (generators)
│       ├── betting.js       # Betting logic and turn management
│       ├── dealing.js       # Card dealing logic
│       ├── hand-rankings.js # Hand evaluation & comparison
│       ├── hand-history/    # OHH format hand history
│       │   ├── index.js     # History generation
│       │   ├── io.js        # File I/O operations
│       │   └── view.js      # History view formatting
│       ├── player.js        # Player identity
│       ├── player-view.js   # Server-side view filtering
│       ├── pots.js          # Pot calculation and side pots
│       ├── ranking.js       # Hand ranking utilities
│       ├── seat.js          # Seat representation
│       ├── showdown.js      # Showdown logic
│       ├── stakes.js        # Blind/ante configuration
│       ├── deck.js          # Card deck management
│       ├── rng.js           # Random number generation
│       ├── types.js         # TypeScript type definitions
│       └── circular-array.js
└── frontend/            # Browser UI (Lit web components)
    ├── index.html       # Entry point with importmap
    ├── manifest.json    # PWA manifest
    ├── app.js           # Main app router
    ├── index.js         # Game table component
    ├── history.js       # Hand history viewer
    ├── history-styles.js # History page styles
    ├── home.js          # Landing page
    ├── action-panel.js  # Betting action buttons
    ├── board.js         # Community cards
    ├── card.js          # Card component
    ├── seat.js          # Player seat component
    ├── button.js        # Generic button component
    ├── modal.js         # Modal dialog
    ├── ranking-panel.js # Hand rankings display
    ├── toast.js         # Toast notifications
    └── styles.js        # Design tokens and base styles

test/
├── backend/poker/       # Backend unit tests (mirrors src/backend/poker)
├── frontend/            # Frontend component tests (web-test-runner)
│   └── fixtures/        # Test fixtures for components
├── e2e/                 # End-to-end tests (Playwright)
│   └── utils/           # Test utilities and helpers
└── ui-catalog/          # Visual regression tests (Playwright screenshots)
    └── test-cases/      # Modular test case definitions
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

Poker logic in `src/backend/poker/` is pure and testable:

- No I/O or side effects
- Takes game state, returns/mutates state
- Easily unit tested

## Development

### Commands

```bash
npm start                       # Run dev server with file watching
npm test                        # Run all tests (backend + frontend)
npm run test:backend            # Run backend unit tests (node:test)
npm run test:frontend           # Run frontend component tests (web-test-runner)
npm run test:e2e                # Run end-to-end tests (Playwright)
npm run test:ui-catalog         # Run visual regression tests
npm run test:ui-catalog:update  # Regenerate UI catalog screenshots
npm run coverage                # Run tests with coverage reporting
npm run duplicates              # Check for code duplication (jscpd)
npm run lint                    # ESLint + Stylelint
npm run format                  # Prettier
npm run typecheck               # TypeScript type checking
npm run validate                # Run all checks (format, lint, typecheck, test)
```

### Environment (.env)

```
DOMAIN=localhost
PORT=3000
```

### Frontend Development

- Lit installed via npm, served from node_modules via importmap (no bundler)
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

**Backend tests** (`test/backend/poker/`):

- Use `node:test` and `node:assert`
- Test generators by calling `.next()` explicitly
- Deep equality for object comparisons

**Frontend tests** (`test/frontend/`):

- Use `@open-wc/testing` with `web-test-runner`
- Test Lit components in isolation

**E2E tests** (`test/e2e/`):

- Use Playwright for browser automation
- Test full user flows

**UI Catalog** (`test/ui-catalog/`):

- Visual regression testing with Playwright screenshots
- Run `npm run test:ui-catalog:update` to regenerate snapshots after UI changes

## Deployment

### Overview

Deployment uses [Kamal](https://kamal-deploy.org/) for zero-downtime deploys:

- **Registry**: AWS ECR (eu-central-1)
- **Server**: ARM64 (Graviton) instance
- **SSL**: Let's Encrypt via Kamal proxy
- **Domain**: plutonpoker.com

### Configuration Files

```
config/deploy.yml    # Kamal configuration
.kamal/secrets       # Registry credentials (not committed)
Dockerfile           # Container build
```

### Deploy Commands

```bash
kamal deploy         # Full deploy (build, push, deploy)
kamal redeploy       # Deploy without rebuilding
kamal rollback       # Rollback to previous version
```

### Logs & Debugging

```bash
kamal app logs              # View application logs
kamal app logs -f           # Follow logs
kamal app exec -i 'sh'      # Shell into container
kamal proxy logs            # View proxy logs
```

### Infrastructure

```bash
kamal setup          # First-time server setup
kamal proxy reboot   # Restart proxy (SSL issues)
kamal app boot       # Start app without deploying
```

### Secrets

The `.kamal/secrets` file generates the ECR password:

```bash
KAMAL_REGISTRY_PASSWORD=$(aws ecr get-login-password --region eu-central-1 --profile personal)
```

ECR tokens expire after 12 hours. If deploy fails with auth errors, the token has expired.

## Dependencies

**Runtime** (keep minimal):

- `ws` - WebSocket server
- `mime-types` - MIME type detection for static files
- `lit` - Web components

**Dev**:

- `eslint`, `prettier`, `stylelint` - Code quality
- `typescript` - Type checking (no compilation)
- `@open-wc/testing`, `web-test-runner` - Frontend testing
- `@playwright/test` - E2E and visual regression testing
- `sinon` - Test mocks
- `jscpd` - Code duplication detection
