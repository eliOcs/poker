# First-in preflop lessons

`/learn` presents a six-seat cash table and a single strategy panel. Three linked sliders show Fold, Call and Raise with colored, labeled handles. There is no numeric entry in this mode; the betting slider retains its precise controls. Students use five-percentage-point increments from 0 to 100, covering both pure and mixed strategies. The remaining two actions rebalance proportionally, splitting evenly when both were zero. The starting mix is 35/35/30, independent of the answer.

When raising is included, Continue opens a sizing question using the regular betting presets (Min, 2.5 BB, 3 BB, Max) and dollar amount slider with numeric entry and −/+ controls. Presets set the amount without submitting. “Check strategy” submits the mix and size, converting cents to big blinds for grading. There is no timer or account requirement. Feedback includes a modal with the position range and lesson details.

The server deals the exercise (`GET /api/learn/scenario`) and grades the submitted distribution (`POST /api/learn/evaluate`). Scenarios are stateless position/hand identifiers; no game, wallet or multiplayer connection is created. Positions and the 169 hand classes are sampled uniformly for practice, rather than weighted as a random physical deal. Suits are randomized consistently with the hand class. Answers and the position range are returned after submission. Progress is not persisted.

## Source and limits

Modern Poker Theory by Michael Acevedo, chapter 5, 100 BB, six-handed cash. Reference assumptions: 5% rake capped at $3, with a $5 big blind. Opening raise totals are 2.5 BB for LJ (displayed as UTG), HJ (displayed as UTG+1), CO and BTN; 3 BB for SB. The UI calls completing the SB “Call.” Call is selectable from every position, both alone and in mixes; non-SB calls are graded against the reference’s 0% calling frequency and receive an explanation instead of a validation error. There is no first-in BB exercise.

| Position | Hand Range | PDF page | Published raise frequency | Extracted |
| -------- | ---------- | -------- | ------------------------- | --------- |
| LJ       | 47         | 200      | 17.1%                     | 17.07%    |
| HJ       | 42         | 194      | 21.4%                     | 21.52%    |
| CO       | 38         | 189      | 27.8%                     | 27.87%    |
| BTN      | 35         | 185      | 43.4%                     | 43.46%    |
| SB       | 32         | 182      | 24.4%                     | 24.63%    |

The data in `src/backend/learn-ranges.json` contains approximate `[fold, call, raise]` percentages. They are measured from chart image colors and rounded to five percentage points. The LJ chart uses black for raises; the SB chart uses black for calls. Overall frequencies are checked using six combinations per pair, four per suited hand and twelve per offsuit hand. Aggregate agreement is a sanity check, not proof of exact per-hand solver frequencies.

Regeneration requires a local PDF and Python with `pymupdf` and `Pillow` installed:

```sh
python scripts/learn/extract-ranges.py /path/to/modern-poker-theory.pdf
npx prettier --write src/backend/learn-ranges.json
node --test test/backend/learn.test.js
```

No source PDF or chart bitmap is included in the application. The displayed grid is rendered from the derived numbers. Explanations are original paraphrases of the position guidance and general heuristics (PDF pages 177–179); sizing is on PDF pages 180–181.

Action feedback requires inclusion of reference actions used at least 10% of the time and excludes actions absent from the reference. Frequency feedback allows a 15-percentage-point difference per action. Tiny chart actions can therefore be omitted without failing action selection. Exact mixes with the recommended sizing are graded correct. Mixes within tolerance and raise sizes within 1 BB of the recommendation are graded close; other strategies are graded incorrect. The sizing allowance is a teaching tolerance, not an EV estimate. Card feedback computes high-card count (ten or higher), pocket pairs, suitedness, and the number of five-rank straight patterns containing both hole-card ranks. Aces count high or low, never wrapping. These are descriptive features, not equity estimates or solver rationales, and do not affect grading. The range modal explains players left to act, pot size, opening size and rake. Source: “Main Variables that Affect Pre-flop Hand Ranges,” PDF pages 163–167.

## Validation

Backend tests cover range totals, dealing, boundary validation and grading thresholds. Component tests cover mixed and pure strategies, dollar-to-BB sizing, and retrying failed evaluations. A real-server smoke test exercises /learn, submission, Details, the next hand and invalid requests. The Docker UI catalog covers each step and verdict on desktop and mobile, including stable table geometry through loading and step changes.
