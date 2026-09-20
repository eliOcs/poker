# Preflop lessons

`/learn` presents a six-seat cash table and a single strategy panel. Three linked sliders show Fold, Call and Raise with colored, labeled handles. There is no numeric entry in this mode; the betting slider retains its precise controls. Students use five-percentage-point increments from 0 to 100, covering both pure and mixed strategies. The remaining two actions rebalance proportionally, splitting evenly when both were zero. The starting mix is 35/35/30, independent of the answer.

When raising is included, Continue opens a sizing question using the shared live-game betting presets (Min, 2.5 BB, 3 BB, Max for unopened preflop pots; Min, ½ Pot, Pot, Max when facing a raise) and an amount slider with numeric entry and −/+ controls. The betting slider and its −/+ buttons step by one small blind (0.5 BB in lessons), matching live games. This is a control increment, not a restriction on legal bet denominations; presets and typed values retain their precise amounts, with the legal minimum raise enforced separately. Presets set the amount without submitting. “Check strategy” submits the mix and size, converting cents to big blinds for grading. There is no timer or account requirement. Feedback includes a modal with the position range and lesson details.

Lessons display stacks, bets, sizing and strategy feedback in BB by default; their status bar omits the currency stakes. Settings → Table amounts can select Currency or BB for both lessons and live tables. Default uses BB in lessons and currency in live games. The preference is saved with the profile, and changing it preserves the current bet and action mix. All amounts remain integer cents internally. Detailed explanations express amounts in BB.

The local seat uses the current profile's name and saved avatar through the shared seat renderer. Guests without a name keep the lesson's position label, and the original position label remains available in the seat's title. Clicking or keyboard-activating your seat opens the same profile settings as live games. Saving profile changes updates the seat without resetting the current exercise or strategy; opponents remain anonymous position labels.

Lessons and live games share fixed panel sizing in `styles/action-panel.css` through `--action-panel-height`. Lessons reserve 240px below 800px viewport width and 256px on larger screens to fit all three sliders. Feedback compares compact action bars with percentages and raise sizes; each colored bar's length is proportional to its action frequency. The reserved height stays the same through choices, sizing, loading and feedback, keeping the table stationary. Lesson content starts at the top of the panel, with consistently aligned headings and the action buttons anchored at the bottom.

The server deals the exercise (`GET /api/learn/scenario`) and grades the submitted distribution (`POST /api/learn/evaluate`). Scenarios are stateless situation/hand identifiers; no game, wallet or multiplayer connection is created. The five first-in positions, two SB follow-ups, two BTN follow-ups, three CO follow-ups, four HJ follow-ups and five LJ follow-ups are sampled uniformly, followed by a uniform choice among that situation's eligible hand classes. This is practice sampling, not a random physical deal or a simulation of how often these situations occur. Suits are randomized consistently with the hand class. Answers and the situation range are returned after submission. Progress is not persisted.

Players read the situation from the seats, action labels, bets and stacks, as in a live game. The top status bar shows “Preflop” and the scenario title; desktop also shows table size. Explanations appear in the feedback details, leaving the felt clear. In the SB limp follow-up, SB has contributed 1 BB and BB has raised to 3.5 BB: calling costs 2.5 BB, the pot is 4.5 BB, and the minimum raise total is 6 BB. In the SB open follow-up, SB has contributed 3 BB and BB has 3-bet to 9 BB: calling costs 6 BB, the pot is 12 BB, and the minimum raise total is 15 BB. Both players began with 100 BB. Bets and remaining stacks reflect these contributions. Sizing presets for follow-ups are Min, ½ Pot, Pot, and Max. Pot raises use the shared live-game calculation: add the outstanding call to the current pot, then add half or all of that pot to the opposing bet to obtain the raise total. For these heads-up scenarios, this gives 7/10.5 BB after the limp and 18/27 BB after the open. The server rejects raises below the situation's legal minimum. These are standalone decisions after the displayed action, not linked hands that continue from a learner's previous answer.

The button follow-ups start after BTN opens to 2.5 BB and either SB or BB 3-bets to 10 BB; the other blind folds. The minimum 4-bet total is 17.5 BB and the reference size is 23 BB. Against SB, the folded BB leaves 1 BB in the pot: 13.5 BB before calling, 7.5 BB to call, and pot odds of about 36%. Against BB, the folded SB leaves 0.5 BB: 13 BB before calling and pot odds of about 37%. The shared half-pot/pot presets include those folded chips, giving 20.5/31 BB versus SB and 20.25/30.5 BB versus BB. BTN acts last after the flop, which is reflected in the explanations.

