# MTT Rebuys Specification

## Summary

Every multi-table tournament (MTT) allows each player to rebuy once after
losing all their chips. The rebuy costs the original buy-in, restores the
original starting stack, and increases the prize pool by the buy-in amount.

Rebuys are currently available until the first tournament break. The cutoff
should remain a centralized rule so it can be changed to a specific blind level
in the future, but it is not configurable per tournament for now.

Sit & Go tournaments are not included.

## Eligibility

A player is eligible for a rebuy when all of the following are true:

- They are playing in an MTT.
- They finish a hand with zero chips.
- They have not already accepted a rebuy in this tournament.
- The first break has not started.

A player who is not eligible is eliminated through the existing tournament
flow without being offered a rebuy.

The cutoff is strict. A player busted in the hand whose completion starts the
first break is not offered a rebuy, even if that hand began before the break.

## Pending rebuy decisions

An eligible busted player enters a pending rebuy state after the hand ends.
They remain in their current table and seat while the decision is pending and
receive exactly two user-facing actions:

- **Rebuy**
- **Leave**

The affected table cannot start its next hand until all of its pending rebuy
decisions are resolved. Other tables continue playing at their own pace unless
the existing tournament coordination rules require them to wait.

If multiple players bust in the same hand, their decisions are concurrent.
Each pending player's card uses the same border that normally identifies the
player whose turn it is to act.

Pending decisions survive disconnects. Reconnecting restores the actions and
any active countdown. A disconnect never pauses the countdown.

## Calling the clock

Any seated player who is not awaiting their own rebuy decision can use the
existing **Call the clock** action. Manual clock availability, its initial wait,
and its countdown duration reuse the existing clock rules.

One call starts the countdown for every unresolved rebuy decision at that
table. Players may still choose **Rebuy** or **Leave** while it runs. When the
countdown expires, every unanswered decision is resolved as **Leave**.

When the rebuy cutoff starts, the server automatically starts the same clock
for all pending rebuy decisions that are not already on the clock. An active
clock is not restarted or extended.

Decisions created before the cutoff are grandfathered: they remain actionable
during this forced countdown. The first break and its timer run concurrently
with the countdown, but no new rebuy decisions may be created after the break
starts.

## Accepting a rebuy

When a player chooses **Rebuy**:

- Mark their single rebuy as used.
- Restore exactly the tournament's original starting stack.
- Keep them at the same table and seat initially.
- Do not assign a finishing position for that hand.
- Increase the prize pool by one original buy-in.
- Recalculate the projected payouts immediately using the enlarged prize pool.
- Continue through the normal next-hand and tournament coordination flow.

The normal rebalance logic may move the player to another table before the next
hand. If no rebalance moves them, they continue at the same table and seat.

There is no wallet, account balance, payment authorization, or payment failure
flow. The rebuy cost is tournament accounting for this play-money site.

If the player later busts again, they are immediately eliminated because their
one rebuy has already been used.

## Leaving or timing out

Choosing **Leave**, or allowing the called clock to expire, has the same result:

- Finalize the player's elimination.
- Assign their finishing position.
- Empty their seat.
- Trigger the existing rebalance logic.
- Leave them connected as an eliminated spectator at their current table.

For multiple players busted in one hand, preserve the existing simultaneous
elimination ordering, but assign finishing positions only to players who leave
or time out. Players who rebuy remain active and are excluded from that
elimination ordering.

## Rebalancing and tournament completion

Rebalancing continues to wait until hands have ended at the required tables. It
must additionally wait until all outstanding rebuy decisions have resolved.
Once those decisions resolve, accepting a rebuy leaves the active player count
unchanged, while leaving or timing out reduces it and invokes the existing
rebalance behavior.

A rebuy decision also prevents the next hand at its table from starting, but it
does not prevent the tournament break itself from starting and running.

The tournament cannot finish while an eligible rebuy decision is pending. Even
if only one player currently has chips, that player is declared the winner only
after every other pending player has chosen **Leave** or timed out. If anyone
rebuys, the tournament continues.

## Prize pool and payouts

Only accepted rebuys affect tournament accounting.

- Each accepted rebuy adds one original buy-in to the prize pool.
- The unique entrant count does not change.
- The number of paid places and payout tier remain based on the unique entrant
  count.
- The existing payout percentages are applied to the enlarged prize pool.
- Existing projected payout and net-winnings displays update accordingly.

Because every player can rebuy at most once, the prize pool is:

```text
buy-in × (unique player count + accepted rebuy count)
```

## Tournament lobby

The tournament lobby displays **Rebuys: 1** alongside the existing buy-in,
table size, clock, player count, and payout details. This is a static tournament
rule indicating that each player may rebuy once; it is not a count of accepted
rebuys and does not change during the tournament.

No accepted-rebuy count, per-player rebuy badge, or detailed rebuy history is
shown in the UI.

## Open Tournament Summary output

Tournament summaries continue to follow the
[Open Tournament Summary specification](https://ts-specs.handhistory.org/),
including its
[`tournament_rebuys` structure](https://ts-specs.handhistory.org/less-than-standardized_tournament_summary-greater-than/tournament_rebuys).

Every MTT summary must:

- Include the `"Re-Entry"` flag because rebuys are available only after a
  player is felted. `"Rebuy"` remains the user-facing term but is not used as
  the new summary flag.
- Set `rebuy_cost` equal to `buyin_amount`.
- Set `prize_pool` to include every accepted rebuy.
- Include only players who accepted a rebuy in `tournament_rebuys`.
- Set `rebuys` to `1` for each included player.
- Omit `addons` from the rebuy objects.
- Use an empty `tournament_rebuys` array when nobody rebought.

Example:

```json
{
  "flags": ["MTT", "Re-Entry"],
  "buyin_amount": 5,
  "rebuy_cost": 5,
  "prize_pool": 25,
  "player_count": 4,
  "tournament_rebuys": [
    {
      "player_name": "player-id",
      "rebuys": 1
    }
  ]
}
```

The existing player identifier convention for `player_name` remains unchanged.

## Net winnings

All existing net-winnings calculations, including player profile history, must
include the player's accepted rebuys:

```text
net result = prize
  - buyin_amount
  - fee_amount
  - (rebuy_cost × player rebuy count)
```

With the current zero entry fee, a player who rebought once has a total cost of
two original buy-ins.

## Boundary and concurrency behavior

- Rebuy state and actions are authoritative on the backend.
- Only the first valid resolution of a pending decision is applied. Duplicate,
  stale, or racing actions cannot create multiple rebuys or undo an
  elimination.
- An accepted rebuy is recorded exactly once and increases the prize pool
  exactly once.
- **Leave** and clock expiry never create a rebuy record.
- A clock-expiry race is resolved by the order in which the server processes
  the expiry and the player's action.

## Out of scope

- Per-tournament rebuy configuration
- More than one rebuy per player
- Top-ups while a player still has chips
- Rebuys for Sit & Go tournaments
- Wallets, balances, deposits, or payment processing
- Add-ons
- Per-player rebuy badges or detailed rebuy history in the UI
