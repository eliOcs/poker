# MTT Late Registration Implementation Plan

This plan implements [mtt-late-registration-spec.md](./mtt-late-registration-spec.md) using the project's existing server-authoritative MTT model. The recommended sequence follows “tidy first, make the change easy, then make the change” and keeps each commit independently validated.

## Recommended approach

Late registration should remain an extension of the existing tournament manager and between-hands reconciliation workflow. It should not introduce a second seating system, a second entrant status, or frontend-owned eligibility logic.

The work should be split into four commits:

1. Make the tournament clock, entrant populations, table populations, and reconciliation state explicit without changing behavior.
2. Add the shared entry-period configuration and cutoff, and move rebuy eligibility onto it.
3. Add backend late registration and bidirectional field reconciliation, including table growth, accounting, finishing, recovery, and observability.
4. Add the lobby UX, action feedback, visual fixtures, and end-to-end coverage.

Before each commit, run the targeted tests listed for that commit, then both:

```bash
npm run validate
npm run test:e2e
```

`npm run validate` already includes backend/frontend tests, the E2E smoke suite, UI-catalog regression tests, architectural checks, and semantic review. `npm run test:e2e` is still required separately because it also runs the slow MTT stress scenario.

## Why preparatory refactoring is warranted

The current implementation has good primitives, but several names and assumptions are narrower than the feature:

| Current area                                 | Current assumption                                                                                                                                                                     | Needed seam                                                                                                                                             |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `poker/tournament-clock.js`                  | A caller can observe level changes and break transitions, but not every completed playing level. In particular, level 4 can complete while the level remains 4 and a break is pending. | Return the completed playing level from the tick so the cutoff is exact and independent of breaks.                                                      |
| `mtt-rebuy-policy.js`                        | Rebuy eligibility is derived from `BREAK_AFTER_LEVEL`, `level`, and `onBreak`.                                                                                                         | One permanent, tournament-owned entry-period predicate shared by late registration and new rebuy offers.                                                |
| `mtt-table-state.js`                         | “Active” generally means a populated open table; zero-player tables are excluded.                                                                                                      | Distinguish open managed tables from populated tables so newly created capacity participates in reconciliation.                                         |
| `mtt-seating.js` / `mtt-player-lifecycle.js` | Contenders and active entrant counts mean seated players only.                                                                                                                         | Explicit helpers for seated contenders, waiting entrants, and all remaining entrants so winner detection and finish positions use the right population. |
| `mtt-collapse.js`                            | Table count only shrinks and `pendingCollapse` only describes shrink work.                                                                                                             | A bidirectional reconciliation state and workflow that can shrink, grow, seat queued entrants, and rebalance over multiple safe boundaries.             |
| `mtt-view.js`                                | Registration actions exist only before start, and a running `registered` entrant is not charged in displayed net winnings.                                                             | Server-derived entry state/actions and immediate accounting for waiting entrants.                                                                       |
| MTT table naming                             | A tournament reaches `Final Table` only once because table count never grows afterward.                                                                                                | Deterministically rename a growing final table back into the regular `Table N` sequence so `Final Table` can be reused after the next collapse.         |

These are domain distinctions rather than abstractions for their own sake. Making them explicit first reduces the risk of accidentally seating into a live hand, reopening a cutoff during a break, declaring a winner with a paid player waiting, or assigning the wrong finish position.

## Target domain model and invariants

### Entry period

Add these fields to `ManagedTournament` and its view:

```javascript
entryPeriodLevels: 4;
entryPeriodOpen: true; // only meaningful while status === "running"
```

- Define and export `DEFAULT_ENTRY_PERIOD_LEVELS = 4` from a small MTT entry-policy module, alongside the single `isEntryPeriodOpen(tournament)` predicate.
- `createTournament()` accepts an internal `entryPeriodLevels` option, defaults it, and validates a non-negative integer no greater than `Tournament.getMaxLevel()`.
- The HTTP create route continues to omit this option, so clients cannot override it in this release.
- Before start, registration eligibility continues to depend on `status === "registration"`, not on `entryPeriodOpen`.
- On start, set `entryPeriodOpen` to `entryPeriodLevels > 0`.
- Extend `tickClock()`'s result with the playing level that completed on that tick. Close `entryPeriodOpen` when that value reaches the configured final entry level. Never set it back to true.
- Set `entryPeriodOpen` to false when the tournament finishes and on recovered finished tournaments.
- Make `isRebuyPeriodOpen()` delegate to the shared entry-period predicate, or replace it with the shared predicate if the resulting call sites remain clearer.
- Continue using the existing open-to-closed transition in `mtt-rebuy-clock.js` to start clocks for grandfathered unresolved offers. New offers consult the shared predicate and are therefore rejected after cutoff.