The cutoff follow-ups start with a 2.5 BB open and cover 3-bets from BTN (8.5 BB), SB (10 BB) and BB (10 BB). Against BTN, both folded blinds contribute 1.5 BB: the pot is 12.5 BB, calling costs 6 BB, pot odds are about 32%, and the minimum 4-bet is 14.5 BB. Half-pot/pot presets are 17.75/27 BB. Against either blind, the contributions, pot odds and legal sizes match the corresponding button follow-up, but the hand ranges come from the cutoff charts. The reference 4-bet size is 23 BB in all three cases. Explanations distinguish the pressure of playing out of position against BTN from the advantage of acting last against the blinds, including only reasons for the current hand’s recommended actions.

The hijack follow-ups start with a 2.5 BB open and cover CO or BTN 3-bets to 8.5 BB and SB or BB 3-bets to 10 BB. The reference 4-bet is 23 BB in all four cases. Against CO/BTN, the pot is 12.5 BB, the extra call is 6 BB, pot odds are about 32%, and the minimum raise is 14.5 BB; half-pot/pot presets are 17.75/27 BB. Against the blinds, prices and presets match the corresponding BTN/CO scenarios. Explanations retain the positional context from pages 193–195, with separate reasons for the current hand’s recommended folds, calls and raises.

The lojack follow-ups cover HJ, CO and BTN 3-bets to 8.5 BB and SB/BB 3-bets to 10 BB after LJ opens to 2.5 BB. Each reference 4-bet is 23 BB. Against HJ/CO/BTN, the pot is 12.5 BB, the extra call is 6 BB, pot odds are about 32%, and the minimum raise is 14.5 BB; half-pot/pot presets are 17.75/27 BB. Against the blinds, prices and presets match the existing HJ scenarios. First-in explanations describe the five players still to act. Follow-up explanations connect the current hand’s recommended actions to position, the price of continuing and pressure from the opposing range.

When calling is recommended, follow-up feedback combines the pot size, call cost and pot odds in one concise note under “This situation”: the additional call divided by the pot after calling, including chips already committed. SB limp versus BB raise is `2.5 / (4.5 + 2.5) ~ 36%`; SB open versus BB 3-bet is `6 / (12 + 6) ~ 33%`. Percentages are rounded to whole numbers for teaching. The explanation describes the break-even threshold with no further betting, and explains why future bets and folds affect preflop calls. The platform does not charge rake, so lesson explanations omit the source solver’s rake assumption; it remains documented below as a source limitation. These metrics do not estimate the hand’s equity or change grading. Source: “Pot Odds and Outs,” PDF pages 37–38.

## Source and limits

Modern Poker Theory by Michael Acevedo, chapter 5, 100 BB, six-handed cash. Reference assumptions: 5% rake capped at $3, with a $5 big blind. Opening raise totals are 2.5 BB for LJ (displayed as UTG), HJ (displayed as UTG+1), CO and BTN; 3 BB for SB. The UI calls completing the SB “Call.” Call is selectable from every position, both alone and in mixes; non-SB calls are graded against the reference’s 0% calling frequency and receive an explanation instead of a validation error. There is no first-in BB exercise.

| Position | Hand Range | PDF page | Published raise frequency | Extracted |
| -------- | ---------- | -------- | ------------------------- | --------- |
| LJ       | 47         | 200      | 17.1%                     | 17.07%    |
| HJ       | 42         | 194      | 21.4%                     | 21.52%    |
| CO       | 38         | 189      | 27.8%                     | 27.87%    |
| BTN      | 35         | 185      | 43.4%                     | 43.46%    |
| SB       | 32         | 182      | 24.4%                     | 24.63%    |

Each chart displays Fold / Call / Raise totals directly below its grid. These are calculated from the displayed per-hand frequencies, weighted by card combinations (6 per pair, 4 per suited hand, 12 per offsuit hand). Follow-up totals also weight each hand by its preceding limp or opening-raise frequency; unavailable cells contribute nothing. The server returns the totals only with the evaluated answer. Whole percentages use largest-remainder rounding so the three displayed values add to 100%. These totals describe the chart, not the trainer’s uniform practice sampling.

Follow-up charts use conditional frequencies after the earlier SB, BTN, CO, HJ or LJ action:

| Situation                                | Hand Range | PDF page | Raise total | Published fold/call/raise | Extracted              |
| ---------------------------------------- | ---------- | -------- | ----------- | ------------------------- | ---------------------- |
| SB limp vs BB raise to 3.5 BB            | 33         | 183      | 13 BB       | 46.8 / 39.8 / 13.4%       | 47.14 / 39.72 / 13.14% |
| SB open to 3 BB vs BB 3-bet to 9 BB      | 34         | 184      | 24 BB       | 45.4 / 37.4 / 17.2%       | 45.67 / 37.13 / 17.20% |
| BTN open to 2.5 BB vs SB 3-bet to 10 BB  | 36         | 187      | 23 BB       | 43.1 / 48.9 / 8.1%        | 43.06 / 48.67 / 8.27%  |
| BTN open to 2.5 BB vs BB 3-bet to 10 BB  | 37         | 188      | 23 BB       | 44.5 / 47.3 / 8.6%        | 42.92 / 48.77 / 8.31%  |
| CO open to 2.5 BB vs BTN 3-bet to 8.5 BB | 39         | 191      | 23 BB       | 59.0 / 20.4 / 20.6%       | 59.17 / 19.82 / 21.01% |
| CO open to 2.5 BB vs SB 3-bet to 10 BB   | 40         | 192      | 23 BB       | 53.1 / 35.8 / 11.1%       | 53.09 / 35.34 / 11.56% |
| CO open to 2.5 BB vs BB 3-bet to 10 BB   | 41         | 193      | 23 BB       | 52.1 / 37.6 / 10.3%       | 51.93 / 37.70 / 10.37% |
| HJ open to 2.5 BB vs CO 3-bet to 8.5 BB  | 43         | 196      | 23 BB       | 63.3 / 14.5 / 22.2%       | 63.53 / 13.70 / 22.77% |
| HJ open to 2.5 BB vs BTN 3-bet to 8.5 BB | 44         | 197      | 23 BB       | 57.6 / 20.8 / 21.6%       | 57.76 / 20.25 / 21.99% |
| HJ open to 2.5 BB vs SB 3-bet to 10 BB   | 45         | 198      | 23 BB       | 52.6 / 36.3 / 11.1%       | 52.50 / 35.76 / 11.74% |
| HJ open to 2.5 BB vs BB 3-bet to 10 BB   | 46         | 199      | 23 BB       | 51.4 / 39.1 / 9.6%        | 51.52 / 38.73 / 9.75%  |
| LJ open to 2.5 BB vs HJ 3-bet to 8.5 BB  | 48         | 202      | 23 BB       | 63.1 / 15.1 / 21.8%       | 63.26 / 14.60 / 22.14% |
| LJ open to 2.5 BB vs CO 3-bet to 8.5 BB  | 49         | 203      | 23 BB       | 62.4 / 13.8 / 23.8%       | 62.55 / 13.41 / 24.04% |
| LJ open to 2.5 BB vs BTN 3-bet to 8.5 BB | 50         | 204      | 23 BB       | 54.9 / 23.3 / 21.9%       | 54.86 / 22.43 / 22.71% |
| LJ open to 2.5 BB vs SB 3-bet to 10 BB   | 51         | 205      | 23 BB       | 51.9 / 36.6 / 11.5%       | 51.73 / 36.21 / 12.06% |
| LJ open to 2.5 BB vs BB 3-bet to 10 BB   | 52         | 206      | 23 BB       | 51.7 / 38.8 / 9.5%        | 51.56 / 38.63 / 9.81%  |

These totals weight each hand by its combinations and the preceding limp or raise frequency from the corresponding position. The SB follow-up charts contain 125 and 110 eligible hand classes respectively; each BTN chart contains 96, each CO chart contains 73, each HJ chart contains 59 and each LJ chart contains 53. White cells are absent from the preceding range, not folds: they are excluded from dealing and evaluation and shown as “Not in range” in the grid. Gray cells represent folds, black calls, and red raises. The follow-up chart defines eligibility directly, since rounding the earlier chart can erase tiny frequencies. Re-raise sizes come from PDF page 181; situation explanations paraphrase pages 182–207. The existing first-in identifiers remain valid; follow-up identifiers use `SB_LIMP_BB-hand`, `SB_RAISE_BB-hand`, `BTN_RAISE_SB-hand`, `BTN_RAISE_BB-hand`, `CO_RAISE_BTN-hand`, `CO_RAISE_SB-hand`, `CO_RAISE_BB-hand`, `HJ_RAISE_CO-hand`, `HJ_RAISE_BTN-hand`, `HJ_RAISE_SB-hand`, `HJ_RAISE_BB-hand`, `LJ_RAISE_HJ-hand`, `LJ_RAISE_CO-hand`, `LJ_RAISE_BTN-hand`, `LJ_RAISE_SB-hand` and `LJ_RAISE_BB-hand`.

