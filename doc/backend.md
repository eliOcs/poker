# Backend

## Dependency Graph

![Backend dependency graph](deps-backend.svg)

## Key Files and Modules

```
src/backend/
├── index.js                   # HTTP and WebSocket server entry
├── http-routes.js             # Route composition and SPA routes
├── game-routes.js             # User, avatar, cash, Sit & Go, MTT, and profile APIs
├── history-routes.js          # Hand-history HTTP APIs
├── sign-in-routes.js          # Passwordless sign-in APIs
├── http-route-utils.js        # Session, response, and live-user synchronization
├── websocket-handler.js       # WebSocket upgrade handling
├── ws-server.js               # WebSocket server and message routing
├── ws-connection.js           # Player connection lifecycle
├── game-broadcast.js          # Player-specific game broadcasts
├── avatar.js                  # Canonical avatar content revisions
├── user.js                    # User identity and default settings
├── store.js                   # SQLite persistence and history indices
├── store-migrations.js        # Versioned SQLite migrations
├── player-profile.js          # Public profile and history aggregation
├── mtt.js                     # MTT manager and orchestration
├── mtt-*.js                   # Focused MTT lifecycle and policy modules
├── email.js                   # AWS SES and local email sink
└── poker/                     # Pure poker rules and state transitions
    ├── game.js                # Game state initialization
    ├── game-tick.js           # Game tick orchestration
    ├── actions.js             # Generator-based player actions
    ├── betting.js             # Betting rules and turn management
    ├── player.js              # Public player identity and avatar revision
    ├── player-view.js         # Per-player state filtering
    ├── hand-rankings.js       # Hand evaluation and comparison
    ├── hand-history/          # OHH history generation, I/O, and views
    └── tournament-summary.js  # OTS tournament summaries

src/shared/
├── avatar.js                  # Versioned avatar schema and boundary validation
├── blind-calculator.js        # Tournament blind calculations
├── stakes.js                  # Chip denominations and stake presets
├── tournament.js              # Shared tournament configuration
└── routes.js                  # Live-resource and history route helpers
```

## Database

SQLite in WAL mode, stored at `/app/data/poker.db`. Accessed via Node.js `node:sqlite`.
Schema migrations are applied atomically at startup and tracked with SQLite's
`user_version` pragma.

### Entity Relationship Diagram

```mermaid
erDiagram
    users {
        text id PK
        text name
        text email
        text settings
        text created_at
        text updated_at
    }
    player_tables {
        text player_id FK
        text table_id FK
        text tournament_id
        integer last_hand_number
        text last_played_at
    }
    player_tournaments {
        text player_id FK
        text tournament_id
        text last_table_id FK
        integer last_hand_number
        text last_played_at
    }

    users ||--o{ player_tables : "sits at"
    users ||--o{ player_tournaments : "enters"
```

> **Note**: Tournaments are managed in-memory by `mtt.js` — there is no `tournaments` table. The `tournament_id` column on `player_tables` and `player_tournaments` is an opaque ID linking rows that belong to the same MTT.

### Tables

| Table                | Purpose                                                      |
| -------------------- | ------------------------------------------------------------ |
| `users`              | Registered player accounts (name, email, settings JSON)      |
| `player_tables`      | Player activity per table (last hand, last played timestamp) |
| `player_tournaments` | Player participation per MTT (last table, last hand)         |

## Authentication

Passwordless email-based sign-in via one-time tokens.

### Sign-In Flow

1. Guest session is created on first visit — a UUID is stored in the `phg` cookie
2. User submits their email → `POST /api/sign-in-links` generates a 32-byte base64url token (30-min TTL) and sends it via AWS SES
3. User clicks the link → browser navigates to `/auth/email-sign-in/callback?token=...`
4. Client calls `POST /api/sign-in-links/verify` — token is consumed (one-time use)
5. `completeSignIn()` merges the guest session into the registered account:
   - Rewrites player IDs in hand history files
   - Migrates `player_tables` and `player_tournaments` DB records
   - Updates all live game seats (guest UUID → registered ID)
   - Migrates active WebSocket connections
   - Deletes the guest user record
6. Session cookie (`phg`) is updated with the registered user ID

### User Shape

```javascript
{
  id: string,          // UUID
  name: string | undefined,
  email: string | undefined,
  settings: {
    volume: number,
    vibration: boolean,
    avatar?: AvatarConfiguration
  }
}
```

Settings are stored as JSON in the `users` table. Avatar input is validated and
canonicalized before it is assigned to the user; see [Avatars](avatar.md).

## Player Profiles

`GET /api/players/:playerId` returns a public profile aggregated from the database and hand history files:

```javascript
{
  id: string,
  name: string,
  online: boolean,
  lastSeenAt: string | null,
  joinedAt: string,
  totalNetWinnings: number,   // cents
  totalHands: number,
  avatarRevision?: string,
  recentGames: [{
    gameId, tableId, tournamentId,
    gameType, netWinnings, handsPlayed,
    lastPlayedAt, lastHandNumber
  }]
}
```

