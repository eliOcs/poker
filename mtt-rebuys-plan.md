# MTT Rebuys Implementation Plan

Related specification: [mtt-rebuys-spec.md](./mtt-rebuys-spec.md)

## Goal

Implement MTT rebuys through a sequence of small, independently reviewable
commits. Refactor the existing code into suitable extension points first, prove
after every refactor that existing behavior is intact, then build the rebuy
feature behind a disabled rebuy limit. Activate the feature only after the full
backend, frontend, accounting, recovery, and test behavior is complete.

The final production rule is:

```text
maxRebuys = 1
```

The implementation must model this as a non-negative integer so a future
change can support `0`, `1`, `2`, or more without redesigning the lifecycle.

## Progress

Update this checklist in the same commit that completes each remaining stage.

- [x] Stage 0 — Baseline validation and documentation (`fe76abd`)
- [x] Stage 1 — Advance the button at hand start for every game type
- [x] Stage 2 — Extract reusable action-clock state
- [x] Stage 3 — Separate payout structure from prize-pool calculation
- [x] Stage 4 — Add a managed table-action dispatch seam
- [x] Stage 5 — Split hand-settled and table-ready concepts
- [x] Stage 6 — Centralize MTT reconciliation
- [ ] Stage 7 — Extract the MTT player lifecycle
- [ ] Stage 8 — Add rebuy policy and usage data
- [ ] Stage 9 — Add dormant rebuy accounting and recovery
- [ ] Stage 10 — Implement the pure rebuy decision state machine
- [ ] Stage 11 — Integrate decisions, actions, and views
- [ ] Stage 12 — Integrate rebuy clocks and cutoff transitions
- [ ] Stage 13 — Activate one rebuy for every MTT

## Working agreement

- One concern per commit.
- Never combine a behavior-preserving refactor with rebuy behavior in the same
  commit.
- Keep every commit buildable, testable, and safe to review in isolation.
- Do not continue to the next stage until the complete verification gate is
  green.
- If a refactor changes behavior unexpectedly, stop and fix or revert it before
  continuing.
- Preserve existing protocol fields and UI behavior during refactor commits,
  except for the explicitly agreed button-timing change.
- Do not include unrelated working-tree changes in any commit.
- Keep MTT state mutations authoritative in the MTT manager and its pure helper
  modules.
- Use plain data objects and pure functions; do not introduce classes or a
  generic workflow framework.
- Derive totals such as prize pool and total rebuys from canonical entrant data
  instead of maintaining duplicate mutable counters.

## Verification gate for every stage

Run the following before each commit:

```bash
npm run validate
npm run test:e2e
git diff --check
```

`npm run validate` already covers formatting, linting, type checking,
duplication, dependency rules, backend tests, frontend tests, the E2E smoke
suite, and UI-catalog visual tests. `npm run test:e2e` additionally runs the
complete Playwright E2E suite.

Before committing:

1. Review the full diff and confirm it contains only the current stage.
2. Confirm no visual snapshot changed during a behavior-preserving refactor.
3. Confirm new tests describe behavior rather than internal structure.
4. Record the successful validation commands in the commit or handoff notes.

When a stage intentionally changes UI snapshots:

```bash
npm run test:ui-catalog:update
npm run validate
npm run test:e2e
git diff --check
```

## Intended architecture

The final model should have one source of truth for configuration and usage:

```javascript
// Managed tournament
{
  maxRebuys: 1,
  entrants: Map<string, {
    // Existing entrant fields
    rebuysUsed: 0,
  }),
}
```

Transient decisions are table-local because seats, concurrent actors, and the
shared decision clock are table-local:

```javascript
// MTT table game
{
  pendingRebuyDecision: {
    entries: [
      {
        playerId,
        seatIndex,
        resolution: undefined, // "rebuy" or "leave"
      },
    ],
    clock: {
      waitTicks: 0,
      countdownTicks: 0,
    },
  },
}
```

The prize pool is derived:

```text
buyIn * (unique entrant count + sum of entrant.rebuysUsed)
```

The MTT manager remains responsible for orchestration, broadcasting,
rebalancing, winner detection, and WebSocket action authorization. Pure helper
modules own calculation and state transitions.

## Phase 0: establish the baseline

### Stage 0 — Baseline validation and documentation

Purpose: begin from a known green state and preserve the agreed design before
code moves.

Actions:

- Commit `mtt-rebuys-spec.md` and this plan as a documentation-only commit.
- Record any pre-existing unrelated working-tree changes and keep them out of
  all feature commits.