This handles all important boundaries:

- `0` is closed from the moment play starts.
- `4` closes on the tick that completes level 4, whether the break starts immediately or becomes pending behind an active hand.
- `5` remains open during the level-4 break and closes only when level 5 completes.
- A completed maximum blind level is still observable even when the numeric level cannot advance further.

### Entrant populations

Keep the existing entrant statuses, but name the populations explicitly:

- **Waiting entrants**: `status === "registered"` in a running tournament, ordered by `registrationOrder`.
- **Seated contenders**: chip-positive entrants with a valid seat and `status === "seated"` (plus the existing winner handling where needed).
- **Remaining entrants**: waiting entrants plus seated contenders/winner; eliminated entrants are excluded.

Use remaining entrants for elimination positions and the “how many players are left?” decision. Winner detection succeeds only when there is exactly one seated contender, zero waiting entrants, and no unresolved rebuy decision. It does not consult `entryPeriodOpen`, so a heads-up tournament may finish while registration is still advertised as open.

### Table populations and reconciliation

Use separate helpers for:

- all open managed tables, including zero-player tables;
- populated open tables used by game-clock and break coordination;
- safe open tables satisfying `isTableReadyForRebalance()`;
- each table's active player count and available seat count.

Generalize `pendingCollapse` to a neutral name such as `pendingRebalance`. While reconciliation is incomplete, safe tables must not start another hand. Mid-hand tables continue normally and join reconciliation as they reach the existing safe boundary.

The reconciliation pass should be deterministic and idempotent:

1. Read waiting entrants in registration order and calculate the required open-table count from all remaining entrants.
2. If a final table must grow back into a multi-table field, rename it into the regular table sequence; then create any additional managed tables required for capacity.
3. Seat each waiting entrant at the least-populated safe table with an available seat; break ties by `createdOrder`, then use `findAvailableSeat()` for the seat choice.
4. Rebalance incumbents only from and to safe tables, using the current deterministic source/destination and seat ordering.
5. Collapse excess tables using the existing safe move rules.
6. If waiting entrants remain, the open-table count is wrong, or populations still differ by more than one, retain `pendingRebalance` and retry from ticks and hand-finalization callbacks.
7. Once complete, clear `pendingRebalance`, synchronize countdowns, broadcast every changed table once, and broadcast one tournament view with all `playerMoved` events.

Registration calls this same pass synchronously. It returns the resulting player-specific view immediately whether the entrant was assigned or remains queued.

### Final-table growth and naming

Table IDs remain the durable route/history identity, but displayed names must also remain unambiguous.

- Add one deterministic table-name allocator rather than constructing names ad hoc in `startManagedTables()` and final-table merging.
- Continue regular names as `Table N`, always choosing the next unused number.
- If growth would turn the only open `Final Table` into a multi-table field, immediately rename its managed-table record and live `game.tableName` to the next `Table N`, then create the additional regular tables required for the enlarged field.
- Hand history already snapshots `game.tableName` when a hand starts. A rename during an active hand therefore leaves that hand recorded as `Final Table`; hands started afterward use the new `Table N`. The stable table ID/handle keeps both sets of hands on the same history route.
- Newly created tables are safe, so waiting entrants may be seated there immediately and receive `playerMoved` even while the renamed table is mid-hand. Mark reconciliation pending so a newly populated table cannot start prematurely before the field is balanced.
- Do not change the renamed table's participant collection during its active hand. Move incumbents only after it reaches `isTableReadyForRebalance()`, then converge to the target distribution through the normal reconciliation retries.
- When busts reduce the field to one table again, use the existing safe collapse behavior to close the regular tables and create a new table named exactly `Final Table`. Because the prior managed table was renamed, the live tournament view has no duplicate final-table name. Repeat the same rename/grow/collapse lifecycle if late registration expands the field again.
- Broadcast the renamed table, every newly created or otherwise changed table, and one updated tournament view through the centralized reconciliation path.

Only mutation of an already active table's seats and incumbent movement wait for that table's safe boundary. Renaming, creating capacity, and seating entrants at a newly created safe table do not.

