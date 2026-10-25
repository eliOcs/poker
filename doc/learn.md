# Preflop lessons

`/learn` teaches six-handed, 100 BB cash-game preflop strategy. The learner
sees a hand play out to their decision at a normal table, chooses an action
mix (and a raise size if raising), and gets graded feedback with an
explanation and the reference ranges.

## Design

- **Server-authoritative and stateless.** `GET /api/learn/scenario` deals a
  scenario as an opaque situation/hand identifier, together with replay
  snapshots of the action leading up to the decision.
  `POST /api/learn/evaluate` grades a submission. The answer, the range and
  the explanation are returned only after the submission. No game, WebSocket
  or stored progress is involved, and no account is needed. Each decision
  stands alone; lessons are not linked hands.
- **Same table as live play.** Lessons reuse the seat, betting presets, slider
  and table layout from live games, so what learners practice looks like the
  real thing. The browser only plays back the server's snapshots. It never
  derives poker actions or answers.
- **Practice sampling, not realistic frequency.** First a situation is chosen
  uniformly, then a hand eligible for it. Rare spots therefore come up as
  often as common ones.
- **Big blinds by default.** Lessons show amounts in BB, while live tables
  default to currency. The _Table amounts_ setting overrides both. Internally,
  everything is still cents.
- **Teaching tolerances, not EV.** Grading requires every action the reference
  uses at least 10% of the time, allows 15 percentage points of difference per
  action, and treats a raise size within 1 BB as close. These limits reward
  understanding the strategy without demanding solver precision.
- **Opponent ranges are derived, never stored.** Feedback shows the
  opponent's range for the action they took. It is computed at evaluation time
  from the same chart catalog, conditioned on the earlier actions and on the
  learner's cards (card removal).

Code lives in `src/backend/learn*.js` and `src/frontend/learn*.js`, and the
types in `src/backend/learn-types.js`.

## Source data

The charts are the 100 BB six-handed cash-game preflop charts from _Modern
Poker Theory_ by Michael Acevedo. `src/backend/learn-ranges.json`
holds every chart, each with its book page and chart number.
`scripts/learn/extract-ranges.py` generates the file from a locally supplied
PDF. Neither the PDF nor any chart image is committed: the app renders its
grids from the derived numbers, and the explanations are original paraphrases.

How the numbers were produced, and the caveats that come with them:

- Each per-hand frequency is measured from a chart's cell colors and rounded to
  five percentage points, which is teaching precision.
- As a sanity check, combination-weighted totals (6 per pair, 4 per suited
  hand, 12 per offsuit hand) must match each chart's published caption within
  one point. Agreement in total does not prove that every per-hand frequency is
  exact.
- Known inconsistencies in the source are resolved in favor of the chart.
  Page 188's BTN chart barely differs from page 187, and its caption sums to
  100.4%, so that chart is allowed two points of difference. Page 186 quotes
  pots that contradict the bet sizes prescribed on page 181. The trainer uses
  those sizes and computes the pots from actual contributions.
- In follow-up charts, white cells mean the hand is absent from the range that
  reached this decision, not a fold. Such hands are never dealt.
- The book's solver assumed 5% rake capped at $3. This platform has no rake,
  so explanations leave rake out.
- The book's LJ and HJ are displayed as UTG and UTG+1.

To regenerate (needs Python with `pymupdf` and `Pillow`):

```sh
python scripts/learn/extract-ranges.py /path/to/modern-poker-theory.pdf
npx prettier --write src/backend/learn-ranges.json
node --test test/backend/learn*.test.js
```
