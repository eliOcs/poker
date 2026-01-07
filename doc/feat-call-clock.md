# Feature: Call the Clock

## Overview

When a player takes too long to act, other players can "call the clock" to force a decision within a time limit. This prevents stalling and keeps the game moving.

## User Story

As a player waiting for another player to act, I want to be able to call the clock after they've taken too long, so that the game doesn't stall indefinitely.

## Rules

1. **Eligibility**: After a player has been acting for **60 seconds**, other players can call the clock
2. **Clock Duration**: Once the clock is called, the acting player has **30 seconds** to make a decision
3. **Default Action**: If time expires without action:
   - **Check** if no bet to call
   - **Fold** if there is a bet to call
4. **One Clock Per Turn**: Once the clock is called, it cannot be called again for that action

## Data Model

### Game State

```javascript
// Add to game state
{
  actingSince: number | null,    // Timestamp when current player started acting
  clockCalledAt: number | null,  // Timestamp when clock was called (null if not called)
}
```

### Player View

```javascript
// Add to player view when it's someone's turn to act
{
  canCallClock: boolean,         // True if player can call the clock (60s elapsed, not already called)
  clockExpires: number | null,   // Timestamp when clock expires (null if clock not called)
}
```

## Actions

### callClock

**Request:**

```javascript
{ "action": "callClock" }
```

**Validation:**

- Must not be the acting player's turn
- Acting player must have been acting for >= 60 seconds
- Clock must not already be called

**Effect:**

- Sets `clockCalledAt` to current timestamp
- Broadcasts updated game state with `clockExpires`

## UI

### Clock Status Display

Show clock status near the acting player's seat:

| State                           | Display                                 |
| ------------------------------- | --------------------------------------- |
| Acting < 60s                    | Nothing                                 |
| Acting >= 60s, clock not called | "Call Clock" button for waiting players |
| Clock called                    | Countdown timer (30s -> 0s)             |

### Call Clock Button

- Appears for all players except the one acting
- Only visible after 60 seconds of waiting
- Disabled/hidden once clock is called

### Countdown Timer

- Displays remaining seconds when clock is active
- Visual urgency (color change) when < 10 seconds
- Shows on acting player's seat

## Server Logic

### Tracking Action Time

```javascript
// When action moves to a new player
function setActingPlayer(game, seatIndex) {
  game.actingSeat = seatIndex;
  game.actingSince = Date.now();
  game.clockCalledAt = null;
}
```

### Clock Expiration

```javascript
// Server-side timer checks
function checkClockExpiration(game) {
  if (game.clockCalledAt === null) return;

  const elapsed = Date.now() - game.clockCalledAt;
  if (elapsed >= 30000) {
    // Auto-act: check if possible, otherwise fold
    const canCheck = game.currentBet === game.seats[game.actingSeat].bet;
    if (canCheck) {
      check(game, { seat: game.actingSeat });
    } else {
      fold(game, { seat: game.actingSeat });
    }
  }
}
```

### Player View Updates

```javascript
// In playerView function
function getClockInfo(game) {
  if (game.actingSeat === -1) {
    return { canCallClock: false, clockExpires: null };
  }

  const elapsed = Date.now() - game.actingSince;
  const canCallClock = elapsed >= 60000 && game.clockCalledAt === null;
  const clockExpires = game.clockCalledAt ? game.clockCalledAt + 30000 : null;

  return { canCallClock, clockExpires };
}
```

## Edge Cases

| Scenario                                     | Behavior                                              |
| -------------------------------------------- | ----------------------------------------------------- |
| Player acts before clock expires             | Clock is cleared, normal flow continues               |
| Player disconnects while clock is running    | Clock continues, auto-action on expiry                |
| Clock called but player already disconnected | Existing disconnect timer takes precedence if shorter |
| Multiple players call clock simultaneously   | First call wins, subsequent calls ignored             |
| Hand ends while clock is running             | Clock is cleared                                      |

## Testing

### Backend Tests

- Clock cannot be called before 60 seconds
- Clock cannot be called by acting player
- Clock cannot be called twice
- Auto-check when clock expires with no bet
- Auto-fold when clock expires with bet to call
- Clock clears when player acts
- Clock clears when hand ends

### Frontend Tests

- "Call Clock" button appears after 60 seconds
- "Call Clock" button hidden for acting player
- Countdown timer displays when clock called
- Timer shows correct remaining time