## Commit 1: Tidy reconciliation and clock boundaries without changing behavior

Suggested commit message:

```text
refactor(mtt): make reconciliation boundaries explicit
```

### Implementation

- In `src/backend/poker/tournament-clock.js`, add a `completedLevel` result (undefined when no playing level completed) while preserving all existing level/break mutations.
- Extend `test/backend/poker/tournament-tick.js` and the MTT clock tests to cover immediate breaks, pending breaks, post-break advancement, and completion of the maximum level.
- In `src/backend/mtt-table-state.js`, separate open-table discovery from populated-table discovery. Keep break and clock behavior on the appropriate populated-table helper.
- In `src/backend/mtt-seating.js`, introduce clearly named helpers for waiting entrants, seated contenders, and remaining entrants. Do not switch winner/elimination behavior in this commit.
- Rename `pendingCollapse` to `pendingRebalance` throughout the managed tournament state, table countdown synchronization, recovery, and tests. Preserve the current collapse behavior.
- Refactor `src/backend/mtt-collapse.js` into a neutral reconciliation module (for example `mtt-reconciliation.js`) that still performs only today's collapse/balance behavior in this commit. Keep orchestration and broadcasts centralized in `mtt.js`.
- Centralize managed table-name allocation and creation-order logic, initially preserving current names for tournaments that only shrink.
- Update dependency rules/graphs only if the file move changes checked architecture. Regenerate `doc/deps-backend.svg` with `npm run deps` if required by repository policy; do not hand-edit it.

### Tests

- Existing `test/backend/mtt-collapse.test.js` and `test/backend/mtt-reconciliation.test.js` must pass unchanged in behavior.
- Add focused unit coverage for open empty tables versus populated tables and for the renamed pending state suppressing countdowns.
- Run the full validation gates before committing.

## Commit 2: Add the shared entry-period configuration and cutoff

Suggested commit message:

```text
feat(mtt): add server-authoritative entry period
```

### Implementation

- Add `src/backend/mtt-entry-policy.js` with the default, validation, and single open predicate.
- Add `entryPeriodLevels` and permanent `entryPeriodOpen` state to the managed tournament typedef, creation path, start transition, finish transition, view, and recovery defaults.
- Consume `tickClock()`'s `completedLevel` in `mtt.js` and close the entry period before opening any post-hand rebuy offer on or after the cutoff tick.
- Move rebuy eligibility in `mtt-rebuy-policy.js` and `mtt-rebuys.js` to the shared predicate.
- Keep `applyRebuyPeriodTransition()` responsible for grandfathered unresolved decisions; consider renaming it to an entry-period-neutral name only if all affected call sites and tests become clearer.
- Keep `POST /mtt` on the server default. Do not parse or forward a client `entryPeriodLevels` field.
- Expose `entryPeriodLevels` and `entryPeriodOpen` from `mtt-view.js` for all live and recovered tournaments.

### Tests

- Manager creation defaults to 4, accepts 0 and other valid values, and rejects negative, fractional, non-number, and greater-than-level-count values.
- An HTTP create request containing an extra `entryPeriodLevels` value cannot override the server default; the resulting tournament still uses 4.
- Cutoff closes exactly when configured levels 0, 4, 5, and the maximum level complete.
- Level-4 pending-break and active-break cases prove the result is independent of `BREAK_AFTER_LEVEL`.
- Rebuy tests prove no new offer opens after cutoff while a pre-cutoff unresolved offer retains its existing countdown and can still be accepted.
- Recovery tests assert the default configuration and closed state for historical finished OTS data.
- Update frontend/test fixture tournament views with the two new required fields, without exposing UI behavior yet.
- Run the full validation gates before committing.

## Commit 3: Add backend late registration and field growth

Suggested commit message:

```text
feat(mtt): admit and seat late entrants
```

### Registration and API

- Change `registerPlayer()` to accept either pre-start registration or running registration while `isEntryPeriodOpen()` is true.
- Validate in a stable order so expected errors remain exact:
  1. tournament exists;
  2. user has an email;
  3. entrant map does not already contain the player (including eliminated entrants);
  4. pre-start registration is open or running entry period is open; otherwise `registration is closed`.
