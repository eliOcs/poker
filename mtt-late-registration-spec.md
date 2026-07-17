# MTT Late Registration Specification

## Summary

Allow a signed-up player who has never entered a running multi-table tournament to register during a server-controlled entry period. Registration commits the buy-in immediately. The entrant then waits in the tournament lobby until the existing between-hands coordination and rebalancing workflow can assign a safe seat.

Late registration and rebuys share one independently configured entry-period length. In the initial release the value is fixed at four levels in the product UI, but it must be represented as tournament configuration so it can become editable later. The entry period does not derive from or alter the break schedule.

## Goals

- Permit new players to register after an MTT starts and through the configured level.
- Use one server-authoritative, clock-based cutoff for late registration and new rebuy eligibility.
- Keep table mutations between hands and extend the existing reconciliation workflow to handle increases as well as decreases in the field.
- Give a paid entrant immediate confirmation and a clear waiting state until a table is assigned.
- Include late entrants immediately in the prize pool, payout tier, standings, winner detection, and final tournament summary.
- Prepare the entry-period length for future configuration without adding an editable control now.

## Non-goals

- Configuring the entry-period length in the UI.
- Configuring or changing the break schedule.
- Moving the first break when the entry period changes.
- Allowing re-entry through late registration after a player has already entered.
- Allowing unregistering after the tournament starts.
- Adding an entrant or table cap.
- Changing the existing maximum-rebuy setting or the rebuy decision countdown.

## Terminology

- **Entry period**: the shared number of blind levels during which new players may late-register and players may become eligible for a new rebuy offer.
- **Late entrant**: a player whose first entry is accepted after the tournament has started.
- **Waiting entrant**: a committed entrant who has not yet been assigned a table and seat.
- **Safe table**: a table at the existing between-hands rebalancing boundary (`isTableReadyForRebalance`).

## Tournament configuration

Add an integer tournament configuration value named `entryPeriodLevels`.

- The default is `4`.
- The value is stored on every managed tournament and exposed in its view so UI copy is derived from tournament state rather than a duplicated frontend constant.
- The MTT manager creation boundary accepts the value, applies the default when omitted, and validates it as a non-negative integer no greater than the available blind-level count.
- The HTTP create-MTT route does not accept a client-provided override in this release. It creates tournaments with the server default.
- No creation-form field is added.
- A value of `0` is a valid internal configuration and means no late registration or new rebuy eligibility after the tournament starts. This supports disabling the feature without a separate flag.

This setting is independent of breaks. With `entryPeriodLevels: 5`, for example, the entry period remains open during the break after level 4 and closes when level 5 expires. Future break configuration, such as a break every X levels, must not change the entry-period calculation.

## Entry-period clock and cutoff

The backend is authoritative for whether the entry period is open.

- Before the tournament starts, normal registration remains open regardless of the entry-period clock.
- Once the tournament starts, the entry period covers the configured number of completed playing levels. Break time does not count as a level and does not itself open or close the period.
- The period closes immediately on the clock tick that completes the configured final level.
- Closing does not wait for active hands to finish.
- A registration request is accepted or rejected using the server state when the request is handled. A request handled after closure fails even if the client rendered an enabled button moments earlier.
- Closure is permanent; the period cannot reopen later.
- A late registration accepted before closure remains committed and must be seated even if assignment happens after closure.

Use a single predicate for both `canRegister` and new rebuy eligibility. Do not continue deriving rebuy eligibility from `BREAK_AFTER_LEVEL` or `onBreak`. Because the tournament level may remain unchanged while a break is pending or active, the model must retain an explicit permanent closure state or equivalent completed-level state; checking only `level <= entryPeriodLevels` is insufficient.

### Existing rebuy offers at cutoff

The cutoff prevents new rebuy offers. An unresolved rebuy decision created while the period was open remains grandfathered and keeps the existing decision countdown after closure. Preserve the current rebuy-period transition behavior for these pending decisions.

## Registration eligibility

A player may late-register only when all of the following are true:

- The tournament status is `running`.
- The entry period is open.
- The player is signed up and has an email, matching pre-start registration requirements.
- The player does not already exist in `tournament.entrants`.

An eliminated player cannot use late registration as a fresh entry. Their only return path is the existing rebuy flow, subject to the configured maximum number of rebuys and the shared cutoff.

There is no entrant or table cap. The manager creates additional managed tables when required.

## Registration transaction

On an accepted late-registration request, the server synchronously:

1. Adds the player to `tournament.entrants` with the full configured `initialStack`, zero hands played, zero rebuys used, the next registration order, and the current registration timestamp.
2. Leaves the entrant in the existing `registered` status with no `tableId` or `seatIndex` until seating succeeds. A new entrant-status enum value is not required.
3. Commits the buy-in. The entrant cannot unregister after the tournament has started, including while waiting for a table.
4. Includes the entrant immediately in entrant count, prize pool, payout-tier selection, standings, net-winnings accounting, and final OTS output.
5. Triggers the centralized tournament reconciliation workflow so seating can occur at the next safe opportunity.
6. Returns the updated player-specific tournament view immediately; it does not hold the HTTP request open until seating.