## Avatars

The backend stores the canonical avatar configuration in user settings, but
game, tournament, and profile payloads expose only its content-derived
`avatarRevision`. This keeps frequently broadcast state small and gives clients
a stable cache key.

`GET /api/players/:playerId/avatar` returns `{ revision, avatar }`, uses the
revision as an `ETag`, and returns `304` when `If-None-Match` is current. It
returns `404` when the player has no configured avatar. `PUT /api/users/me`
accepts a validated avatar object in `settings.avatar`; JSON `null` explicitly
removes it.

After a settings update, the backend synchronizes the player's name and avatar
revision into live seats and MTT entrants before broadcasting the changed state.
See [Avatars](avatar.md) for the full persistence and rendering flow.

## Multi-Table Tournaments

`mtt.js` manages the full lifecycle of MTTs entirely in-memory. Persistence is handled by the database tables above.

### Tournament Lifecycle

1. **Registration** — Owner creates tournament; players join via `registerPlayer()`
2. **Start** — Owner calls `startTournament()`; initial tables are created and seating is assigned
3. **Running** — Blind levels escalate every 15 minutes; a 5-minute break follows level 4
4. **Rebalancing** — After each hand finalizes, `handleHandFinalized()` eliminates busted players, collapses near-empty tables, and redistributes players
5. **Finish** — Last player standing is marked winner

### Blind Schedule

| Level   | Small / Big | Ante  |
| ------- | ----------- | ----- |
| 1       | 25 / 50     | —     |
| 2       | 50 / 100    | —     |
| 3       | 100 / 200   | —     |
| 4       | 150 / 300   | —     |
| _Break_ | —           | 5 min |
| 5       | 200 / 400   | —     |
| 6       | 300 / 600   | —     |
| 7       | 500 / 1000  | —     |

### Tournament Entrant Shape

```javascript
{
  playerId: string,
  name: string,
  avatarRevision?: string,
  status: "registered" | "seated" | "eliminated" | "winner",
  stack: number,              // cents
  tableId: string | null,
  seatIndex: number | null,
  finishPosition: number | null,
  handsPlayed: number,
  registrationOrder: number,
  registeredAt: string,
  eliminatedAt: string | null
}
```

## Communication Model

### WebSocket Protocol

Messages are JSON objects with an `action` field:

```javascript
// Client → Server
{ "action": "sit", "seat": 2 }
{ "action": "buyIn", "amount": 50 }
{ "action": "register" }       // MTT registration
{ "action": "start" }          // MTT start (owner only)

// Server → Client (game state every 200ms)
{ "seats": [...], "board": {...}, ... }

// Server → Client (tournament state every 1000ms)
{ "id": "...", "status": "running", "entrants": [...], ... }
```

**Connection header** carries the authenticated user context:

```javascript
{ user: User, gameId: Id | null, tournamentId: Id | null }
```

### Data Flow

1. Client sends action via WebSocket
2. Server executes action, mutating game state
3. Server generates player-specific view (hides opponent cards, shows available actions)
4. Server broadcasts updated state to all connected players

### Broadcast Types

| Type              | Interval | Description                         |
| ----------------- | -------- | ----------------------------------- |
| `gameState`       | 200 ms   | Per-player filtered game view       |
| `tournamentState` | 1000 ms  | Tournament standings and table list |
| `history`         | on event | Hand finalized notification         |
| `social`          | on event | Chat/emote messages                 |

### Player Views

The game state and hand view use `collectedPot` for chips collected from betting
rounds and antes. The hand view also exposes `totalPot`: collected chips plus
every current-round bet, including folded players. Both fields retain these
meanings during collection; `totalPot` stays constant as bets move into
`collectedPot`. The board displays `totalPot` during the collection animation
and `collectedPot` otherwise. Pot-based bet presets use `totalPot`.
For raises, they add the outstanding call before taking the pot fraction, then
add the current bet to produce the street's raise-to amount.

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

## Logging

Uses canonical log lines — one structured log per lifecycle, emitted at the end with all accumulated context.

A `Log` is a plain data object `{ level, message, timestamp, context }` created via `createLog()`. Context is accumulated throughout the lifecycle and the log is emitted once via `emitLog()`, which adds `durationMs` automatically.

| Message          | Scope                       | Created                | Emitted          |
| ---------------- | --------------------------- | ---------------------- | ---------------- |
| `http_request`   | One per HTTP request        | `server.on("request")` | `finally` block  |
| `ws_action`      | One per WebSocket message   | `ws.on("message")`     | `finally` block  |
| `hand`           | One per poker hand          | `startHand()`          | `logHandEnded()` |
| `eviction_sweep` | One per eviction timer tick | `evictInactiveGames()` | After sweep loop |

One-shot logs that don't benefit from accumulation use `logger.info()` / `logger.warn()` directly: WebSocket connect/disconnect, shutdown, DB init, recovery warnings, rate limit stats.

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