- Insert the entrant synchronously with full `initialStack`, zero hands, zero rebuys, next registration order, current timestamp, `registered` status, and no table/seat.
- For a running tournament, call centralized reconciliation once and return its resulting player-specific view. Never wait for a future hand boundary.
- Keep unregister restricted to `status === "registration"`; a queued late entrant has committed the buy-in.
- In `mtt-view.js`, set `actions.canRegister` for a non-entrant during pre-start registration or while a running tournament satisfies the shared entry-period predicate. Keep `actions.canUnregister` true only for a pre-start `registered` entrant.
- Duplicate requests remain safe because the synchronous map check and insertion happen without an asynchronous gap.
- Enrich the canonical registration HTTP log in `game-routes.js` with `tournamentId`, `playerId`, late/pre-start mode, accepted/rejected result, current level, configured entry levels, and immediate/queued seating result where available. Do not log email addresses and do not add tick logs.

### Reconciliation, winner detection, and lifecycle

- Extend the refactored reconciliation pass with capacity growth, waiting-queue seating, incumbent balancing, final-table expansion, and retry behavior described above.
- Emit the existing `playerMoved` event for newly seated entrants as well as incumbents. Reuse existing WebSocket delivery, toast, and route navigation.
- Include waiting entrants in remaining-field counts used by `processTableAfterHand()` and `finalizeRebuyDecision()` so bust positions include paid queued players.
- Block winner detection while any waiting entrant exists. Preserve the current global unresolved-rebuy guard.
- Continue to finish immediately with one seated contender, no waiting entrants, and no unresolved rebuy decisions even while the entry period is open.
- Ensure finishing permanently closes the entry period and cannot leave a `registered` entrant without a final position.
- In `mtt-view.js`, calculate a waiting entrant's net winnings as `-buyIn` (plus accepted rebuys if ever applicable) immediately; do not skip accounting merely because the status is `registered` during a running tournament.
- Confirm prize pool and payout tiers continue to derive from the full entrants map and therefore update before seating.
- Confirm `poker/tournament-summary.js` continues to serialize every final entrant. Add regression coverage for a late entrant rather than changing OTS shape.

### Backend tests

Add focused scenarios rather than one oversized integration test:

- `mtt.test.js` / a new late-registration test file:
  - signed-up non-entrant accepted while open;
  - guest, duplicate, eliminated entrant, closed period, and finished tournament rejected with exact messages;
  - full stack/rebuy allowance/registration order/timestamp;
  - immediate entrant count, prize pool, payout tier, standings, and net accounting;
  - no unregister after start;
  - internal `entryPeriodLevels: 0` disables late registration.
- Reconciliation tests:
  - all tables mid-hand leaves entrant queued and broadcasts the updated tournament once;
  - safe capacity seats queue order at the least-populated eligible table and first available seat;
  - no active hand participant collection changes;
  - multiple entrants require one and then multiple new tables with no cap;
  - partial safety converges over multiple ticks/hand boundaries to populations differing by at most one;
  - queued entrants retain full stack and are never dealt or blinded while waiting;
  - final-table expansion renames the existing table without changing its ID, keeps an active hand's captured history name, uses the regular name for later hands, and eventually creates a new `Final Table` after collapse;
  - each changed table is broadcast once, with one tournament broadcast and one move event per moved/assigned player.
- Lifecycle/finish tests:
  - one seated plus one waiting does not finish;
  - waiting entrants count in simultaneous finish positions;
  - one seated, none waiting, and no pending rebuy finishes while entry is open;
  - a late entrant appears in OTS player count, finishes, winnings, prize pool, and recovered finished view.
- HTTP route tests:
  - endpoint supports running registration;
  - exact error payloads are preserved;
  - canonical log context records accepted/queued/immediate and rejected attempts.
- Game broadcast tests verify the late entrant receives `playerMoved` and all lobby clients receive the refreshed tournament state.
- Run the full validation gates before committing.

## Commit 4: Add lobby UX and end-to-end coverage

Suggested commit message:

```text
feat(mtt): show late registration state in the lobby
```

### Frontend

- In `mtt-lobby-render.js`, derive the registration label from tournament state:
  - `Register` before start;
  - `Late Register` while running and server-provided `actions.canRegister` is true;
  - no action after cutoff or finish.
- Render a running `registered` entrant with no table as `Waiting for table`; keep the same status as `Registered` before start.
- Add dynamic accessible tooltips:
  - Rebuys: `Rebuys are allowed through level N.`
  - Late Register: `Late registration is allowed through level N.`