The existing pre-start registration path continues to create `registered` entrants. Starting the tournament seats all pre-start entrants as it does today.

## Waiting and seating behavior

Table seating and player moves must never mutate the participant collection of an active hand.

- A waiting late entrant remains in the lobby until a safe table assignment is made.
- The entrant's stack stays at the full initial stack while waiting. They post no blinds and cannot be blinded out before seating.
- A waiting entrant counts as active for tournament winner detection. A tournament cannot finish while any committed entrant is waiting for a table.
- Waiting entrants also count when assigning finish positions to newly eliminated players. A player who busts while another paid entrant is waiting must not receive a position that excludes that entrant from the remaining field.
- Once seated, the entrant follows normal MTT behavior. If absent or disconnected, the existing sitting-out/automatic-action behavior may eventually blind them out.
- A late entrant receives the full initial stack regardless of the current level and retains the tournament's full configured rebuy allowance. Rebuys still must be offered before the shared cutoff.

### Reconciliation and table growth

Extend the existing deterministic reconciliation/rebalancing workflow rather than introducing a separate seating system.

The workflow must:

- Treat `registered` entrants in a running tournament as a queue ordered by `registrationOrder`.
- Consider both seated and waiting entrants when calculating the required number of tables and the target distribution.
- Seat waiting entrants only at tables that are safe for rebalancing.
- Prefer the least-populated eligible active table; break deterministic ties using existing table creation order and use the first available seat according to existing seating rules.
- Create additional managed tables when the active tables do not provide enough capacity.
- Move already seated players only through the existing between-hands move rules.
- Allow reconciliation to finish over multiple hand boundaries when not every source or destination table is safe at the same time.
- Preserve the invariant that every accepted entrant is eventually assigned and that, once all relevant tables become safe, active table populations differ by no more than one.
- Broadcast every changed table and one updated tournament view through the existing reconciliation path.

New table names and creation order continue the existing managed-table conventions. The special `Final Table` behavior must remain correct if late registration grows a tournament that had already collapsed to one table: a second table may be created when capacity requires it, and names must remain unambiguous. The implementation must not assume that table count only decreases after tournament start.

Seat assignment emits the existing player-move notification shape (`playerMoved`) for the newly assigned player as well as for moved incumbents. The current frontend behavior then shows `Moved to <table name>` and navigates the player to their table.

## Winner detection and finishing

- Waiting entrants count as contenders for the purpose of deciding whether only one player remains.
- If exactly one active entrant remains, nobody is waiting, and no rebuy decision is unresolved, finish immediately and declare the winner even if late registration is still open.
- Once a tournament is `finished`, late registration is closed permanently and all requests fail.
- A tournament is not kept artificially alive until the advertised cutoff merely because another player could theoretically register later.

## Tournament view and actions

Expose enough state for a thin frontend:

- `entryPeriodLevels`
- `entryPeriodOpen` for the current server-authoritative state
- Existing entrant status, table, and seat fields
- `actions.canRegister`, true for a non-entrant during pre-start registration or while a running tournament's entry period is open
- `actions.canUnregister`, true only for a `registered` entrant before the tournament starts

For a running tournament, an entrant with status `registered` and no assigned table is rendered as **Waiting for table**. Before start, the same internal status remains rendered as **Registered**.

Prize pool and payouts update in the view as soon as registration is accepted, before seating.

## Lobby UX

Do not add a new creation control or an additional late-registration summary card.

### Rebuy explanation

Keep the existing `Rebuys: <maxRebuys>` summary item. Add a keyboard-accessible hover/focus tooltip using dynamic tournament configuration:

> Rebuys are allowed through level 4.

Replace `4` dynamically when `entryPeriodLevels` differs.

### Registration action

- Before start, retain the existing **Register** button.
- While the tournament is running and the entry period is open, show **Late Register** to an eligible non-entrant.
- Give the late-registration button a keyboard-accessible hover/focus tooltip:

  > Late registration is allowed through level 4.

- Replace `4` dynamically when `entryPeriodLevels` differs.
- Hide the action once the period closes or the tournament finishes.
- A stale request rejected by the server uses the existing error-toast path and a clear message such as `registration is closed`.

### Successful registration feedback

If the successful action response still shows the current player as `registered` without a table, display an informational toast:

> Registered. Waiting for a table.

The standings status simultaneously shows **Waiting for table**. When seating completes, reuse the existing `playerMoved` event, `Moved to <table name>` toast, and automatic navigation to the assigned table.

If seating completes synchronously during the registration reconciliation, avoid showing a stale waiting toast; use the assignment notification/navigation behavior.

## API behavior

Keep the existing endpoint:

```http
POST /api/mtt/:tournamentId/register
```

It now supports both pre-start and late registration. No request body is required.

Expected failures retain the existing tournament error response mechanism:

- unsigned guest: `sign up required to register`
- existing or formerly eliminated entrant: `player already registered`
- cutoff reached or tournament finished: `registration is closed`
- unknown tournament: `tournament not found`

