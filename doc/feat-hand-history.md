# Hand History Feature

## Overview

Record and persist hand histories for replay, analysis, and player records.

## Format: Open Hand History

Using the [Open Hand History](https://hh-specs.handhistory.org/) industry standard.

### Storage Format

Single file per game session using [OHH storage format](https://hh-specs.handhistory.org/storage-format):

```
data/
└── {gameId}.ohh
```

**File format:**

- Plain text with `.ohh` extension
- Each hand wrapped in `{"ohh": <hand_object>}`
- Hands separated by blank lines (newline-delimited JSON)
- Append-only writes

**Example file contents (`data/abc123.ohh`):**

```
{"ohh": {"spec_version": "1.4.6", "game_number": "abc123-1", ...}}

{"ohh": {"spec_version": "1.4.6", "game_number": "abc123-2", ...}}

{"ohh": {"spec_version": "1.4.6", "game_number": "abc123-3", ...}}
```

**Reading:**

```javascript
const hands = fs
  .readFileSync(path, "utf8")
  .split("\n\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line).ohh);
```

**Writing:**

```javascript
fs.appendFileSync(path, JSON.stringify({ ohh: hand }) + "\n\n");
```

### Terminology Mapping (codebase → OHH)

| Codebase           | OHH                        | Status                    |
| ------------------ | -------------------------- | ------------------------- |
| `fold`             | `"Fold"`                   | ✅ Rename only            |
| `check`            | `"Check"`                  | ✅ Rename only            |
| `bet`              | `"Bet"`                    | ✅ Rename only            |
| `raise`            | `"Raise"`                  | ✅ Rename only            |
| `call`             | `"Call"`                   | ✅ Rename only            |
| `allIn` action     | `"is_allin": true` flag    | 🔄 Flag instead of action |
| `blinds` generator | `"Post SB"`, `"Post BB"`   | 🔄 Separate actions       |
| `buyIn`            | `"Added Chips"`            | ✅ Rename only            |
| `sit`              | `"Sits Down"`              | ✅ Rename only            |
| `dealPreflop`      | `"Dealt Cards"` per player | 🔄 Per-player action      |
| (implicit)         | `"Shows Cards"`            | ➕ Add for showdown       |
| (implicit)         | `"Mucks Cards"`            | ➕ Add for showdown       |

### OHH Fields

**Fields we use:**

- `spec_version` - OHH version
- `site_name` - "Pluton Poker"
- `game_number` - unique identifier: `"{gameId}-{handNumber}"`
- `start_date_utc` - timestamp
- `game_type` - "Holdem"
- `bet_limit` - { "bet_type": "NL" }
- `table_size` - 6
- `dealer_seat` - button position
- `small_blind_amount`, `big_blind_amount`, `ante_amount`
- `players` - array of player objects
- `rounds` - array of round objects with actions
- `pots` - array of pot results

**Fields we omit:**

- `network_name` - not part of a poker network
- `currency` - play chips, not real money
- `tournament`, `tournament_info` - cash game only
- `hero_player_id` - we store all players' cards (omniscient view)

### Example Hand

```json
{
  "spec_version": "1.4.6",
  "site_name": "Pluton Poker",
  "game_number": "abc123-42",
  "start_date_utc": "2024-01-15T20:30:00Z",
  "game_type": "Holdem",
  "bet_limit": { "bet_type": "NL" },
  "table_size": 6,
  "dealer_seat": 3,
  "small_blind_amount": 25,
  "big_blind_amount": 50,
  "ante_amount": 5,
  "players": [
    {
      "id": "a1b2c3d4e5f6...",
      "seat": 1,
      "name": "Alice",
      "starting_stack": 1000
    },
    {
      "id": "f6e5d4c3b2a1...",
      "seat": 2,
      "name": null,
      "starting_stack": 1500
    },
    {
      "id": "1234567890ab...",
      "seat": 4,
      "name": "Charlie",
      "starting_stack": 800
    }
  ],
  "rounds": [
    {
      "id": 0,
      "street": "Preflop",
      "actions": [
        {
          "action_number": 1,
          "player_id": "a1b2c3d4e5f6...",
          "action": "Post SB",
          "amount": 25
        },
        {
          "action_number": 2,
          "player_id": "f6e5d4c3b2a1...",
          "action": "Post BB",
          "amount": 50
        },
        {
          "action_number": 3,
          "player_id": "a1b2c3d4e5f6...",
          "action": "Dealt Cards",
          "cards": ["Ah", "Kd"]
        },
        {
          "action_number": 4,
          "player_id": "f6e5d4c3b2a1...",
          "action": "Dealt Cards",
          "cards": ["9s", "9h"]
        },
        {
          "action_number": 5,
          "player_id": "1234567890ab...",
          "action": "Dealt Cards",
          "cards": ["Qc", "Jc"]
        },
        {
          "action_number": 6,
          "player_id": "1234567890ab...",
          "action": "Raise",
          "amount": 150,
          "is_allin": false
        },
        {
          "action_number": 7,
          "player_id": "a1b2c3d4e5f6...",
          "action": "Call",
          "amount": 150,
          "is_allin": false
        },
        { "action_number": 8, "player_id": "f6e5d4c3b2a1...", "action": "Fold" }
      ]
    },
    {
      "id": 1,
      "street": "Flop",
      "cards": ["Qh", "Jc", "2s"],
      "actions": [
        {
          "action_number": 9,
          "player_id": "a1b2c3d4e5f6...",
          "action": "Check"
        },
        {
          "action_number": 10,
          "player_id": "1234567890ab...",
          "action": "Bet",
          "amount": 200,
          "is_allin": false
        },
        {
          "action_number": 11,
          "player_id": "a1b2c3d4e5f6...",
          "action": "Fold"
        }
      ]
    }
  ],
  "pots": [
    {
      "number": 0,
      "amount": 505,
      "player_wins": [
        {
          "player_id": "1234567890ab...",
          "win_amount": 505,
          "contributed_rake": 0
        }
      ]
    }
  ]
}
```

## Decisions

1. **Card visibility** - Store all cards, create player-specific views on read
   - Server stores omniscient view (all hole cards)
   - When player requests history, filter to show only cards they could see
   - Opponent cards hidden unless revealed at showdown

2. **Player identity** - Use existing `player.id` (hex string) as `player_id`
   - Include `name` in players array if player has set one

3. **When to write** - End of hand (append to file)
   - Append hand JSON to game's `.ohh` file when hand completes

4. **File structure** - Single `.ohh` file per game session
   - `data/{gameId}.ohh` contains all hands for that game
   - `game_number` field is globally unique: `"{gameId}-{handNumber}"`

## UI Design

Reference: GGPoker PokerCraft hand history viewer.

### Desktop Layout

```
┌─────────────────────────────────────────────┬────────────────────────┐
│                                             │ Hand List              │
│           Final Table State                 │ ────────────────────── │
│                                             │ Cards | Winner  | Pot  │
│    [P1]          [P2]          [P3]         │ 6♠A♥  | You ★   | $9  │ ← highlighted
│         ┌─────────────────┐                 │ 2♥9♦  | Alice   | $2  │
│         │  [Board Cards]  │                 │ K♠J♥  | You ★   | $4  │ ← highlighted
│         │   Total Pot: X  │                 │ 7♥7♦  | Bob     | $1  │
│         └─────────────────┘                 │ ...                    │
│    [P6]          [P5]          [P4]         │                        │
│                                             │                        │
├─────────────────────────────────────────────┤                        │
│ Action Timeline                             │                        │
│ ─────────────────────────────────────────── │                        │
│ Blinds    │ Pre-Flop │ Flop  │ Turn │ River │                        │
│ SB $25    │ Raise    │ Check │ Bet  │ +$505 │                        │
│ BB $50    │ $150     │       │ $200 │ [hand]│                        │
│           │ Call     │ Fold  │      │       │                        │
│           │ Fold     │       │      │       │                        │
└─────────────────────────────────────────────┴────────────────────────┘
```

### Components

**1. Final Table State (main area)**

- Reuse existing table component from game view
- Show player positions with stack changes (+/- amount)
- Display community cards in center
- Highlight winner with badge
- Show revealed hole cards (showdown only, or all if viewing own history)

**2. Action Timeline (bottom)**

- Horizontal layout, grouped by street
- Columns: Blinds | Pre-Flop | Flop | Turn | River
- Each action shows: player indicator, action name, amount
- Final column shows result: win amount + winning hand

**3. Hand List (right sidebar)**

- Scrollable list of hands in session
- Columns: Hole Cards | Winner | Pot
- Winner column shows player name
- Row highlighted when viewing player won that hand
- Click to select and view hand

### Mobile Layout

```
┌─────────────────────────────┐
│ ←  6♠A♥  You won  $505   →  │ ← Fixed nav bar
├─────────────────────────────┤
│                             │
│      Final Table State      │
│                             │
│   [P1]    [P2]    [P3]      │
│        [Board]              │
│   [P6]    [P5]    [P4]      │
│                             │
├─────────────────────────────┤
│ Blinds                      │  ↑
│   SB $25                    │  │
│   BB $50                    │  │
├─────────────────────────────┤  │
│ Pre-Flop                    │  │
│   Raise $150                │  │ Scrollable
│   Call $150                 │  │
│   Fold                      │  │
├─────────────────────────────┤  │
│ Flop: Q♥ J♣ 2♠              │  │
│   Check                     │  │
│   Bet $200                  │  │
│   Fold                      │  ↓
├─────────────────────────────┤
│ Result: You won $505        │
└─────────────────────────────┘
```

**Key differences from desktop:**

- **Fixed nav bar** with: prev/next arrows, hole cards, winner, pot size
- **No hand list sidebar** - navigate via arrows or swipe
- **Vertical action layout** - streets stacked, each action on own line
- **Street headers** show board cards when dealt (Flop: Q♥ J♣ 2♠)

### Navigation

**Entry point:**

- 🔁 icon on game screen → opens history for current game

**Desktop:**

- Click hand in list → load that hand
- Arrow keys (←/→) to navigate between hands

**Mobile:**

- Tap arrows in fixed nav bar
- Swipe left/right to navigate between hands

**Both:**

- URL: `/history/{gameId}/{handNumber}`
- Back button returns to game screen

## Infrastructure

### Data Persistence

Hand history files stored at `/app/data/{gameId}.ohh` inside container, mounted from host.

**Dockerfile changes:**

```dockerfile
# Create data directory
RUN mkdir -p /app/data && chown nodejs:nodejs /app/data

# Declare volume mount point
VOLUME /app/data
```

**Kamal config (config/deploy.yml):**

```yaml
volumes:
  - /opt/poker/data:/app/data
```

**Host setup (one-time):**

```bash
sudo mkdir -p /opt/poker/data
sudo chown 1001:1001 /opt/poker/data
```

### Backup

- Data lives on root EBS (20GB, persists across reboots)
- For backups: `scp` the `/opt/poker/data/` directory

## Implementation Steps

### Phase 1: Data Recording

**1.1 Hand history recorder module**

- Create `src/backend/poker/hand-history.js`
- `createRecorder(gameId)` - initializes recorder for a game session
- `recordAction(action)` - buffers actions during hand
- `finalizeHand(game)` - builds OHH object, adds to cache, appends to file
- `getHand(gameId, handNumber)` - fetch from cache or file
- Track `handNumber` counter per game
- Internal FIFO cache (1000 hands max)

**1.2 Hook into game flow**

- Call `recordAction()` from action handlers (fold, call, raise, etc.)
- Call `recordAction()` from dealing generators (blinds, dealPreflop, etc.)
- Call `finalizeHand()` from `endHand()` in actions.js

**1.3 File operations**

- Create `data/` directory if not exists
- Append `{"ohh": {...}}\n\n` to `data/{gameId}.ohh`
- Handle file creation on first hand

### Phase 2: API Endpoints

**2.1 List hands**

```
GET /api/history/{gameId}
Response: [{ game_number, hole_cards, winner, pot }, ...]
```

- Parse .ohh file
- Return summary for hand list (filtered to requesting player's view)

**2.2 Get specific hand**

```
GET /api/history/{gameId}/{handNumber}
Response: { ohh: <full hand object> }
```

- Check in-memory cache first (last 10 hands in game state)
- Cache miss → read from .ohh file
- Filter cards based on requesting player's visibility

**2.3 Caching strategy**

- FIFO cache inside `hand-history.js` module (limit: 1000 hands)
- Key: `"{gameId}-{handNumber}"` (same as `game_number`)
- On hand recorded: add to cache, evict oldest if over limit
- On fetch: check cache first, fall back to file read
- Keeps hand history logic self-contained, game state unpolluted

**2.4 Player view filtering**

- Implement `filterForPlayer(hand, playerId)` in player-view.js
- Replace opponent hole cards with `["??", "??"]` unless shown at showdown
- Track which cards were revealed via "Shows Cards" actions

### Phase 3: Frontend Components

**3.1 History page route**

- Add route `/history/{gameId}/{handNumber?}`
- Create `src/frontend/history.js` (Lit component)

**3.2 Table state component**

- Reuse/adapt existing table rendering
- Display final state: positions, stacks, board, revealed cards
- Show winner badge and stack changes (+/- amounts)

**3.3 Action timeline component**

- `<action-timeline>` component
- Desktop: horizontal columns by street
- Mobile: vertical list with street headers
- Render actions with player indicator + action + amount

**3.4 Hand list component (desktop)**

- `<hand-list>` component
- Columns: Hole Cards | Winner | Pot
- Highlight rows where player won
- Click handler to select hand

**3.5 Mobile nav bar**

- `<history-nav>` component
- Shows: arrows, hole cards, winner, pot
- Fixed position at top

**3.6 Entry point**

- Add 🔁 icon to game screen
- Link to `/history/{gameId}`

### Phase 4: Navigation

**4.1 URL routing**

- Update router to handle `/history/{gameId}/{handNumber?}`
- Default to latest hand if handNumber omitted

**4.2 Keyboard navigation (desktop)**

- Arrow keys ←/→ to prev/next hand
- Update URL on navigation

**4.3 Touch navigation (mobile)**

- Swipe left/right gesture detection
- Tap arrows in nav bar

### Phase 5: Testing

**5.1 Backend unit tests**

- `hand-history.test.js`
  - `createRecorder()` initializes correctly
  - `recordAction()` buffers actions
  - `finalizeHand()` produces valid OHH JSON
  - File append works correctly
  - Hand number increments
  - `getHand()` returns from cache
  - `getHand()` falls back to file on cache miss
  - Cache evicts oldest when over limit

**5.2 Player view filtering tests**

- Own cards always visible
- Opponent cards hidden by default
- Opponent cards visible after "Shows Cards" action
- Board cards visible after dealt

**5.3 API endpoint tests**

- `GET /api/history/{gameId}` returns hand list
- `GET /api/history/{gameId}/{handNumber}` returns specific hand
- Cache hit returns same data as cache miss
- Player filtering applied correctly

**5.4 Frontend component tests**

- `<action-timeline>` renders actions grouped by street
- `<hand-list>` highlights winning hands
- `<history-nav>` shows correct hand info
- Navigation updates URL

**5.5 E2E smoke tests**

- Extend existing smoke tests to:
  - Play a hand to completion
  - Click 🔁 icon to open hand history
  - Verify history page loads with hand data

### Phase 6: Polish

- Loading states while fetching hand data
- Empty state when no hands recorded yet
- Error handling for missing/corrupted files
- Responsive breakpoint for desktop ↔ mobile layout switch

## Sources

- [Open Hand History Specification](https://hh-specs.handhistory.org/)
- [OHH Storage Format](https://hh-specs.handhistory.org/storage-format)
- [OHH Action Types](https://hh-specs.handhistory.org/action-object/action_obj/action)