- Run the complete verification gate on the unmodified implementation.
- Save the baseline UI-catalog result; no snapshots should be regenerated.

Suggested commit:

```text
docs(mtt): specify and plan rebuy support
```

## Phase 1: independent foundational refactors

Every stage in this phase must preserve existing poker outcomes. Stage 1 has
one intentional timing change: the displayed button remains on the previous
dealer between hands and advances only when the next hand begins.

### Stage 1 — Advance the button at hand start for every game type

Purpose: make the final between-hand player set authoritative for dealer and
blind positions, without MTT-specific pending-button state.

Changes:

- Remove button advancement from `Actions.endHand()`.
- In the production hand-start orchestration, advance the button after
  confirming that at least two players can play and before incrementing the
  hand number, posting blinds, dealing, or starting hand history.
- Do not advance before the first hand (`handNumber === 0`).
- Apply the same rule to cash, Sit & Go, and MTT games.
- Change game recovery to restore the last recorded dealer seat rather than
  precomputing the next dealer. A recovered game's next real hand start then
  advances exactly once.
- Keep the previous dealer visible during waiting periods and countdowns.
- Update the specification with this agreed button rule.

Required tests:

- First hand keeps the initial button.
- Subsequent hands advance exactly once.
- A failed start with fewer than two eligible players does not advance.
- Players who join, leave, sit out, or sit in between hands are considered by
  the next button calculation.
- Heads-up button and blind behavior remains correct.
- Recovered cash and tournament games advance exactly once on their next hand.
- Hand history records the dealer selected at hand start.

Suggested commit:

```text
refactor(poker): advance the button when a hand starts
```

### Stage 2 — Extract reusable action-clock state

Purpose: reuse the existing call-clock timing without copying single-player
betting clock logic into MTT rebuys.

Changes:

- Add a small pure action-clock module with plain clock data and operations for:
  - initialization;
  - elapsed wait ticks;
  - manual clock eligibility;
  - starting a countdown;
  - ticking a countdown;
  - expiry;
  - remaining time;
  - reset.
- Migrate the current betting clock to the shared clock data/functions.
- Keep betting's target in `hand.actingSeat`; the clock module must not know
  about poker seats or actions.
- Preserve the current player-view protocol (`actingTicks` and
  `clockRemaining`) by deriving those fields from the new internal clock.
- Preserve current constants and timing.
- Reset the encapsulated clock when closing/resetting a table.

Required tests:

- All existing call-clock behavior remains unchanged.
- Wait and countdown boundaries are covered directly in the pure clock tests.
- Reset prevents stale countdowns from affecting a later action.
- Clock expiry still performs exactly one automatic poker action.
- Existing player views are byte-for-byte equivalent for clock fields.

Suggested commit:

```text
refactor(poker): extract reusable action clock
```

### Stage 3 — Separate payout structure from prize-pool calculation

Purpose: allow rebuys to enlarge the pool without changing the entrant-based
payout tier.

Changes:

- Add an explicit `calculatePrizesFromPool(playerCount, prizePool)` API.
- Retain `calculatePrizes(playerCount, buyIn)` as a compatibility wrapper for
  existing Sit & Go behavior.
- Migrate MTT backend and frontend callers to the explicit-pool API while still
  passing the current base pool (`playerCount * buyIn`).
- Add `prizePool` to the managed tournament view, initially equal to the
  existing base pool.
- Do not change displayed payout amounts in this stage.

Required tests:

- Existing payout tiers and amounts are unchanged for every covered field
  size.
- The explicit-pool API changes award amounts without changing the number of
  paid positions.
- Rounding behavior remains unchanged.
- MTT lobby and finished summaries contain the same values as the baseline.

Suggested commit:

```text
refactor(tournament): calculate payouts from an explicit pool
```

### Stage 4 — Add a managed table-action dispatch seam

Purpose: let MTT-owned actions mutate canonical managed tournament state
without putting MTT lifecycle behavior in generic poker actions.

Changes:

- Add an optional managed table-action handler to the WebSocket server/message
  dispatcher dependencies.
- Give the handler the authenticated player, game, action, and parsed action
  arguments.
- Let the handler report whether it handled the action.
- When handled, skip dynamic `PokerActions[action]` dispatch and avoid duplicate
  broadcasts.
- Keep generic poker actions and their logging unchanged when the handler does
  not handle a message.
- Wire a no-op/unhandled callback from the MTT manager; do not add rebuy actions
  yet.