The endpoint remains idempotency-safe by rejection rather than silently accepting duplicate entries: concurrent duplicate requests may produce one success and one `player already registered` failure, never two buy-ins.

## Accounting and persistence

- `calculatePrizePool()` continues to use entrant count plus accepted rebuys. Adding the late entrant to the entrants map commits their buy-in immediately.
- Payout-tier selection uses the updated entrant count immediately.
- Net winnings charge every late entrant one initial buy-in plus accepted rebuys, exactly like a pre-start entrant.
- The managed MTT summary is built from the final entrants map, so all late entrants must appear in `player_count` and `tournament_finishes_and_winnings`.
- A waiting entrant must be seated before the tournament can finish, ensuring every entrant receives a valid final position.
- Finished-tournament recovery should populate the new configuration/view fields with the server default when the historical OTS format does not contain them. No OTS extension is required solely for this feature.

## Logging and observability

Use the existing canonical HTTP request log for registration requests and existing tournament/table broadcasts. Enrich the registration lifecycle context where practical with:

- `tournamentId`
- `playerId`
- whether the registration was late
- accepted/rejected result
- current level
- configured entry-period levels
- whether the entrant was seated immediately or queued

Do not add per-tick success logs.

## Acceptance criteria

### Configuration and cutoff

- A new tournament defaults to `entryPeriodLevels: 4`.
- A manager-level test can create a tournament with a different valid entry-period length without changing the break schedule.
- Invalid manager-level entry-period values are rejected at creation.
- With the default, registration and new rebuy eligibility close on the tick that completes level 4, whether tables are mid-hand, waiting, or waiting for the first break.
- If the entry period extends beyond level 4, it stays open during the level-4 break and closes only after its configured final playing level expires.
- A request accepted before closure remains valid; one handled after closure is rejected.
- A grandfathered rebuy offer keeps its existing countdown after closure, but no new offer is created after closure.

### Eligibility and accounting

- A signed-up non-entrant can late-register while the period is open.
- A guest, duplicate entrant, eliminated entrant, or player arriving after closure cannot late-register.
- A successful late entrant gets the full initial stack and full rebuy allowance.
- The buy-in, entrant count, prize pool, payout tier, and standings update immediately while the entrant is still waiting.
- No player can unregister after tournament start.
- There is no field or table cap.

### Seating and balancing

- Registration returns immediately when all tables are mid-hand.
- The waiting player renders as `Waiting for table`, has no table/seat, and is not dealt cards or charged blinds.
- No seat is added and no incumbent is moved at a mid-hand table.
- Reconciliation seats queued entrants in registration order when safe capacity becomes available.
- A late entrant is placed at a least-populated eligible table when capacity exists.
- When all tables are full, reconciliation creates the required table capacity and safely redistributes players at between-hands boundaries.
- Multiple late entrants and multiple newly required tables are supported without a cap.
- A tournament that previously collapsed to a final table can grow again without corrupting table names, histories, routes, or player assignments.
- The assigned entrant receives `playerMoved`, sees the existing move toast, and is navigated to the correct table.

### Winner and summary behavior

- One seated player plus one waiting entrant does not finish the tournament.
- One remaining entrant, no waiting entrants, and no unresolved rebuy decisions finishes immediately even while the entry period is open.
- A finished tournament rejects registration.
- Late entrants appear in final positions, prizes, net winnings, OTS player count, and recovered finished views.

### Frontend

- Before start, the action label remains `Register`.
- During the open running period, an eligible player sees `Late Register` and its level tooltip.
- After closure, the action is absent even before a refreshed request is attempted.
- The Rebuys summary tooltip uses the configured level.
- Tooltips work with pointer hover and keyboard focus.
- A queued success shows `Registered. Waiting for a table.` and the standings show `Waiting for table`.
- The UI does not add a creation setting or a separate late-registration status card.

## Likely implementation areas

- `src/backend/mtt.js`: configuration, registration rules, reconciliation trigger, clock transition, and winner checks.
- `src/backend/mtt-rebuy-policy.js`: replace break-derived eligibility with the shared entry-period predicate.
- `src/backend/mtt-rebuy-clock.js`: preserve pending rebuy countdown behavior on the new cutoff transition.
- `src/backend/mtt-collapse.js` and `src/backend/mtt-seating.js`: queue admission, table growth, and deterministic balancing.
- `src/backend/mtt-table-state.js`: active/waiting entrant counts and safe coordination helpers.
- `src/backend/mtt-view.js`: entry-period fields, late-register action, waiting display inputs, and immediate accounting.
- `src/backend/mtt-recovery.js`: defaults for recovered finished tournaments.
- `src/frontend/mtt-lobby.js` and `src/frontend/mtt-lobby-render.js`: labels, waiting status, tooltips, and registration feedback.
- `src/frontend/app-mtt-routing.js`: successful queued-registration toast without disrupting existing table-assignment navigation.
- Backend MTT, rebuy-clock, reconciliation, collapse, broadcast, frontend lobby, routing, and end-to-end tests.