For the cutoff, hijack and lojack charts, the aggregate sanity checks allow one percentage point of difference from the captions to account for image extraction and five-point rounding. Per-hand frequencies still use the same five-percentage-point teaching precision. The LJ vs BB chart mixes AA between calling and 4-betting (extracted as 10%/90%); it is not forced into a pure raise.

The supplied PDF’s BTN charts on pages 187–188 are almost identical, while their captions differ; the page 188 caption also totals 100.4%. We preserve the measured per-hand chart mixes rather than adjusting them to force agreement with that caption. The aggregate sanity check therefore allows a two-percentage-point difference for this chart. Page 186 also quotes pots of 27/26 BB, which are inconsistent with the 2.5 BB open and 10 BB 3-bet prescribed on page 181. The trainer uses those explicit bet sizes and calculates the pots from actual seat contributions (13.5/13 BB).

The shared catalog in `src/backend/learn-ranges.json` contains complete strategies with an explicit `actions` array defining the order of each hand's approximate percentages. Most charts use `["fold", "call", "raise"]`; BB facing an SB limp uses `["check", "raise"]`. Frequencies are measured from chart image colors and rounded to five percentage points. The LJ chart uses black for raises; the SB chart uses black for calls. Overall frequencies are checked using six combinations per pair, four per suited hand and twelve per offsuit hand. Aggregate agreement is a sanity check, not proof of exact per-hand solver frequencies.

### Opponent ranges in detailed explanations

After “This situation,” every follow-up lesson includes an “Opponent range” section showing the opponent's preceding raise or 3-bet against the learner's position and action. First-in lessons omit it. The server returns this data only with evaluation feedback; it does not affect dealing or grading.

Opponent ranges are derived at evaluation time from the shared catalog by conditioning on the action already taken and the learner's hole cards. For example, `BTN_RAISE_SB` uses the `raise` column of `SB_VS_BTN_OPEN`; `SB_LIMP_BB` uses the `raise` column of `BB_VS_SB_LIMP`. The complete facing-open and facing-limp charts are stored once, from the acting player's perspective, so they can also support future lessons at those decisions. There is no separately stored opponent range. `LEARN_SITUATION_KEYS` in `learn-situations.js` defines the 21 available practice situations independently of the catalog; other chart keys are neither dealt nor accepted as lesson submissions.