Required tests:

- Existing poker and social actions follow their original paths.
- A handled managed action never reaches generic poker actions.
- An unhandled action retains existing error and broadcast behavior.
- Authentication, rate limiting, canonical logging, and error responses remain
  unchanged.

Suggested commit:

```text
refactor(ws): support managed table actions
```

### Stage 5 — Split hand-settled and table-ready concepts

Purpose: prepare for the rule that a break may start while rebuy decisions are
pending, but a next hand or rebalance may not.

Changes:

- Introduce explicit predicates for:
  - a hand being settled/between hands;
  - a table being ready to start another hand;
  - a table/tournament being safe for rebalancing.
- Initially make the new predicates reproduce the existing behavior exactly.
- Use the hand-settled predicate for break progression.
- Use next-hand readiness for table countdowns.
- Use rebalance readiness in table collapse and balancing.
- Keep pending hand-history semantics intact.

Required tests:

- Existing break timing is unchanged.
- Waiting-table countdowns are unchanged.
- Final-table collapse and balancing safe points are unchanged.
- Pending hand history is still finalized before movement or restart.

Suggested commit:

```text
refactor(mtt): distinguish settled and ready tables
```

### Stage 6 — Centralize MTT reconciliation

Purpose: prevent winner detection, rebalancing, synchronization, and
broadcasting from being copied across hand-finalization, timer, and future
rebuy-action paths.

Changes:

- Extract one private reconciliation flow responsible for:
  - determining whether tournament coordination may proceed;
  - winner detection and tournament finalization;
  - table collapse and balancing;
  - synchronizing changed tables;
  - broadcasting table and tournament state;
  - forwarding player-move events.
- Invoke it from both `handleHandFinalized()` and `tickTournament()`.
- Preserve the current ordering around pending hand-history finalization and
  break progression.
- Do not add pending-rebuy checks yet.

Required tests:

- Characterize both existing entry paths before moving the logic.
- Winner detection remains unchanged.
- Rebalances and final-table merges produce the same moves and broadcasts.
- Tick-based recovery of settled hands remains unchanged.
- No broadcast is lost or duplicated.

Suggested commit:

```text
refactor(mtt): centralize tournament reconciliation
```

### Stage 7 — Extract the MTT player lifecycle

Purpose: remove immediate bust/elimination mutations from the already large MTT
manager before adding post-hand decisions.

Changes:

- Move busted-player detection, deterministic ordering, elimination, finishing
  positions, and seat cleanup into a focused `mtt-player-lifecycle.js` module.
- Keep the current immediate-elimination behavior unchanged.
- Keep orchestration and broadcasting in the MTT manager.
- Expose small data-oriented functions rather than an object with methods.

Required tests:

- Existing single and simultaneous bust ordering remains unchanged.
- Eliminated seats, entrant state, and finish positions are identical.
- Sitting-out players with chips remain active.
- Existing collapse and winner behavior remains unchanged.

Suggested commit:

```text
refactor(mtt): extract player lifecycle transitions
```

## Phase 2: build dormant rebuy support

During this phase the production default remains:

```text
maxRebuys = 0
```

This is an intentional branch-by-configuration integration strategy. It keeps
all existing user-visible behavior unchanged while each rebuy subsystem is
wired and tested. Tests may create an MTT internally with `maxRebuys: 1` or
`maxRebuys: 2`; the HTTP and creation UI do not expose configuration.

### Stage 8 — Add rebuy policy and usage data

Purpose: model future configurability without activating rebuys.

Changes:

- Add validated `maxRebuys` to `ManagedTournament`.
- Add `rebuysUsed` to every entrant, initialized to zero.
- Allow the internal MTT creation API to accept a non-negative integer limit,
  defaulting to the temporarily disabled production value.
- Do not add the option to the HTTP request or creation UI.
- Add pure helpers for:
  - remaining rebuys;
  - total accepted rebuys;
  - rebuy eligibility by count;
  - whether the current rebuy period is open;
  - the derived prize pool.
- Keep the cutoff predicate centralized and fixed to the first break.

Required tests:

- Limits `0`, `1`, and `2` behave through the same count comparison.
- Invalid negative, fractional, or non-numeric limits are rejected at the
  internal boundary.
- Entrant registration and table movement preserve `rebuysUsed`.
- The derived pool equals the current pool when nobody has rebought.

Suggested commit:

```text
feat(mtt): model rebuy limits and usage
```

### Stage 9 — Add dormant rebuy accounting and recovery

