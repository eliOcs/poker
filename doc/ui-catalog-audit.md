# UI catalog overlap audit

Audited September 10, 2026, against commit `c92d42f` and its committed PNG baselines. The findings below describe that original catalog; the implementation status here supersedes the proposed actions and estimated counts.

## Applied changes

- Removed all six recommended duplicate/overlapping cases: `action-bet`, `action-raise`, `action-sit-in`, `action-pre-check-fold`, `game-player-folded`, and `mtt-lobby-running`. Removed their fixtures, runner entries, obsolete links, and baselines. Canonical game cases also appear in the Action Panel catalog category without extra executions.
- Preserved the merged inactive Check/Fold and active clock coverage with explicit assertions. The retained show-cards case now includes the checked opponent and asserts folded hero opacity, cards, and show/muck controls. The richer MTT case retains the internal-scroll assertion, current/open/closed table actions, and eliminated standings.
- Renamed `game-river-all-in-decision` to `game-river-facing-bet` to describe its actual actions.
- Made the pending fixture genuinely pending, with editable owner title and disabled Unregister/Start controls. Added assertions for those controls.
- Scrolled MTT captures to the distinguishing actions, clock, queue, tables, or standings. Kept one extra mobile header capture, two extra multi-table standings captures (one per device), and one mobile results capture for the overflowed positive/negative Net column. The MTT tooltip and its trigger must both be completely inside the viewport. Its mobile positioning now anchors to the button group, and the capture asserts that the main content has not scrolled horizontally.
- Retained all distinct states listed in the inventory and all 36 geometry/behavior executions. Moved landscape snapshots to a mobile-only test file, removing the six duplicate desktop landscape captures.
- Removed both diff-ratio allowances. Added a Linux/amd64 Docker workflow using the matching Playwright image and Node 24, with fixed locale/timezone, host-owned output, documented npm commands, and a CI job. Validation and the pre-commit hook use Docker for the catalog step. Snapshot updates preserve unrelated baselines.

The resulting catalog has **198 test executions and 166 baselines**, down from 216 and 180. The four deliberate extra captures repair coverage gaps, so the final baseline count is higher than the audit's 162-baseline estimate without those repairs. There are 76 fixture IDs plus two static articles.

The canonical commands are `npm run test:ui-catalog:update:docker` and `npm run test:ui-catalog:docker`; see [AGENTS.md](../AGENTS.md) and [Dockerfile.ui-catalog](../Dockerfile.ui-catalog).

## Scope and method

| Suite                                                  | Executions across both projects | Screenshot baselines |
| ------------------------------------------------------ | ------------------------------: | -------------------: |
| Catalog: 82 fixture cases plus About and Release Notes |                             168 |                  168 |
| Six table sizes/states in landscape                    |                              12 |                   12 |
| Table geometry and action transitions                  |                              36 |                    0 |
| Total                                                  |                             216 |                  180 |

All 180 PNGs were decoded successfully. Compared all 6,872 pairs with equal dimensions, including across the two snapshot directories. Ranked pairs by mean absolute RGB difference after resizing to 160 × 100; verified exact matches by hashes of decoded RGB pixels. For pairs with thumbnail MAE at most 2%, also measured full-resolution changed-pixel percentages. Different-sized screenshots were not assigned similarity scores.

Reviewed scenario definitions, setup mutations, screenshot preparation, renderer branches, desktop contact sheets, and selected full-size screenshots. Browser probes checked mobile MTT scroll positions and pending state. This is an audit of fixture and visible-state overlap, not a measurement of all possible UI coverage.

Small differences must be interpreted semantically: a missing button or clock may occupy much less than 1% of a page. Resized-image similarity and raw changed-pixel percentages are not Playwright comparator results.

## Safe consolidation

Keep the game-named case as the canonical full-table screenshot, and list it under the action-panel category if useful. Multiple catalog categories do not need multiple executions.

| Remove duplicate | Retain                   | Evidence                                                                                                                                                              |
| ---------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `action-bet`     | `game-flop-check-or-bet` | Identical fixture data and decoded pixels on desktop and mobile. Both cover Check/Bet, the slider, and pot-based presets.                                             |
| `action-raise`   | `game-flop-facing-bet`   | Identical fixture data and decoded pixels on both devices. Both cover Fold/Call/Raise with postflop presets.                                                          |
| `action-sit-in`  | `game-sitting-out`       | Identical pixels on both devices. The retained fixture additionally declares `emote`, but the renderer's sit-in/leave branch takes precedence and does not render it. |

Remove the corresponding duplicate definitions, runner IDs, catalog links/categories, and two baselines per removed ID together. Check references before removal. Retain the separate action-layout transition assertions.

