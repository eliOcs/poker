# Preflop lessons

`/learn` presents a six-seat cash table and a single strategy panel. Three linked sliders show Fold, Call and Raise with colored, labeled handles. There is no numeric entry in this mode; the betting slider retains its precise controls. Students use five-percentage-point increments from 0 to 100, covering both pure and mixed strategies. The remaining two actions rebalance proportionally, splitting evenly when both were zero. The starting mix is 35/35/30, independent of the answer.

When raising is included, Continue opens a sizing question using the shared live-game betting presets (Min, 2.5 BB, 3 BB, Max for unopened preflop pots; Min, ½ Pot, Pot, Max when facing a raise) and dollar amount slider with numeric entry and −/+ controls. Presets set the amount without submitting. “Check strategy” submits the mix and size, converting cents to big blinds for grading. There is no timer or account requirement. Feedback includes a modal with the position range and lesson details.

The local seat uses the current profile's name and saved avatar through the shared seat renderer. Guests without a name keep the lesson's position label, and the original position label remains available in the seat's title. Clicking or keyboard-activating your seat opens the same profile settings as live games. Saving profile changes updates the seat without resetting the current exercise or strategy; opponents remain anonymous position labels.

Lessons and live games share fixed panel sizing in `styles/action-panel.css` through `--action-panel-height`. Lessons reserve 240px below 800px viewport width and 256px on larger screens to fit all three sliders. Feedback compares compact action bars with percentages and raise sizes; each colored bar's length is proportional to its action frequency. The reserved height stays the same through choices, sizing, loading and feedback, keeping the table stationary. Lesson content starts at the top of the panel, with consistently aligned headings and the action buttons anchored at the bottom.

The server deals the exercise (`GET /api/learn/scenario`) and grades the submitted distribution (`POST /api/learn/evaluate`). Scenarios are stateless situation/hand identifiers; no game, wallet or multiplayer connection is created. The five first-in positions and two SB follow-ups are sampled uniformly, followed by a uniform choice among that situation's eligible hand classes. This is practice sampling, not a random physical deal or a simulation of how often these situations occur. Suits are randomized consistently with the hand class. Answers and the situation range are returned after submission. Progress is not persisted.

Players read the situation from the seats, action labels, bets and stacks, as in a live game. The top status bar shows “Preflop” and the scenario title; desktop also shows table size and blinds. Explanations appear in the feedback details, leaving the felt clear. In the SB limp follow-up, SB has contributed 1 BB and BB has raised to 3.5 BB: calling costs 2.5 BB, the pot is 4.5 BB, and the minimum raise total is 6 BB. In the SB open follow-up, SB has contributed 3 BB and BB has 3-bet to 9 BB: calling costs 6 BB, the pot is 12 BB, and the minimum raise total is 15 BB. Both players began with 100 BB. Bets and remaining stacks reflect these contributions. Sizing presets for follow-ups are Min, ½ Pot, Pot, and Max. Pot raises use the shared live-game calculation: add the outstanding call to the current pot, then add half or all of that pot to the opposing bet to obtain the raise total. For these heads-up scenarios, this gives 7/10.5 BB after the limp and 18/27 BB after the open. The server rejects raises below the situation's legal minimum. These are standalone decisions after the displayed action, not linked hands that continue from a learner's previous answer.

Follow-up feedback also shows pot odds under “This situation”: the additional call divided by the pot after calling, including chips already committed. SB limp versus BB raise is `2.5 / (4.5 + 2.5) ≈ 36%`; SB open versus BB 3-bet is `6 / (12 + 6) ≈ 33%`. Percentages are rounded to whole numbers for teaching. The explanation describes the break-even threshold before rake with no further betting, and explains why future bets and folds affect preflop calls. These metrics do not estimate the hand’s equity or change grading. Source: “Pot Odds and Outs,” PDF pages 37–38.

## Source and limits

Modern Poker Theory by Michael Acevedo, chapter 5, 100 BB, six-handed cash. Reference assumptions: 5% rake capped at $3, with a $5 big blind. Opening raise totals are 2.5 BB for LJ (displayed as UTG), HJ (displayed as UTG+1), CO and BTN; 3 BB for SB. The UI calls completing the SB “Call.” Call is selectable from every position, both alone and in mixes; non-SB calls are graded against the reference’s 0% calling frequency and receive an explanation instead of a validation error. There is no first-in BB exercise.

| Position | Hand Range | PDF page | Published raise frequency | Extracted |
| -------- | ---------- | -------- | ------------------------- | --------- |
| LJ       | 47         | 200      | 17.1%                     | 17.07%    |
| HJ       | 42         | 194      | 21.4%                     | 21.52%    |
| CO       | 38         | 189      | 27.8%                     | 27.87%    |
| BTN      | 35         | 185      | 43.4%                     | 43.46%    |
| SB       | 32         | 182      | 24.4%                     | 24.63%    |

Follow-up charts use conditional frequencies after the earlier SB action:

| Situation                           | Hand Range | PDF page | Raise total | Published fold/call/raise | Extracted              |
| ----------------------------------- | ---------- | -------- | ----------- | ------------------------- | ---------------------- |
| SB limp vs BB raise to 3.5 BB       | 33         | 183      | 13 BB       | 46.8 / 39.8 / 13.4%       | 47.14 / 39.72 / 13.14% |
| SB open to 3 BB vs BB 3-bet to 9 BB | 34         | 184      | 24 BB       | 45.4 / 37.4 / 17.2%       | 45.67 / 37.13 / 17.20% |

These totals weight each hand by its combinations and the preceding SB limp or raise frequency. The follow-up charts contain 125 and 110 eligible hand classes respectively. White cells are absent from the preceding range, not folds: they are excluded from dealing and evaluation and shown as “Not in this range” in the grid. Gray cells represent folds, black calls, and red raises. The follow-up chart defines eligibility directly, since rounding the earlier chart can erase tiny frequencies. Re-raise sizes come from PDF page 181; situation explanations paraphrase pages 182–184. The existing first-in identifiers remain valid; follow-up identifiers use `SB_LIMP_BB-hand` and `SB_RAISE_BB-hand`.

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
