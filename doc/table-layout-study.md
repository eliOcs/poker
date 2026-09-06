# Poker table layout study

Studied on 2026-09-05. Recommendation: give the table a shared coordinate system,
explicit portrait and landscape arrangements, and a reserved board region. Use
CSS Grid to describe seat placement and fit the composition to the actual space
remaining after navigation and controls.

This records the initial study and implementation proposal. The resulting shared
layout is documented in [frontend.md](frontend.md).

The evidence comes from the public PokerStars Replayer browser bundles, browser
inspection of the supplied hand, and measurements of our UI catalog in Chromium.
The supplied reference hand has eight seat slots, seven occupied; it is not a
demonstration of nine occupied seats. Their stylesheet also defines nine-seat
layouts. Our measurements use the nine-seat `table-full-ring` fixture, with its
board changed in browser memory to five cards to exercise the full board width.

## How the reference works

The seat layer is a grid inside a fixed logical table, with distinct dimensions:

| Mode             | Logical table | Seat grid              |
| ---------------- | ------------- | ---------------------- |
| Desktop          | 1125 × 678    | Varies with seat count |
| Mobile portrait  | 625 × 997     | 4 columns × 30 rows    |
| Mobile landscape | 1180 × 500    | 8 columns × 16 rows    |

Seats receive explicit rows, columns, and spans. Board and pot elements are
separately positioned. Portrait puts the board below the side-seat groups.
Opponent seats have a local scale of 0.58; the bottom hero seat uses 0.85.
Board cards use 0.7 in portrait and 0.85 in landscape. Bets and dealer buttons
have seat-specific offsets. The hero's seat is rotated into a designated slot.
These rules are visible in the [published CSS](https://www.pokerstarsreplayer.com/packs/css/replayer-e2963b8b.css).

A `ResizeObserver` reads the mode and logical dimensions from CSS, then computes
the minimum width/height fit. Mobile height is capped at `window.innerHeight -
100`. A transform scales the entire table. Portrait activates at widths up to
896px; landscape additionally checks orientation and device width. Replay
controls sit outside the transformed table. See the
[published JavaScript](https://www.pokerstarsreplayer.com/packs/js/replayer-9356c2b72749b56ca5dc.js).

The useful inference is that grid placement, deliberate clearance, and scaling
work together. Grid alone does not prevent oversized contents or overflowing
children from colliding.

## What fails in our current layout

Our seat coordinates use viewport media queries and percentages, while component
sizes use fixed pixels and `ch`. The table can shrink independently of its
contents. See [table-layout.css](../src/frontend/styles/table-layout.css),
[seat.css](../src/frontend/styles/seat.css), and
[card.css](../src/frontend/styles/card.css).

At 390 × 844, the table container is 384px wide. Each middle side seat is 140px
wide, leaving a 104px horizontal corridor. Five board cards plus their gaps need
234px. Whenever those seats and cards share a vertical band, they cannot fit:

```text
384 - 140 - 140 = 104px available
5 × 42 + 4 × 6 = 234px required
```

The sampled seats overlap the top of the board by about 7px, and their bets also
overlap it. Raising the board's stacking order would obscure seat information;
reducing the felt's size would leave the underlying geometry unchanged.

At 800px viewport width, several independent rules change simultaneously:
the persistent navigation appears, seats widen, and board cards grow. Layout
selection does not account for the width consumed by navigation. Short landscape
phones consequently receive the larger desktop components.

The game also reserves a constant 160px below its table, regardless of the actual
action panel. At 844 × 390, navigation takes 180px and the action allowance takes
160px, leaving a 664 × 230 table container. See
[game.css](../src/frontend/styles/game.css) and
[shell.css](../src/frontend/styles/shell.css).

| Viewport   | Table container | Observed intersections with the five-card board |
| ---------- | --------------- | ----------------------------------------------- |
| 320 × 568  | 314 × 408       | Four seat panels; additional cards and bets     |
| 390 × 844  | 384 × 684       | Both middle side panels and their bets          |
| 393 × 727  | 387 × 567       | Both middle side panels; cards and bets         |
| 768 × 1024 | 762 × 864       | None in this fixture                            |
| 799 × 600  | 793 × 440       | None, but two seat pairs intersect              |
| 800 × 600  | 620 × 440       | Middle side panels; multiple cards and bets     |
| 844 × 390  | 664 × 230       | All nine seat-panel rectangles                  |
| 896 × 414  | 716 × 254       | All nine seat-panel rectangles                  |
| 1024 × 768 | 844 × 608       | Middle side bets                                |
| 1280 × 720 | 1075 × 560      | None in this fixture                            |

These are bounding-rectangle intersections, supported by screenshot inspection
at 390 × 844 and 844 × 390. They are not exhaustive visibility tests. The fixture
includes folded players; populated showdown cards, extra labels, and different
actions can require more space.

## Proposed implementation

1. **Allocate the available table area first.** Put game information, table,
   and action controls in normal layout, with the table taking the remaining
   space. Replace the fixed 160px allowance with the actual controls region.
   Give short landscape screens compact controls and an overlay navigation
   drawer. Keep touch targets at usable sizes outside the table scaling.

2. **Choose layouts from the table container.** Use its width and height to
   select portrait, compact landscape, or roomy landscape. This also handles
   history sidebars and split windows. Each mode should define logical
   dimensions and placements for 2, 6, and 9 seats. Establish the dimensions
   around our own typography, avatars, and seat information.

3. **Use a shared grid and explicit board space.** In nine-seat portrait, a
   promising starting point is two opponents across the top, three down each
   side, a full-width board band below those groups, and the local player at
   the bottom. Keep bets and dealer markers in assigned nearby regions.
   Landscape can distribute seats around a central board using shorter,
   horizontally arranged seat panels. The precise placements need a prototype
   with every seat occupied and every hole-card pair revealed.

4. **Fit the composition together.** Once each arrangement has adequate
   clearance, compute `scale = min(availableWidth / logicalWidth,
availableHeight / logicalHeight)`. A small `ResizeObserver` can maintain a
   CSS custom property. Include visible card overhangs, bets, and the hero in
   the logical bounds. Make the outer wrapper occupy the scaled dimensions,
   since a CSS transform alone does not resize its layout box.

5. **Give seats predictable bounds.** Reserve space for names, stacks, action
   or result text, and hole cards. Keep supplementary labels from unexpectedly
   growing a seat into the next row. Use compact component arrangements before
   scaling down further: our pixel font is already small, and uniform shrinking
   alone would compromise readability. Keep essential information visible.

6. **Share the layout between live games and history.** Currently
   [history.css](../src/frontend/styles/history.css) gives its table different
   dimensions, including an `85vh` mobile minimum, while sharing seat rules.
   A common table renderer/layout should receive the available area from each
   parent. Separate felt decoration from the board-content region so moving
   the cards does not also move or resize the felt.

Seat rotation, if adopted, must be a view mapping: preserve the original seat
index for actions and dealer state and assign a separate visual slot. Backend
seat identity must remain unchanged.

Scaling also needs a small audit of
[bet-collection.js](../src/frontend/bet-collection.js): it measures screen-space
rectangles and currently applies their differences as local pixel coordinates.
An animation layer outside the transform, or conversion back to logical
coordinates, is necessary to avoid applying the scale twice.

## Validation for the eventual change

Use browser assertions for board/seat/bet separation, table-bound containment,
and reachable controls, alongside visual snapshots. Measure visible descendants
as well as seat wrappers because cards and markers can extend outside them.
Exclude intended within-seat layering and chip movement during collection.

Cover 2, 6, and 9 occupied seats; five board cards; all cards revealed; long names;
large stacks and bets; winner messages; countdowns; and betting controls. Exercise
both orientations, resize across each mode boundary, and include history with
its sidebar/timeline. The current UI catalog configuration covers desktop and
Pixel 5 portrait, so landscape and smaller portrait sizes need explicit coverage.

The reference is useful for composition, but its supplied page also scrolls and
contains very small opponent labels. Our acceptance criteria should explicitly
include readable text, usable controls, and keeping the playable table in view.