The derived view keeps all 169 hand classes. Each entry contains `frequency` (the reference action frequency), `combinations` (available combinations after removing the learner's cards), `blockedCombinations` (combinations removed by those cards), and `probability` (percentage of the conditional range). `totalWeight` is the sum of available combinations multiplied by action frequency / 100. Each hand's probability is its weight divided by that total, multiplied by 100. Unrounded probabilities sum to 100%; zero-frequency hands have zero probability. For example, six combinations of AA raising 100% have three times the weight of four combinations of A5s raising 50%. The learner's blockers can change that ratio.

`learn-opponent-range.js` counts remaining pairs, suited hands and offsuit hands on the server. With no board and suit-symmetric reference charts, every concrete deal in a given hand class has identical remaining counts by hand class. Canonical representative suits therefore give the exact counts without adding suits to the stateless lesson identifier or trusting a new client input. All remaining hand classes together account for 1,225 possible opponent combinations from the 50 unknown cards. The model assumes the reference strategy and does not infer other players' folded cards or model their card-removal effects.

The opponent chart uses a red-to-green gradient for positive probabilities relative to the most likely hand in that chart: red means less likely and green means more likely. Zero-probability cells keep their neutral dark background so they remain distinct from rare hands. It is not a literal percentage-width action bar. Hovering, focusing or tapping a cell opens details with the hand probability (rounded to two decimal places), available combinations and action frequency. The combination count says “after removing your cards” only when the learner’s cards remove combinations of that hand. Popovers stay within the viewport, including inside the scrolling modal; Escape dismisses the hand details before closing the modal. Zero-probability cells retain the shared “Not in range” legend and the regular native “[hand]: Not in range” tooltip, without the probability breakdown. The learner's strategy chart continues to show action frequencies. Opponent bet totals follow the user's BB/currency preference.

The source section starts on PDF page 216. The full strategies below are extracted, retaining calls, checks and folds. The intervening facing-4-bet charts are not included:

| Opponent action against learner | Hand Range | PDF page | Published raise frequency |
| ------------------------------- | ---------- | -------- | ------------------------- |
| HJ vs LJ open                   | 56         | 217      | 8.1%                      |
| CO vs LJ open                   | 58         | 219      | 8.6%                      |
| CO vs HJ open                   | 60         | 221      | 9.9%                      |
| BTN vs LJ open                  | 62         | 224      | 7.3%                      |
| BTN vs HJ open                  | 64         | 226      | 8.8%                      |
| BTN vs CO open                  | 66         | 228      | 11.7%                     |
| SB vs LJ open                   | 68         | 230      | 7.3%                      |
| SB vs HJ open                   | 70         | 232      | 8.7%                      |
| SB vs CO open                   | 72         | 234      | 10.9%                     |
| SB vs BTN open                  | 74         | 236      | 15.0%                     |
| BB vs LJ open                   | 76         | 239      | 5.8%                      |
| BB vs HJ open                   | 78         | 241      | 7.6%                      |
| BB vs CO open                   | 80         | 243      | 9.7%                      |
| BB vs BTN open                  | 82         | 245      | 13.4%                     |
| BB vs SB open                   | 84         | 247      | 16.3%                     |
| BB vs SB limp                   | 86         | 249      | 40.6%                     |

Combination-weighted raise totals are checked within one percentage point of the source captions. The entire catalog is regenerated together; existing learner frequencies remain unchanged. Opponent probabilities are computed from the catalog rather than stored separately.

Regeneration requires a local PDF and Python with `pymupdf` and `Pillow` installed:

```sh
python scripts/learn/extract-ranges.py /path/to/modern-poker-theory.pdf
npx prettier --write src/backend/learn-ranges.json
node --test test/backend/learn.test.js test/backend/learn-opponent-ranges.test.js
```

No source PDF or chart bitmap is included in the application. The displayed grid is rendered from the derived numbers. Explanations are original paraphrases of the position guidance and general heuristics (PDF pages 177–179); sizing is on PDF pages 180–181.

Action feedback requires inclusion of reference actions used at least 10% of the time and excludes actions absent from the reference. Frequency feedback allows a 15-percentage-point difference per action. Tiny chart actions can therefore be omitted without failing action selection. Exact mixes with the recommended sizing are graded correct. Mixes within tolerance and raise sizes within 1 BB of the recommendation are graded close; other strategies are graded incorrect. The sizing allowance is a teaching tolerance, not an EV estimate. Card feedback computes high-card count (ten or higher), pocket pairs, suitedness, and the number of five-rank straight patterns containing both hole-card ranks. Aces count high or low, never wrapping. These are descriptive features, not equity estimates or solver rationales, and do not affect grading. The range modal describes the players left to act and the actions recommended for the specific hand. `learn-explanations.js` composes position context and fold/call/raise reasons using every positive recommended frequency, including small mixes. It does not use the learner’s submitted actions to select guidance. Pure folds get only folding guidance; pure calls omit raise guidance. `learn-playability.js` includes pot odds only for recommended follow-up calls and sizing only for recommended raises. Mixed hands include the relevant reasons and a reminder to mix over repeated decisions. The range data and grading are unchanged. Source: “Main Variables that Affect Pre-flop Hand Ranges,” PDF pages 163–167.

## Validation

Backend tests cover range totals, dealing, boundary validation and grading thresholds. Explanation tests check every hand in every range for action-specific guidance, conditional pot odds and sizing, all seven pure/mixed action combinations, and independence from the submitted answer. Focused examples check first-in folds, folding in and out of position, the SB limp discount, linear limp re-raises, calls at the actual price, and 4-bets that reduce a positional disadvantage. Range comparisons still verify the positional patterns, and the browser flow includes the mixed AA response against BB. Component tests cover mixed and pure strategies, BB and currency sizing, and retrying failed evaluations. A real-server smoke test exercises /learn, submission, Details, the next hand and invalid requests. The Docker UI catalog covers each step and verdict plus hand-specific fold, call and mixed explanations on desktop and mobile, including stable table geometry through loading and step changes.