This changes **216 → 210 executions** and **180 → 174 baselines**, without changing the retained visual states.

## Conditional semantic merges

These are coverage combinations, not claims of pixel identity. Apply individually and review both device outputs.

| Merge                                                        | Retain and preserve                                                                                                                                                                                                 | Why it is plausible                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `action-pre-check-fold` into `game-clock-called`             | Inactive Check/Fold, Emote, and the opponent's active countdown; assert that the intended controls and clock are rendered.                                                                                          | Both already display the inactive Check/Fold row. Full-resolution differences affect only 0.214% of desktop pixels and 0.330% of mobile pixels, including bets, pot, and countdown. Retain `action-emote-and-clock` separately for the available Call Clock action. |
| `game-player-folded` into `action-show-cards`                | Current player's folded cards at reduced opacity, plus the existing show/muck/social controls. Carry over Bob's checked-opponent seat if that arrangement is worth retaining.                                       | Both have the same folded hero cards, rank, board, and river state. Show-cards adds distinct controls, so it is the stronger retained case. This pair is a semantic match despite substantially different screenshots.                                              |
| `mtt-lobby-running` into `mtt-lobby-running-multiple-tables` | Current-table highlighting, Open My Table/Open Table, active and closed tables, eliminated standings, and the current `mtt-lobby-running` internal-scroll assertion. Reframe that assertion around the retained ID. | Both already contain multiple active tables; the richer fixture adds a closed table and eliminated entrants. First capture the relevant mobile content and check that the richer case satisfies the transferred geometry assertion.                                 |

Together these remove **three more scenarios / six baselines / six executions**, reaching **204 executions and 168 baselines** after safe consolidation. These counts assume replacement screenshots rather than adding extra captures to repair missing coverage.

Avoid combining every game state into one large fixture. Acting versus waiting, current player versus opponent, and available versus already-called clock states are mutually meaningful distinctions.

## Repair misleading coverage before pruning

**The pending registration case is not pending.** `mttLobbyView()` hardcodes `_mttActionPending: false`; the runner never changes it. A browser probe of `mtt-lobby-registration-action-pending` confirmed `actionPending === false` and enabled Unregister/Start Tournament buttons. Compared with the owner-start fixture, its setup also omits `canRename`, so its visible difference is not the claimed pending state. Allow the helper to receive pending state, set it explicitly, and assert disabled controls before capture. This is a case to repair, not count as a safe deletion.

**Mobile MTT screenshots miss the differentiating content.** These groups each have three pixel-identical baselines:

- `mtt-lobby-registration-can-register`, `mtt-lobby-registration-registered`, `mtt-lobby-registration-action-pending`.
- `mtt-lobby-running-can-late-register`, `mtt-lobby-running-late-register-tooltip`, `mtt-lobby-running-waiting-for-table`.

At the Pixel 5 viewport of 393 × 727, the probed action controls start around y=922; tables start around y=1000. The lobby's `.main` scrolls internally. `fullPage: true` captures the document, not all content within this scrolling element. The tooltip preparation explicitly uses `focus({ preventScroll: true })`, leaving its trigger outside the capture.

Keep the distinct registration, pending, tooltip, and queue scenarios. Scroll their target controls into view before capture and verify their viewport intersection. For table/standings cases, capture the relevant scrolled region. Retain a representative initial-position mobile screenshot for header/layout coverage. Do not disable the production scroll containment merely to fit everything into one screenshot.

There are **12 exact matching pairs** overall: six device-specific game/action pairs, plus six pair combinations within these two mobile MTT groups. This does not mean 12 scenarios can be removed.

## Screenshot tolerance change

The previous catalog comparison allowed `maxDiffPixelRatio: 0.01`, with a shared `0.03` fallback for landscape and article captures. Both overrides have been removed at the user's request. Comparisons now use Playwright's default zero allowance for pixels classified as different.

Playwright's default per-pixel perceptual threshold and antialias handling remain unchanged; this is not a requirement for byte-identical PNG files.

As evidence of why the ratio mattered, the installed Playwright comparator accepted these distinct baseline pairs under the old 1% setting on both devices:

- `action-raise-preflop` versus `game-preflop-your-turn`.
- `action-pre-check-fold` versus `game-clock-called`.
- `mtt-lobby-running-on-break` versus `mtt-lobby-running-pending-break`.
- `mtt-lobby-finished` versus `mtt-lobby-finished-as-winner`.
- `game-rankings-modal` versus `game-rankings-modal-tooltip`.

That historical finding is not a reason to merge those states. Removing the ratio improves sensitivity, but cannot fix controls outside the screenshot or a fixture that never enters its named state.