Purpose: make every accounting consumer understand rebuy data before players
can actually rebuy.

Changes:

- Calculate live and finished MTT payouts from the derived prize pool.
- Calculate each entrant's net winnings from the initial buy-in, fee, and their
  accepted rebuy count.
- Extend OTS types and generation with conditional support for:
  - `"Re-Entry"`;
  - `rebuy_cost`;
  - `tournament_rebuys`;
  - the enlarged `prize_pool`;
  - enlarged awards.
- Preserve existing OTS output when `maxRebuys === 0`.
- Recover per-player usage from `tournament_rebuys`.
- Recover the winner's chip stack from the unique entrant count plus total
  accepted rebuys.
- Extend player-profile net-result calculations.
- Continue accepting older summaries without rebuy fields.

Required tests:

- Zero-rebuy tournaments produce baseline summaries and profile results.
- One and multiple accepted rebuys produce correct OTS objects and payouts.
- Only rebuyers have `tournament_rebuys` entries.
- A summary with no accepted rebuys uses an empty array when rebuys are enabled.
- Finished lobby recovery and player profiles use correct totals.
- Legacy OTS fixtures still load.

Suggested commit:

```text
feat(mtt): account for rebuys in payouts and summaries
```

### Stage 10 — Implement the pure rebuy decision state machine

Purpose: model concurrent post-hand decisions and their resolutions without
wiring them into live MTT flow yet.

Changes:

- Add `mtt-rebuys.js` with pure/data-oriented functions for:
  - collecting a deterministic busted-player batch;
  - identifying eligible players;
  - pre-resolving ineligible busts as `leave`;
  - opening concurrent pending decisions;
  - accepting `rebuy` or `leave` exactly once;
  - restoring the initial stack and incrementing `rebuysUsed`;
  - resolving unanswered entries as `leave` on expiry;
  - finalizing finishing positions only after a batch resolves;
  - excluding rebuyers from that batch's elimination positions;
  - removing only eliminated seats.
- Keep decisions indexed by authenticated player identity and stable seat index.
- Do not mutate through frontend-provided seat identity alone.

Required tests:

- No decision is created with limit zero, after the limit, or after cutoff.
- Limits one and two use the same state transitions.
- Multiple eligible players decide concurrently.
- Mixed eligible/ineligible busts retain deterministic finish ordering.
- One rebuyer and one leaver produce contiguous, unique positions.
- Duplicate, stale, and racing resolutions are rejected or ignored exactly
  once.
- Pool and usage increase exactly once per accepted rebuy.

Suggested commit:

```text
feat(mtt): add rebuy decision state machine
```

### Stage 11 — Integrate decisions, actions, and views

Purpose: connect the tested state machine to live MTT tables while production
rebuys remain disabled.

Changes:

- Replace immediate MTT elimination with decision-batch creation when the
  configured limit permits it.
- Route pending `rebuy` and `leave` actions through the managed action seam.
- Keep the table's next-hand readiness false while its batch is unresolved.
- Keep tournament completion blocked while any decision is unresolved.
- Keep rebalancing blocked until all outstanding decisions are resolved.
- Let unrelated tables continue at their own pace.
- Reconcile after the final decision resolves.
- Extend player views with:
  - `rebuy` and `leave` only for unresolved players;
  - `isActing` for every unresolved player;
  - call-clock eligibility for seated non-pending players once clock support is
    connected in the next stage.
- Add a dedicated action-panel rendering branch with exact labels **Rebuy** and
  **Leave**; do not reuse **Leave Table**.
- Bind seat highlighting and clock display to `seat.isActing`, allowing more
  than one highlighted seat.
- Preserve pending decisions across disconnect/reconnect because the state is
  server-owned on the table.

Required tests:

- Tests with explicit `maxRebuys: 1` exercise accept and leave through the MTT
  manager and WebSocket dispatcher.
- The same tests with production default zero retain immediate elimination.
- Multiple pending seats are highlighted concurrently.
- Only pending players receive decision actions.
- Reconnecting restores the current decision view.
- Rebalancing, winner detection, and next-hand countdown remain blocked at the
  correct boundaries.
- A rebuyer remains in the same seat unless normal rebalancing moves them.
- The next hand advances its button from the final post-decision/post-rebalance
  seat layout.

Suggested commit:

```text
feat(mtt): integrate rebuy decisions with table actions
```

### Stage 12 — Integrate rebuy clocks and cutoff transitions

Purpose: complete manual and automatic decision timing using the shared action
clock.