- Implement each tooltip with a real focusable trigger, `aria-describedby`, a `role="tooltip"` element, and CSS driven by hover and `:focus-visible`/`:focus-within`. Do not rely only on a `title` attribute.
- In `app-mtt-routing.js`, after a successful `register` response:
  - if the response still has `currentPlayer.status === "registered"` and no `tableId`, show the informational `Registered. Waiting for a table.` toast;
  - if a table is already assigned, skip the waiting toast and let existing redirect/player-move behavior navigate and show `Moved to <table name>`;
  - retain the existing error-toast path for stale cutoff failures such as `registration is closed`.
- Keep creation forms unchanged and do not add another summary card.

### Frontend and visual tests

- Extend `test/frontend/mtt-lobby.test.js` for labels, waiting status, hidden closed action, dynamic tooltip text, pointer visibility, keyboard focus, and pre-start compatibility.
- Extend `test/frontend/app-mtt-routing.test.js` for queued success, synchronous assignment, and rejected stale action feedback.
- Update all mock tournament views in app/lobby tests with `entryPeriodLevels` and `entryPeriodOpen`.
- Add UI-catalog cases for an eligible running non-entrant and a queued waiting entrant. Add a focused-tooltip case if the catalog harness can make focus deterministic.
- Regenerate affected Git LFS snapshots with `npm run test:ui-catalog:update`, inspect the diffs, then let `npm run validate` verify them.

### E2E

- Do not add a separate E2E test. Extend the existing 11-player `Tournament E2E` stress scenario in `test/e2e/stress.spec.js` so it covers late registration as part of the full tournament lifecycle.
- Keep all 11 browser sessions initialized and connected to the tournament lobby, but register only players 1–9 before start. Players 10 and 11 remain non-entrant lobby observers when the nine-player field starts.
- Extend the registration helper, or add a late-registration variant, so it can select `Late Register`, complete the existing sign-up return flow, and assert successful registration without waiting for the pre-start-only `Unregister` action.
- Add a small late-registration schedule to `runTournamentLoop()`:
  - when an active player's server-backed tournament view first reports level 2, sign up and late-register player 10, proving the first blind level has completed;
  - when it first reports level 3, sign up and late-register player 11, proving the second blind level has completed;
  - trigger each schedule entry once and record its registered, queued/assigned, and active-in-loop state.
- For each scheduled entrant, assert `Late Register` and its configured-level tooltip before clicking, assert that `Unregister` is unavailable afterward, and verify the lobby entrant count/prize pool advances. Accept either a queued `Registered. Waiting for a table.` response or synchronous assignment because table safety at the level transition is timing-dependent.
- Do not block the action loop while a queued entrant waits for a safe table. Poll pending late entrants alongside the existing snapshots; once `playerMoved` navigates one to an MTT table, assert the move toast and table route, call `waitForTournamentTable()`, add that player's index to `activePlayers`, and mark loop progress.
- Update loop termination/stall accounting so a temporarily queued or scheduled late entrant is not mistaken for a finished field or a stalled tournament. Fail with a focused diagnostic if the tournament finishes before both scheduled registrations are accepted and assigned.
- Calculate initial table IDs, starting-stack assertions, and the initial `activePlayers` set from the nine starting entrants only. Before the final winner assertion, require both late-registration schedule entries to have registered and reached a table; after assignment they participate in the same randomized action, rebuy, elimination, collapse, and winner flow as every other player.
- Keep exact cutoff timing, grandfathered rebuys, multi-boundary balancing, and final OTS assertions in deterministic backend tests. The stress E2E deliberately crosses levels 1 and 2 to verify real late admission, but it should not become the source of truth for tick-exact cutoff behavior.
- Run the full validation gates before committing, including the slow stress suite.

## Final acceptance audit

After all commits, trace every acceptance criterion in the spec to at least one automated test. Pay particular attention to combinations that are easy to cover separately but fail together:

- cutoff tick while a break is pending and hands are active;
- a grandfathered rebuy decision plus a queued late entrant;
- elimination while another entrant is waiting;
- registration that grows a previously collapsed final table;
- multiple late entrants arriving before any table becomes safe;
- an HTTP success response racing with the `playerMoved` WebSocket event;
- finished-tournament recovery from an OTS file with no entry-period fields.

The implementation is complete only when the worktree contains the intended changes/snapshots, `npm run validate` passes, and `npm run test:e2e` passes from a clean server/test-data state.