At audit time there was no dedicated screenshot Docker workflow. This has now been resolved by adding `Dockerfile.ui-catalog` and the documented Docker commands, following the approach used in the reference website repository. Shared baselines are generated and checked in this canonical container.

## Landscape and geometry overlap

The six landscape fixtures each run twice at an explicitly assigned 844 × 390 viewport, once under each project. Their paired desktop/mobile baseline differences range from **0.197% to 1.064% raw changed pixels**. They are close but not exact: the projects retain different device scale, mobile, touch, and user-agent settings after `setViewportSize()`.

An optional later reduction is to retain one landscape screenshot per fixture under the mobile project, while keeping desktop default-viewport snapshots and relevant geometry checks. That removes another six baselines/executions, reaching **198 executions / 162 baselines** after the proposed semantic merges. It deliberately gives up separate desktop-emulation landscape raster coverage and should not be classified as a free deduplication.

Keep the geometry tests. They check collisions, felt containment, resizing, dealer placement, rotation identity, chip animation coordinates, and fixed action-panel dimensions that static images do not prove. The action-transition matrix also exercises narrow 320px and wide 2048px widths plus states absent from dedicated screenshots. Reducing their cross-project repetition would be a separate decision about device behavior coverage.

## Scenario inventory and disposition

The following accounts for all 82 fixture IDs and both article cases. Grouped rows share a recommendation, not necessarily an image.

