# Feature: Table Ranking

## Problem

In a poker game where players can rebuy or add chips at any time, raw stack size doesn't reflect who is actually winning. A player with 200 chips who bought in for 300 is losing, while a player with 150 chips who bought in for 50 is winning big.

We need a ranking system that tracks actual performance, not just current chip count.

## Proposed Solution

Add a **Table Ranking** panel that shows players ordered by net winnings, with win rate as a secondary metric.

## Metrics

### 1. Net Winnings (Primary Ranking)

The most straightforward measure of success:

```
Net Winnings = Current Stack - Total Buy-ins
```

**Example:**

- Player buys in for 100, rebuys for 50, currently has 200
- Net Winnings = 200 - (100 + 50) = +50

This is the primary sort key for the ranking.

### 2. Win Rate (BB/100)

The standard metric for measuring poker performance over time, normalized for stakes:

```
Win Rate = (Net Winnings / Big Blind) / (Hands Played / 100)
```

**Example:**

- Big blind is 2
- Player is up 40 chips over 50 hands
- Win Rate = (40 / 2) / (50 / 100) = 20 / 0.5 = **40 BB/100**

**Interpretation:**
| Win Rate | Meaning |
|----------|---------|
| > 10 BB/100 | Crushing it (running hot or playing against weak opponents) |
| 5-10 BB/100 | Very good session |
| 0-5 BB/100 | Slight winner |
| -5-0 BB/100 | Slight loser |
| < -5 BB/100 | Losing session |

Note: In live/home games, win rates tend to be higher due to recreational players.

## Data Model

### Player Session Stats

```javascript
{
  playerId: string,

  // Buy-in tracking
  totalBuyIn: number,      // Sum of all buy-ins and add-ons

  // Hand tracking
  handsPlayed: number,

  // Derived (computed on read)
  // netWinnings = currentStack - totalBuyIn
  // winRate = (netWinnings / bigBlind) / (handsPlayed / 100)
}
```

### Game State Additions

```javascript
game.stats = {
  handNumber: number,           // Increment each hand
  players: Map<playerId, PlayerSessionStats>
}
```

## Implementation Notes

### Buy-in Tracking

Track buy-ins when:

- Player first sits down and buys chips
- Player adds chips (top-up/rebuy)

```javascript
function recordBuyIn(game, playerId, amount) {
  const stats = getPlayerStats(game, playerId);
  stats.totalBuyIn += amount;
}
```

### Hand Counting

Increment `handsPlayed` for each player dealt cards when a hand completes:

```javascript
function endHand(game) {
  game.stats.handNumber++;
  for (const seat of occupiedSeats(game)) {
    if (seat.wasDealtIn) {
      getPlayerStats(game, seat.player.id).handsPlayed++;
    }
  }
}
```

## UI Design

### Ranking Panel

```
┌───────────────────────────────────────────────────────────┐
│ Table Ranking                                             │
├────┬──────────┬─────────────────────┬─────────────────────┤
│ #  │ Player   │ Net                 │ BB/100              │
│    │          │ (profit/loss)       │ (big blinds won     │
│    │          │                     │  per 100 hands)     │
├────┼──────────┼─────────────────────┼─────────────────────┤
│ 1  │ Alice    │ +150                │ +30.0               │
│ 2  │ Bob      │ +45                 │ +9.0                │
│ 3  │ Charlie  │ -20                 │ -4.0                │
│ 4  │ Diana    │ -175                │ -35.0               │
└────┴──────────┴─────────────────────┴─────────────────────┘
```

**Column headers with explanations:**

- **Net** - "Profit/loss" (tooltip: "Current stack minus total buy-ins")
- **BB/100** - "Big blinds won per 100 hands" (tooltip: "Standard win rate metric - higher is better")

**Color coding:**

- Green for positive values
- Red for negative values

## Edge Cases

1. **Player leaves and rejoins** - Track by player ID, preserve stats for session
2. **Hand doesn't complete** (everyone folds preflop) - Still count as hand played
3. **BB/100 with few hands** - Show "-" or "N/A" if hands played < 10 (not statistically meaningful)

## Future Enhancements

- **EV Adjusted Winnings** - Track luck by comparing actual results to expected value at all-ins
- **Session history** - View stats from past sessions
- **Graphs** - Chip count over time
- **VPIP/PFR** - Voluntarily put in pot %, pre-flop raise %