Changes:

- Give each table decision batch its own shared action-clock state.
- Increment wait time from the existing MTT tick.
- Let any seated player who is not awaiting a decision call the clock after the
  normal wait.
- Start one countdown for every unresolved decision at that table.
- Resolve all unanswered entries as `leave` on expiry.
- Never pause the countdown for disconnected players.
- Detect the rebuy-period open-to-closed transition centrally.
- At cutoff, start the clock automatically when it is not already running.
- Never restart or extend an active countdown.
- Grandfather pre-cutoff decisions during the forced countdown.
- Allow the tournament break and its timer to run concurrently.
- Ensure the hand whose completion starts the first break cannot create new
  decisions, while decisions created by earlier completed hands remain valid.

Required tests:

- Manual clock wait and duration match betting decisions.
- One call targets all unresolved players at the table.
- Resolved players are unaffected when the clock expires.
- Disconnect/reconnect never resets or pauses time.
- Cutoff automatically starts an inactive clock and leaves an active clock
  untouched.
- The break advances while the decision clock runs.
- No post-cutoff bust creates a decision.
- The final pre-break hand obeys the strict cutoff ordering.
- A future level-based cutoff can be expressed by changing the centralized
  predicate rather than the decision flow.

Suggested commit:

```text
feat(mtt): apply clocks and cutoff rules to rebuys
```

## Phase 3: activate and prove the feature

### Stage 13 — Activate one rebuy for every MTT

Purpose: make the completed dormant feature user-visible with the agreed fixed
rule.

Changes:

- Change the production default from `maxRebuys: 0` to `maxRebuys: 1`.
- Keep the HTTP creation request and creation UI non-configurable.
- Add `maxRebuys` to the MTT lobby view.
- Render the static rule as **Rebuys: 1**, driven by view data rather than a
  frontend literal.
- Emit the OTS `"Re-Entry"` fields for every newly completed MTT.
- Update release notes if required by the project's release workflow.
- Update existing MTT tests that are specifically about legacy immediate
  elimination/rebalancing to create `maxRebuys: 0` explicitly.
- Keep production-path tests on the default of one.
- Add full backend, frontend, E2E, and UI-catalog acceptance coverage.
- Regenerate only the intentional UI-catalog snapshots.

Required acceptance scenarios:

- A first eligible bust offers **Rebuy / Leave**.
- Accepting restores the starting stack, keeps the player active, includes them
  in the next button calculation, and enlarges payouts.
- A second bust eliminates immediately.
- Leaving and timeout are equivalent.
- Multiple decisions are concurrent and one clock targets all.
- A disconnected player can reconnect and decide before expiry.
- A disconnected player is eliminated when the server-owned clock expires.
- Other tables continue independently.
- Rebalancing waits for hands and decisions, then uses final player counts.
- Tournament completion waits for decisions.
- The first break cutoff and grandfathered countdown behave as specified.
- Live and recovered lobby payouts, OTS, and player profiles agree.
- The lobby shows **Rebuys: 1**, not the number of accepted rebuys.

Suggested commit:

```text
feat(mtt): enable one rebuy per tournament
```

## Future configurable limits

The current implementation stops before exposing configuration. A later change
should need only to:

1. Add a validated non-negative integer `maxRebuys` to `POST /mtt`.
2. Add the corresponding creation control.
3. Pass it to the already-general managed tournament model.
4. Persist the configured maximum in tournament metadata.

The last item is important: OTS rebuy usage records how many rebuys players
accepted, but the current recovered-tournament model cannot infer whether the
configured maximum was one, two, or more merely from usage. Fixed-one recovery
can use the current default, but configurable limits require explicit persisted
configuration before that option is exposed.

No rebuy lifecycle, clock, payout, action, or UI-view redesign should be needed
for that later change.

## Definition of done

- Every stage is committed separately after the full verification gate passes.
- All foundational refactor commits preserve their declared behavior.
- No duplicated betting/rebuy clock implementation exists.
- No MTT action mutates canonical tournament state through generic poker
  actions.
- Rebuy limits and usage are integer data, not booleans.
- Prize pool and net winnings have one consistent derivation across live views,
  summaries, recovery, and profiles.
- Rebuy decisions are backend-authoritative, concurrent, idempotent, and safe
  across disconnects.
- Button advancement happens at hand start for every game type.
- The complete `npm run validate` and `npm run test:e2e` gates pass on the final
  implementation.
- Only intentional UI-catalog snapshots change.