| Cases                                                                                                                   | Disposition and distinct coverage                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `avatar-maker`                                                                                                          | Keep default editor and its existing contained-scroll assertions.                                                                                                                                  |
| `avatar-maker-sparkle-eyes`                                                                                             | Keep selected Sparkle asset and eyes controls.                                                                                                                                                     |
| `avatar-maker-eyebrows`, `avatar-maker-nose`, `avatar-maker-mouth`, `avatar-maker-ears`, `avatar-maker-hair`            | Keep distinct asset grids and fine-tuning controls. Shared page chrome does not make different sprites redundant.                                                                                  |
| `avatar-maker-facial-hair`, `avatar-maker-clothes`                                                                      | Keep selected Beard and clothing/color controls respectively.                                                                                                                                      |
| `landing-page`, `tournaments-page`                                                                                      | Keep distinct creation forms.                                                                                                                                                                      |
| `sitngo-creation-speed-tooltip`, `tournaments-speed-tooltip`                                                            | Keep different form contexts, tooltip positioning, and responsive layouts. Share tooltip behavior assertions where appropriate.                                                                    |
| `player-profile-summary`                                                                                                | Keep profile, aggregate stats, avatar, and recent-game results.                                                                                                                                    |
| `game-empty-table`, `game-waiting-for-players`, `game-ready-to-start`, `game-countdown`, `game-buy-in`                  | Keep empty sit actions, one-player waiting, Start action, countdown, and buy-in form as separate states.                                                                                           |
| `game-preflop-your-turn`, `action-raise-preflop`                                                                        | Keep both: `pot` is 75 versus 0; the renderer selects pot-based versus BB-based presets from `pot === 0`, not the phase name.                                                                      |
| `game-preflop-waiting`                                                                                                  | Keep undealt-board waiting and opponent action context.                                                                                                                                            |
| `game-flop-check-or-bet`, `action-bet`                                                                                  | Safe duplicate pair; retain the game case.                                                                                                                                                         |
| `game-flop-facing-bet`, `action-raise`                                                                                  | Safe duplicate pair; retain the game case.                                                                                                                                                         |
| `game-turn`                                                                                                             | Keep four-card board and waiting controls.                                                                                                                                                         |
| `game-river-all-in-decision`                                                                                            | Keep five-card board and normal Fold/Call/Raise. Its name is misleading: hero has 3600, call is 1200, and raise has a range. Rename to a facing-bet case; it is not equivalent to a forced all-in. |
| `game-showdown-you-win`, `game-showdown-you-lose`                                                                       | Keep hero/opponent winner placement, positive/negative results, and winning-card highlighting.                                                                                                     |
| `game-all-in-situation`                                                                                                 | Keep zero stacks and all-in seats while awaiting resolution.                                                                                                                                       |
| `game-with-folded-players`                                                                                              | Keep folded opponents, remaining bets, and an acting hero; different from hero folded.                                                                                                             |
| `game-player-folded`, `action-show-cards`                                                                               | Conditional merge into show-cards; preserve folded hero rendering.                                                                                                                                 |
| `game-clock-called`, `action-pre-check-fold`                                                                            | Conditional merge retaining both countdown and inactive pre-action row.                                                                                                                            |
| `game-sitting-out`, `action-sit-in`                                                                                     | Safe duplicate pair; retain game case.                                                                                                                                                             |
| `game-disconnected-player`                                                                                              | Keep disconnected opponent styling. Different from action panel connection/reconnection messages.                                                                                                  |
| `game-full-table`                                                                                                       | Keep mixed occupied-seat statuses, including sitting-out and folded players. The crowded table fixtures instead emphasize maximum amounts and seat geometry.                                       |
| `action-all-in`, `action-fold-or-all-in`                                                                                | Keep slider with min=max versus simple Fold/All-In with no raise slider.                                                                                                                           |
| `action-emote-and-clock`                                                                                                | Keep available Call Clock plus social controls; different from countdown already running.                                                                                                          |
| `action-pre-fold-and-call`                                                                                              | Keep active Fold pre-action with a bet outstanding.                                                                                                                                                |
| `action-tournament-winner`, `action-tournament-busted`                                                                  | Keep distinct result banners and placement text.                                                                                                                                                   |
| `table-heads-up`, `table-6max`, `table-full-ring`                                                                       | Keep all three seat geometries with large amounts, mixed cards/avatars, and acting hero.                                                                                                           |
| `table-heads-up-showdown`, `table-6max-showdown`, `table-full-ring-showdown`                                            | Keep all three showdown geometries and visible result/card rows.                                                                                                                                   |
| `game-error`                                                                                                            | Keep toast overlay placement.                                                                                                                                                                      |
| `game-rankings-modal`, `game-rankings-modal-tooltip`, `game-rankings-modal-tournament`                                  | Keep cash rankings, focused tooltip, and tournament-specific presentation.                                                                                                                         |
| `game-tournament-levels-modal`, `game-settings-modal`                                                                   | Keep distinct modal content and controls.                                                                                                                                                          |
| `email-sign-in`                                                                                                         | Keep email iframe rendering at both viewport widths.                                                                                                                                               |
| `mtt-lobby-loading`, `mtt-lobby-error`                                                                                  | Keep different messages and error styling.                                                                                                                                                         |
| `mtt-lobby-registration-can-register`, `mtt-lobby-registration-registered`                                              | Keep Register versus Unregister; repair mobile capture position.                                                                                                                                   |
| `mtt-lobby-registration-owner-can-start`                                                                                | Keep editable owner title, Start action, and existing width assertion.                                                                                                                             |
| `mtt-lobby-registration-action-pending`                                                                                 | Repair pending state and capture disabled controls.                                                                                                                                                |
| `mtt-lobby-running-can-late-register`, `mtt-lobby-running-late-register-tooltip`, `mtt-lobby-running-waiting-for-table` | Keep distinct late-register, tooltip, and queued states; repair mobile capture.                                                                                                                    |
| `mtt-lobby-running`, `mtt-lobby-running-multiple-tables`                                                                | Conditional merge into richer fixture, carrying scroll assertions.                                                                                                                                 |
| `mtt-lobby-running-on-break`, `mtt-lobby-running-pending-break`                                                         | Keep actual break versus waiting for hands to finish.                                                                                                                                              |
| `mtt-lobby-finished`, `mtt-lobby-finished-as-winner`                                                                    | Keep perspective-specific results; capture standings where they are visible.                                                                                                                       |
| `history-empty`, `history-preflop-fold`                                                                                 | Keep empty history versus a resolved hand with no community cards.                                                                                                                                 |
| `history-showdown-win`, `history-showdown-lose`                                                                         | Keep result polarity, winner position, and multi-player history rendering.                                                                                                                         |
| `history-multiple-hands`                                                                                                | Keep long list/scroll pressure: 15 hands versus three in replay fixtures.                                                                                                                          |
| `history-replay-start`, `history-replay-mid-action`, `history-replay-final`                                             | Keep distinct replay indices and timeline highlighting. Shared input fixtures are intentionally mutated by preparation.                                                                            |
| `about`, `release-notes`                                                                                                | Keep separate static article content and page lengths.                                                                                                                                             |

## Validation

The final strict `npm run test:ui-catalog:docker` comparison passed **all 198 tests** against the regenerated baselines (24.5 seconds). The targeted Docker update command was also exercised successfully with `--grep`, preserving the other snapshots. All 166 PNGs are owned by the host user.

The MTT component suite passed all 16 tests. Repository formatting, ESLint/Stylelint, type checking, dependency rules, and duplicate-code checks passed. The 76 runner fixture IDs are unique and have exactly matching catalog links; all requested obsolete IDs are absent from the runnable catalog. Reviewed the new mobile MTT and merged game screenshots, including the corrected tooltip, pending controls, queued registration, standings, and net results.

For historical context, removing tolerance before refreshing the baselines produced 140 passes and 76 screenshot failures in the native Linux environment. Those old failures are resolved by the Docker baseline migration. The earlier audit's 24 targeted checks and browser probes established the duplicate and missing-capture findings.
