# Preflop lessons

`/learn` presents a six-seat cash table and a single strategy panel. Linked sliders show Fold, Call and Raise, or Check and Raise when BB faces an SB limp, with colored, labeled handles. There is no numeric entry in this mode; the betting slider retains its precise controls. Students use five-percentage-point increments from 0 to 100, covering both pure and mixed strategies. The remaining actions rebalance proportionally, splitting evenly when their weights were zero. The starting mix is 35/35/30, or 50/50 for Check/Raise, independent of the answer. Each scenario and evaluation exposes its `actions` array; submitted frequencies follow that order and must match its length.

Each hand first plays the actions leading to its decision, starting with the cards dealt and blinds posted. Folds, limps, raises and re-raises update the shared seats, bets, stacks and acting-player highlight every 900 ms. This includes the learner's earlier actions in follow-up situations. The strategy panel appears after the final action; first-to-act lessons show it immediately. “Skip to decision” finishes playback early. A new hand restarts playback, and leaving Learn cancels it. The server supplies `replay` snapshots through `learn-replay.js`, reusing the preceding situation for 4-bet and limp-reraise lessons. The browser only advances through those snapshots; it does not infer poker actions or expose the answer.

When raising is included, Continue opens a sizing question using the shared live-game betting presets (Min, 2.5 BB, 3 BB, Max for unopened preflop pots; Min, ½ Pot, Pot, Max when facing a raise) and an amount slider with numeric entry and −/+ controls. The betting slider and its −/+ buttons step by one small blind (0.5 BB in lessons), matching live games. This is a control increment, not a restriction on legal bet denominations; presets and typed values retain their precise amounts, with the legal minimum raise enforced separately. Presets set the amount without submitting. “Check strategy” submits the mix and size, converting cents to big blinds for grading. There is no timer or account requirement. Feedback includes a modal with the position range and lesson details.

Lessons display stacks, bets, sizing and strategy feedback in BB by default; their status bar omits the currency stakes. Settings → Table amounts can select Currency or BB for both lessons and live tables. Default uses BB in lessons and currency in live games. The preference is saved with the profile, and changing it preserves the current bet and action mix. All amounts remain integer cents internally. Detailed explanations express amounts in BB.

The local seat uses the current profile's name and saved avatar through the shared seat renderer. Guests without a name keep the lesson's position label, and the original position label remains available in the seat's title. Clicking or keyboard-activating your seat opens the same profile settings as live games. Saving profile changes updates the seat without resetting the current exercise or strategy; opponents remain anonymous position labels.

Lessons and live games share fixed panel sizing in `styles/action-panel.css` through `--action-panel-height`. Lessons reserve 240px below 800px viewport width and 256px on larger screens to fit all three sliders. Feedback compares compact action bars with percentages and raise sizes; each colored bar's length is proportional to its action frequency. The reserved height stays the same through choices, sizing, loading and feedback, keeping the table stationary. Lesson content starts at the top of the panel, with consistently aligned headings and the action buttons anchored at the bottom.

The server deals the exercise (`GET /api/learn/scenario`) and grades the submitted distribution (`POST /api/learn/evaluate`). Scenarios are stateless situation/hand identifiers; no game, wallet or multiplayer connection is created. All 53 situations are sampled uniformly, followed by a uniform choice among that situation's eligible hand classes. This is practice sampling, not a random physical deal or a simulation of how often these situations occur. Suits are randomized consistently with the hand class. Answers and the situation range are returned after submission. Progress is not persisted.

Players read the situation from the seats, action labels, bets and stacks, as in a live game. The top status bar shows “Preflop” and the scenario title; desktop also shows table size. Explanations appear in the feedback details, leaving the felt clear. In the SB limp follow-up, SB has contributed 1 BB and BB has raised to 3.5 BB: calling costs 2.5 BB, the pot is 4.5 BB, and the minimum raise total is 6 BB. In the SB open follow-up, SB has contributed 3 BB and BB has 3-bet to 9 BB: calling costs 6 BB, the pot is 12 BB, and the minimum raise total is 15 BB. Both players began with 100 BB. Bets and remaining stacks reflect these contributions. Sizing presets for follow-ups are Min, ½ Pot, Pot, and Max. Pot raises use the shared live-game calculation: add the outstanding call to the current pot, then add half or all of that pot to the opposing bet to obtain the raise total. For these heads-up scenarios, this gives 7/10.5 BB after the limp and 18/27 BB after the open. The server rejects raises below the situation's legal minimum. These are standalone decisions after the displayed action, not linked hands that continue from a learner's previous answer.

The button follow-ups start after BTN opens to 2.5 BB and either SB or BB 3-bets to 10 BB; the other blind folds. The minimum 4-bet total is 17.5 BB and the reference size is 23 BB. Against SB, the folded BB leaves 1 BB in the pot: 13.5 BB before calling, 7.5 BB to call, and pot odds of about 36%. Against BB, the folded SB leaves 0.5 BB: 13 BB before calling and pot odds of about 37%. The shared half-pot/pot presets include those folded chips, giving 20.5/31 BB versus SB and 20.25/30.5 BB versus BB. BTN acts last after the flop, which is reflected in the explanations.

The cutoff follow-ups start with a 2.5 BB open and cover 3-bets from BTN (8.5 BB), SB (10 BB) and BB (10 BB). Against BTN, both folded blinds contribute 1.5 BB: the pot is 12.5 BB, calling costs 6 BB, pot odds are about 32%, and the minimum 4-bet is 14.5 BB. Half-pot/pot presets are 17.75/27 BB. Against either blind, the contributions, pot odds and legal sizes match the corresponding button follow-up, but the hand ranges come from the cutoff charts. The reference 4-bet size is 23 BB in all three cases. Explanations distinguish the pressure of playing out of position against BTN from the advantage of acting last against the blinds, including only reasons for the current hand’s recommended actions.

The hijack follow-ups start with a 2.5 BB open and cover CO or BTN 3-bets to 8.5 BB and SB or BB 3-bets to 10 BB. The reference 4-bet is 23 BB in all four cases. Against CO/BTN, the pot is 12.5 BB, the extra call is 6 BB, pot odds are about 32%, and the minimum raise is 14.5 BB; half-pot/pot presets are 17.75/27 BB. Against the blinds, prices and presets match the corresponding BTN/CO scenarios. Explanations retain the positional context from pages 193–195, with separate reasons for the current hand’s recommended folds, calls and raises.

The lojack follow-ups cover HJ, CO and BTN 3-bets to 8.5 BB and SB/BB 3-bets to 10 BB after LJ opens to 2.5 BB. Each reference 4-bet is 23 BB. Against HJ/CO/BTN, the pot is 12.5 BB, the extra call is 6 BB, pot odds are about 32%, and the minimum raise is 14.5 BB; half-pot/pot presets are 17.75/27 BB. Against the blinds, prices and presets match the existing HJ scenarios. First-in explanations describe the five players still to act. Follow-up explanations connect the current hand’s recommended actions to position, the price of continuing and pressure from the opposing range.

Each Details section has a distinct purpose: “Your cards” describes card properties; “This situation” gives position and action reasons, followed by call-price math and sizing conventions; “Key takeaways” adds range-wide principles, comparisons and conditional future responses. The strategy line supplies the recommended raise total. Action prose and sizing headings do not repeat that total, and call prices appear only in the pot-odds note. Meaningful sizing comparisons (such as in-position versus out-of-position 3-bets) remain in takeaways.

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

Each chart displays its action totals directly below its grid: Fold / Call / Raise, or Check / Raise against an SB limp. These are calculated from the displayed per-hand frequencies, weighted by card combinations (6 per pair, 4 per suited hand, 12 per offsuit hand). Follow-up totals also weight each hand by its preceding limp or opening-raise frequency; unavailable cells contribute nothing. The server returns the totals only with the evaluated answer. Whole percentages use largest-remainder rounding so the displayed values add to 100%. These totals describe the chart, not the trainer’s uniform practice sampling.

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

First-in takeaways paraphrase PDF pages 181–182 (SB’s combined limp/raise strategy), 184–186 (BTN’s raise-or-fold strategy under rake and without a blind discount), 188 (CO removes marginal BTN opens), 193 (HJ trims frequencies among speculative hands), and 199 (LJ retains selected small pairs and suited connectors for board coverage). They explain range construction rather than repeating chart percentages or the hand’s action. The CO/HJ comparisons remain brief and do not turn mixed hands into categorical folds.

### Hijack facing an LJ open and 4-bet

`HJ_VS_LJ_OPEN` reuses Hand Range 56 (PDF page 217) as a practice decision. LJ has opened to 2.5 BB; HJ has invested nothing and CO, BTN and both blinds have yet to act. All six seats remain active. The pot is 4 BB, calling would cost 2.5 BB, the legal minimum raise is 4 BB and the reference 3-bet is 8.5 BB. Half-pot/pot presets are 5.75/9 BB. All 169 hands are eligible, with no recommended calls; a submitted call is graded as a mistake. Chart totals use all starting combinations, not HJ's first-in opening range: the extraction gives 91.79% fold / 0% call / 8.21% raise. HJ has position on LJ, but CO and BTN could enter with position on HJ.

`HJ_VS_LJ_4BET` uses Hand Range 57 (PDF page 218). LJ opened to 2.5 BB, HJ 3-bet to 8.5 BB, the other four players folded, and LJ 4-bet to 23 BB. The pot includes the folded blinds: 33 BB, with another 14.5 BB to call and about 31% pot odds. The legal minimum raise is 37.5 BB; half-pot/pot presets are 46.75/70.5 BB. The reference 5-bet is all-in to 100 BB, requiring HJ's remaining 91.5 BB. Sizes follow PDF page 181.

The 4-bet response has 32 eligible hand classes. White cells remain unavailable, while gray cells are folds. Weighting by each hand's preceding HJ 3-bet frequency gives 38.23% fold / 43.12% call / 18.65% shove, within one percentage point of the published 38.3 / 43.3 / 18.4%. The displayed rounded totals are 38 / 43 / 19%. AA mixes 50% call / 50% shove, AKo mixes 45% call / 55% shove, and QQ mixes 90% call / 10% shove. These preserve the measured chart rather than forcing the prose's general description of smaller pairs into pure calls. The chart includes 76s despite its preceding 3-bet frequency rounding to zero; it stays eligible for practice but contributes no weight to aggregate totals, as with earlier follow-ups.

Both decisions use the existing stateless dealing and grading APIs. They are sampled independently, not played as a linked hand. Opponent feedback shows LJ's opening range (Hand Range 47) for the first decision and LJ's 4-betting range (Hand Range 48) for the second. The latter probabilities multiply each hand's opening frequency by its conditional 4-bet frequency and remaining combinations after blockers. The popover reports both frequencies; hands absent from the 4-bet chart have zero probability and the opponent grid retains all 169 cells.

### Cutoff facing LJ/HJ opens and 4-bets

Four CO practice decisions use Hand Ranges 58–61, PDF pages 219–222. The section's introduction starts at the bottom of page 218. `CO_VS_LJ_OPEN` and `CO_VS_HJ_OPEN` reuse the complete facing-open charts already in the catalog; `CO_VS_LJ_4BET` and `CO_VS_HJ_4BET` add the conditional responses to 4-bets. All four are sampled independently alongside the existing lessons.

Against an open, LJ or HJ has contributed 2.5 BB and the other early-position player has folded. CO has invested nothing; BTN and both blinds remain active. The pot is 4 BB, the minimum raise is 4 BB and the reference 3-bet is 8.5 BB. Against a 4-bet, CO has already contributed 8.5 BB, the opener has 23 BB and everyone else has folded. The pot, price, minimum raise, presets and 100 BB all-in sizing match the HJ 4-bet lesson: 33 BB in the pot, 14.5 BB to call, roughly 31% pot odds, 37.5 BB minimum and 46.75/70.5 BB half-pot/pot presets. Explanations identify the actual opponent and distinguish the remaining players from those already folded.

| Practice decision | Hand Range | PDF page | Eligible hand classes | Published fold/call/raise | Extracted              | Displayed totals |
| ----------------- | ---------- | -------- | --------------------- | ------------------------- | ---------------------- | ---------------- |
| CO vs LJ open     | 58         | 219      | 169                   | 91.4 / 0 / 8.6%           | 91.37 / 0 / 8.63%      | 91 / 0 / 9%      |
| CO vs LJ 4-bet    | 59         | 220      | 31                    | 37.4 / 45.1 / 17.5%       | 37.19 / 45.15 / 17.66% | 37 / 45 / 18%    |
| CO vs HJ open     | 60         | 221      | 169                   | 90.1 / 0 / 9.9%           | 90.07 / 0 / 9.93%      | 90 / 0 / 10%     |
| CO vs HJ 4-bet    | 61         | 222      | 34                    | 35.8 / 48.2 / 16.1%       | 36.49 / 47.49 / 16.02% | 37 / 47 / 16%    |

The HJ caption totals 100.1% from rounding. The extraction retains chart colors and five-point hand frequencies rather than altering hands to match the caption; each aggregate action stays within one percentage point. 4-bet totals weight the preceding CO 3-bet chart, not CO's first-in range. As in the earlier lessons, colored cells remain eligible even when the preceding frequency rounds to zero: A9s/A3s against LJ and A8s/KJo/54s against HJ. White cells are unavailable.

Detailed feedback includes a separate “Key takeaways” section for every CO decision, including pure folds. It explains the small increase from HJ's 8.1% to CO's 8.6% against LJ (one fewer player behind but the same tight opener), the increase to 9.9% against HJ's wider opening range, and the additional A9s/QTs/JTs mixes. Against 4-bets it covers AA slowplays, KK/AKs shoves, mostly calling QQ versus LJ, mixed AKo and suited wheel-ace calls, and the expanded KJs/ATs/KTs defense against HJ. Hand-specific reasons still describe only the recommended actions. The source prose's percentages are identified as source figures; grading uses the displayed five-point chart approximations. For example, CO's QQ shove against LJ rounds to 10%, AA's call frequency is 50% versus LJ and 60% versus HJ, and KJs calls 100% versus HJ.

Opponent feedback uses LJ's or HJ's first-in range when CO faces an open, and the corresponding `LJ_RAISE_CO` or `HJ_RAISE_CO` chart after a 4-bet. It retains opening-frequency weighting and card removal. The existing LJ/HJ-open-versus-CO-3-bet lessons incorporate CO’s strategy into their Key takeaways, before the opponent chart.

### Button facing LJ/HJ/CO opens and 4-bets

Six BTN decisions use Hand Ranges 62–67, PDF pages 224–229, with the Button introduction on pages 222–223. `BTN_VS_LJ_OPEN`, `BTN_VS_HJ_OPEN` and `BTN_VS_CO_OPEN` use the existing facing-open charts; the corresponding `BTN_VS_*_4BET` charts add the conditional responses. Against an open, the two other early seats have folded and both blinds remain active. BTN always has postflop position, including if a blind enters. Against a 4-bet, only BTN and the opener remain active. Sizing matches the HJ/CO lessons: open 2.5 BB, 3-bet 8.5 BB, 4-bet 23 BB, 5-bet all-in 100 BB, with 100 BB starting stacks.

Calling an open costs 2.5 BB into 4 BB (about 38% immediate pot odds); the legal minimum raise is 4 BB and half-pot/pot presets are 5.75/9 BB. After the 4-bet, BTN has invested 8.5 BB and faces another 14.5 BB into 33 BB (about 31% pot odds), including the folded blinds. The minimum raise is 37.5 BB and half-pot/pot presets are 46.75/70.5 BB. Calls do not guarantee a flop when the blinds are still to act.

| Practice decision | Hand Range | PDF page | Eligible hand classes | Published fold/call/raise | Extracted              | Displayed totals |
| ----------------- | ---------- | -------- | --------------------- | ------------------------- | ---------------------- | ---------------- |
| BTN vs LJ open    | 62         | 224      | 169                   | 85.8 / 6.9 / 7.3%         | 85.79 / 6.79 / 7.41%   | 86 / 7 / 7%      |
| BTN vs LJ 4-bet   | 63         | 225      | 44                    | 40.6 / 40 / 19.4%         | 40.43 / 40.06 / 19.51% | 40 / 40 / 20%    |
| BTN vs HJ open    | 64         | 226      | 169                   | 84.6 / 6.5 / 8.8%         | 84.74 / 6.37 / 8.88%   | 85 / 6 / 9%      |
| BTN vs HJ 4-bet   | 65         | 227      | 45                    | 40 / 41.6 / 18.4%         | 40.01 / 40.91 / 19.08% | 40 / 41 / 19%    |
| BTN vs CO open    | 66         | 228      | 169                   | 82.3 / 5.4 / 11.7%        | 82.86 / 5.15 / 11.99%  | 83 / 5 / 12%     |
| BTN vs CO 4-bet   | 67         | 229      | 44                    | 37.3 / 45.2 / 17.1%       | 38.20 / 44.42 / 17.38% | 38 / 45 / 17%    |

Detailed feedback and the existing LJ/HJ/CO-open-versus-BTN-3-bet opponent notes include these source lessons:

- Guaranteed position permits flat calls and a more polarized 3-bet range. Calls balance postflop playability and board coverage with strong hands such as QQ–99, AKo and suited broadways that protect against squeezes.
- Moving from LJ to HJ to CO, 3-bets increase (7.3%, 8.8%, 11.7%) while calls shrink (6.9%, 6.5%, 5.4%). Later openers are wider, but the blinds can also squeeze more often. QJo/ATo enter at low frequencies versus HJ; versus CO, suited aces and offsuit broadways add high-card value.
- Against LJ's strong 4-bet range, KK/AKs shove, AKo and AA mix, QQ mostly calls, and most continuing hands call in position. Against HJ, QQ shoves more and additional calls include AQo, KTs, QJs, JTs and wheel aces.
- A conditional action frequency is not the hand's share of the range. The source explicitly gives 54s a 4% 3-bet against HJ and a 100% call after the 4-bet. The extractor restores that thin red strip, missed by pixel sampling, as `[65, 30, 5]` at the trainer's five-point precision. This also corrects the existing HJ-versus-BTN opponent range. Conditional totals weight the preceding 3-bet frequency, not BTN's first-in range.
- Against CO's wider, more polarized 4-bet range, AA always calls, AQo/QJs/JTs call more, K9s joins the defense, JJ mixes shoves and QQ/AKo shove more frequently. The source prose calls the last actions “4-bets,” but the sequence and Hand Range 67 identify them as 5-bets all-in; the lesson uses the correct action.
- Tiny K6s/K5s/53s outliers versus LJ are described by the source as likely solver-convergence artifacts. Teach the overall structure rather than treating these exceptions as universal rules.

Source percentages in the prose remain distinguished from the approximate five-point chart used for grading. The captions contain inconsistencies: BTN versus HJ open sums to 99.9%, versus CO open to 99.4%, and versus CO 4-bet to 99.6%. Measured per-hand values are retained rather than altered to force the captions to sum to 100%; every aggregate action remains within one percentage point. The source prose also gives LJ-open KTs calls as 30% while the chart measures about 60%; the practice keeps the chart and avoids that disputed prose figure. White 4-bet cells are unavailable; colored cells remain eligible even if a tiny preceding mix rounds to zero (A6s versus LJ and A6s/K7s versus HJ).

Each new decision shows range-wide takeaways even for pure folds, while hand-specific text only explains the recommended actions. Opponent feedback selects the actual LJ/HJ/CO open or the corresponding `*_RAISE_BTN` 4-bet chart, retaining opening-frequency weighting and card removal.

### Small Blind facing LJ/HJ/CO/BTN opens and 4-bets

Eight SB practice decisions use Hand Ranges 68–75, PDF pages 230–237; the introduction begins at the bottom of page 229. `SB_VS_LJ_OPEN`, `SB_VS_HJ_OPEN`, `SB_VS_CO_OPEN` and `SB_VS_BTN_OPEN` reuse the existing open-response charts. The corresponding `SB_VS_*_4BET` decisions add four conditional response charts. These lessons are separate from the existing SB-first-in and blind-versus-blind decisions.

Facing an open, the opener has 2.5 BB, SB has posted 0.5 BB, BB has 1 BB and the three other seats have folded. BB is still to act. SB is out of position against everyone. The pot is 4 BB, a call would cost another 2 BB, the minimum raise is 4 BB and the reference 3-bet is **10 BB** (PDF page 181). Half-pot/pot presets are 5.5/8.5 BB. All 169 hands are eligible, and every chart uses 3-bet or fold with no recommended calls. The posted blind does not count as an earlier voluntary action: open-response chart totals use all starting combinations, not SB's first-in raising range.

Facing a 4-bet, SB has 10 BB invested, the opener has 23 BB and BB has folded its 1 BB. The pot is **34 BB**, with **13 BB** to call and about **28%** immediate pot odds. The minimum raise is **36 BB**, half-pot/pot presets are **46.5/70 BB**, and the reference 5-bet is all-in to **100 BB**, committing the remaining **90 BB**. Both the hand-specific reasons and sizing notes use those actual amounts and identify SB as acting first postflop. A call is still a valid defense out of position; it does not imply the positional advantage of the earlier HJ/CO/BTN lessons.

| Practice decision | Hand Range | PDF page | Eligible hand classes | Published fold/call/raise | Extracted              | Displayed totals |
| ----------------- | ---------- | -------- | --------------------- | ------------------------- | ---------------------- | ---------------- |
| SB vs LJ open     | 68         | 230      | 169                   | 92.7 / 0 / 7.3%           | 92.53 / 0 / 7.47%      | 93 / 0 / 7%      |
| SB vs LJ 4-bet    | 69         | 231      | 27                    | 33.8 / 45.7 / 20.6%       | 33.81 / 45.70 / 20.49% | 34 / 46 / 20%    |
| SB vs HJ open     | 70         | 232      | 169                   | 91.3 / 0 / 8.7%           | 91.32 / 0 / 8.68%      | 91 / 0 / 9%      |
| SB vs HJ 4-bet    | 71         | 233      | 32                    | 32.8 / 46.8 / 20%         | 32.94 / 46.13 / 20.94% | 33 / 46 / 21%    |
| SB vs CO open     | 72         | 234      | 169                   | 89.1 / 0 / 10.9%          | 89.16 / 0 / 10.84%     | 89 / 0 / 11%     |
| SB vs CO 4-bet    | 73         | 235      | 36                    | 29.2 / 52.2 / 18.6%       | 29.10 / 52.05 / 18.85% | 29 / 52 / 19%    |
| SB vs BTN open    | 74         | 236      | 169                   | 85 / 0 / 15%              | 84.96 / 0 / 15.04%     | 85 / 0 / 15%     |
| SB vs BTN 4-bet   | 75         | 237      | 45                    | 26.5 / 56 / 17.3%         | 26.38 / 56.27 / 17.35% | 27 / 56 / 17%    |

The detailed takeaways explain the main source lessons:

- The blind discount is insufficient to support flat calls against opens under the book's raked cash-game assumptions. BB may squeeze or overcall, SB acts first postflop, and equity is harder to realize, particularly in a multiway pot. The notes identify rake as a source assumption, not a claim that this app charges rake.
- Keep the 3-bet-or-fold structure while widening from 7.3% against LJ to 8.7% against HJ, 10.9% against CO and 15% against BTN. Add selected frequencies with A9s/KQo/K9s/J9s against HJ, AJo/A8s/T9s against CO, and offsuit broadways plus more suited hands against BTN.
- Against LJ's 4-bet, calls retain strong hands, medium pairs and small suited connectors. Some lower hands defend better than AQo or suited king-/queen-high hands because they leave the opponent's bluff combinations available. Raw equity alone does not determine the best calls.
- A wider 3-bet range against HJ needs a wider defense against 4-bets, including occasional AQo calls and partial KQs/KJs/KTs calls.
- Against CO's more polarized 4-bets, SB slowplays AA more, calls more AQo/A3s/JTs, and uses suited wheel aces that block AA/AK while leaving suited broadway bluffs available. ATs and A5s introduce low-frequency 5-bet bluffs; the extracted shove frequencies are 5% and 10% respectively.
- Against BTN's highly polarized 4-bets, AA always calls. KK/QQ/AK shove, JJ/TT mix and A5s mostly shoves. The wider calling defense reaches roughly 56% of the prior 3-bet range. These aggregate response frequencies describe hands that already 3-bet, not all starting hands or just the continuing hands.

The extraction preserves measured chart values at five-point precision, with every aggregate action within one percentage point of the caption. Source inconsistencies are not silently copied into grading: Hand Range 69 totals 100.1%; Hand Range 71 prints `20%%` for shoves and totals 99.6%; Hand Range 75 totals 99.8%. The prose omits KK from the LJ shove list, but its chart mixes it (extracted 80% shove / 20% call). The BTN prose lists A5s at 74% in both shove and call lists; the chart clearly shows mostly shoves and some calls, extracted as **75% shove / 25% call**.

White 4-bet cells remain unavailable. Colored cells remain eligible even when a tiny preceding 3-bet rounds to zero: 55 against LJ; 55/T9s/76s against HJ; A3s/76s/65s/54s against CO; A3s/JTo against BTN. Totals weight the preceding SB 3-bet frequencies. As with the earlier lessons, practice samples eligible hand classes uniformly rather than claiming to deal hands in their real-world conditional proportions.

Range-wide takeaways appear for all eight decisions, including pure folds. The existing LJ/HJ/CO/BTN-open-versus-SB-3-bet lessons also receive these SB opponent notes. At the new decisions, opponent feedback uses the actual opener's first-in chart or its corresponding `*_RAISE_SB` 4-bet chart, preserving opening-frequency weighting and card removal.

### Big Blind facing opens, 4-bets and SB limps

The Big Blind section (PDF pages 237–250) adds twelve independent practice decisions: an open and subsequent 4-bet from each of LJ/HJ/CO/BTN/SB, plus an SB limp and limp-reraise. The six existing full facing-open/limp charts become playable; six conditional response charts are newly extracted. No first-in BB decision is added.

Against LJ/HJ/CO/BTN, the opener has 2.5 BB, BB has 1 BB and folded SB contributes 0.5 BB. Calling costs 1.5 BB into 4 BB (about 27% immediate pot odds), closes the action and leaves BB out of position. Minimum/reference 3-bets are 4/10 BB; half-pot/pot presets are 5.25/8 BB. After BB 3-bets to 10 BB and faces a 23 BB 4-bet, the pot is 33.5 BB, the call is 13 BB (about 28%), minimum raise is 36 BB and half-pot/pot presets are 46.25/69.5 BB. The reference 5-bet is 100 BB, committing the remaining 90 BB.

Against SB, BB has position. SB opens to 3 BB; calling costs 2 BB into 4 BB (about 33%), minimum/reference 3-bets are 5/9 BB, and half-pot/pot presets are 6/9 BB. SB's subsequent 4-bet is **24 BB**: the pot is 33 BB, calling costs 15 BB (about 31%), minimum raise is 39 BB and half-pot/pot presets are 48/72 BB. The reference 5-bet is 100 BB, committing the remaining 91 BB. Sizes follow PDF page 181.

Against a limp, both blinds have 1 BB invested. The legal choices are **Check/Raise**; checking is free and skips sizing. The reference raise is 3.5 BB, with a legal minimum of 2 BB. If SB limp-reraises to 13 BB, BB has 3.5 BB invested: the pot is 16.5 BB, calling costs 9.5 BB (about 37%), minimum raise is 22.5 BB and half-pot/pot presets are 26/39 BB. The reference 4-bet is **28 BB**, not an all-in.

| Practice decision     | Hand Range | PDF page | Eligible hand classes | Published fold/call/raise | Extracted              | Displayed totals |
| --------------------- | ---------- | -------- | --------------------- | ------------------------- | ---------------------- | ---------------- |
| BB vs LJ open         | 76         | 239      | 169                   | 71.2 / 22.8 / 5.8%        | 71.31 / 23.05 / 5.64%  | 71 / 23 / 6%     |
| BB vs LJ 4-bet        | 77         | 240      | 55                    | 36.4 / 42.2 / 21.4%       | 34.72 / 42.75 / 22.53% | 35 / 43 / 22%    |
| BB vs HJ open         | 78         | 241      | 169                   | 68.5 / 23.9 / 7.6%        | 68.45 / 23.91 / 7.64%  | 68 / 24 / 8%     |
| BB vs HJ 4-bet        | 79         | 242      | 59                    | 36.5 / 42.5 / 21%         | 36.52 / 42.06 / 21.42% | 37 / 42 / 21%    |
| BB vs CO open         | 80         | 243      | 169                   | 64.6 / 25.7 / 9.7%        | 64.54 / 25.75 / 9.71%  | 64 / 26 / 10%    |
| BB vs CO 4-bet        | 81         | 244      | 66                    | 31.5 / 49.6 / 18.8%       | 31.43 / 49.29 / 19.28% | 32 / 49 / 19%    |
| BB vs BTN open        | 82         | 245      | 169                   | 43.2 / 43.4 / 13.4%       | 43.14 / 43.48 / 13.37% | 43 / 44 / 13%    |
| BB vs BTN 4-bet       | 83         | 246      | 73                    | 26.5 / 54.1 / 19.4%       | 19.48 / 62.30 / 18.22% | 20 / 62 / 18%    |
| BB vs SB open         | 84         | 247      | 169                   | 35.4 / 48.3 / 16.3%       | 35.49 / 48.34 / 16.17% | 36 / 48 / 16%    |
| BB vs SB 4-bet        | 85         | 248      | 99                    | 41.2 / 46.2 / 12.6%       | 41.04 / 46.01 / 12.95% | 41 / 46 / 13%    |
| BB vs SB limp         | 86         | 249      | 169                   | 59.4 / 40.6%              | 59.49 / 40.51%         | 59 / 41%         |
| BB vs SB limp-reraise | 87         | 250      | 164                   | 51.4 / 41.3 / 7.3%        | 51.29 / 40.94 / 7.77%  | 51 / 41 / 8%     |

The limp row uses Check/Raise. Follow-up totals weight the preceding BB 3-bet or limp-raise frequency. White cells remain unavailable; colored cells remain eligible even when a tiny preceding frequency rounds to zero. These totals describe conditional strategies, while practice samples eligible hand classes uniformly.

Detailed takeaways cover the section's main lessons for every decision, including pure folds:

- Defend to reduce the loss from posting the blind, while respecting tight early opens. Closing the action and the blind discount support calls. Equity realization matters: against LJ, AQo–ATo favor calls, A9o folds and K2s mixes calls, showing why the higher card alone is insufficient.
- Widen gradually against HJ and CO, then substantially against BTN. Calls and 3-bets both grow. K8o/Q9o still fold against CO but call against BTN; BTN's wider range contains fewer strong hands proportionally. BB's 3-bets against BTN are more linear.
- Against increasingly polarized 4-bets, defend largely through calls and retain premium slowplays. HJ adds KJs/KTs calls; its QQ calls and JJ mixed shoves illustrate why small solver irregularities are not universal rules. CO calls more and slowplays AA more often.
- Position against SB changes the structure to polarized 3-bets: strong hands plus selected bluffs, with medium-strength hands calling. Even in position, the worst hands fold under the book's rake assumptions. After SB 4-bets, AA always calls and KK/AKs often call.
- Take the free check against a limp when appropriate. The raising range combines hands that can call a limp-reraise with hands that can raise/fold. Against that reraise, only a narrow part of BB's earlier raising range 4-bets to 28 BB; calls use position and folds release the weaker raises.

Source discrepancies are preserved transparently. Hand Range 83 (BB versus BTN 4-bet) visibly disagrees with its prose and caption: the chart extracts AA as 90% call / 10% shove and AKs as 30% call / 70% shove, while the prose says AA shoves 32% and AKs always shoves. Weighting the measured chart gives approximately 19.48 / 62.30 / 18.22%, versus the caption's 26.5 / 54.1 / 19.4%. Unrounded pixel measurements retain this discrepancy, so it is not explained by five-point rounding. Grading and displayed totals consistently use the chart; the extractor and source checks document a chart-specific nine-point caption tolerance. Hand Range 77 uses a two-point tolerance (largest rounded difference about 1.7 points); all other new charts remain within one point. These tolerances do not change grading tolerances or adjust per-hand data to fit captions.

The HJ-open prose incorrectly names CO; notes use the actual HJ chart. The CO 4-bet prose mentions 44, but its white chart cell is unavailable and is excluded. The SB 4-bet discussion mistakenly attributes calls to SB; the lesson correctly assigns the response to BB. Exact source percentages appear only when they agree with the intended guidance; hand grading always uses the displayed five-point chart approximation.

Opponent feedback uses the actual opening or 4-betting range, including SB's 3/24 BB sequence. Against an SB limp it selects SB's `call` column. Against the limp-reraise it multiplies the conditional raise frequency from `SB_LIMP_BB` by SB's initial limp frequency and available combinations after blockers. The API retains `openingFrequency` for that prior frequency and supplies `openingAction: "Limp"`; popovers label it “Limp frequency” and “Limp-reraise frequency after limping.” Existing open-versus-BB and SB-limp-versus-BB-raise lessons include concise BB strategy insights in Key takeaways before their opponent charts.

### Opponent ranges in detailed explanations

Detailed feedback has one optional “Key takeaways” section between “This situation” and the opponent range. The evaluation’s `lessonNotes` contains the complete list for the learner’s decision; opponent ranges carry chart data only. Notes can explain the learner’s strategy, the range they face and a relevant future response, with future actions explicitly conditional. The 16 opening/limping follow-ups use edited decision-specific notes rather than concatenating the opponent’s opening-response and later-reraise lessons. All 53 current situations include takeaways. The five first-in decisions and two HJ-versus-LJ decisions each use one concise note, without repeating the displayed position, price, sizing or range totals.

The LJ-open-versus-HJ-3-bet lesson also includes opponent strategy notes paraphrased from “Hijack,” PDF pages 216–218, Hand Ranges 56–57. These explain HJ's roughly 8% 3-bet-or-fold strategy, occasional small pairs for board coverage and reduced blocker predictability, calling in position against a subsequent LJ 4-bet, and retaining strong hands such as AA in that calling range. The source's 38.3% fold / 43.3% call / 18.4% shove response is conditional on HJ having 3-bet and then facing a 4-bet; it is not a frequency over all starting hands or over only continuing hands. These insights appear in Key takeaways before HJ’s opponent chart, written from the learner’s perspective and with responses to a possible 4-bet explicitly conditional. The two HJ practice decisions have their own range-wide takeaways: small-pair board coverage and blocker variety against an open, and premium slowplays protecting calls against a 4-bet. Those insights appear even on pure folds. Their hand-specific explanations retain the current action, position and all-in commitment without repeating the broader takeaway. The 4-bet note follows Hand Range 57’s mixed QQ response rather than the prose’s generalization that all pairs below KK call.

After “This situation,” every follow-up lesson includes an “Opponent range” section showing the opponent's preceding open, raise, 3-bet or 4-bet against the learner's position and action. First-in lessons omit it. The server returns this data only with evaluation feedback; it does not affect dealing or grading.

Opponent ranges are derived at evaluation time from the shared catalog by conditioning on the action already taken and the learner's hole cards. For example, `BTN_RAISE_SB` uses the `raise` column of `SB_VS_BTN_OPEN`; `SB_LIMP_BB` uses the `raise` column of `BB_VS_SB_LIMP`. The complete facing-open and facing-limp charts are stored once, from the acting player's perspective, so they can also support lessons at those decisions. HJ versus an LJ open, CO versus LJ/HJ opens, BTN versus LJ/HJ/CO opens, SB versus LJ/HJ/CO/BTN opens, and BB versus all five opens or an SB limp are available for practice, together with their subsequent reraises. There is no separately stored opponent range. `LEARN_SITUATION_KEYS` in `learn-situations.js` defines the 53 available practice situations independently of the catalog; other chart keys are neither dealt nor accepted as lesson submissions.

The derived view keeps all 169 hand classes. Each entry contains `frequency` (the reference action frequency), `combinations` (available combinations after removing the learner's cards), `blockedCombinations` (combinations removed by those cards), and `probability` (percentage of the conditional range). `totalWeight` is the sum of available combinations multiplied by action frequency / 100. For the LJ, HJ, CO, BTN and SB 4-bet views, each entry also includes `openingFrequency`, and its weight is multiplied by opening frequency / 100. Each hand's probability is its weight divided by that total, multiplied by 100. Unrounded probabilities sum to 100%; zero-frequency hands have zero probability. For example, six combinations of AA raising 100% have three times the weight of four combinations of A5s raising 50%. The learner's blockers can change that ratio.

`learn-opponent-range.js` counts remaining pairs, suited hands and offsuit hands on the server. With no board and suit-symmetric reference charts, every concrete deal in a given hand class has identical remaining counts by hand class. Canonical representative suits therefore give the exact counts without adding suits to the stateless lesson identifier or trusting a new client input. All remaining hand classes together account for 1,225 possible opponent combinations from the 50 unknown cards. The model assumes the reference strategy and does not infer other players' folded cards or model their card-removal effects.

The opponent chart uses a red-to-green gradient for positive probabilities relative to the most likely hand in that chart: red means less likely and green means more likely. Zero-probability cells keep their neutral dark background so they remain distinct from rare hands. It is not a literal percentage-width action bar. Hovering, focusing or tapping a cell opens details with the hand probability (rounded to two decimal places), available combinations and action frequency. The combination count says “after removing your cards” only when the learner’s cards remove combinations of that hand. Popovers stay within the viewport, including inside the scrolling modal; Escape dismisses the hand details before closing the modal. Zero-probability cells retain the shared “Not in range” legend and the regular native “[hand]: Not in range” tooltip, without the probability breakdown. The learner's strategy chart continues to show action frequencies. Opponent bet totals follow the user's BB/currency preference.

The source section starts on PDF page 216. The full strategies below are extracted, retaining calls, checks and folds. The HJ, CO, BTN and SB facing-4-bet charts on pages 218, 220, 222, 225, 227, 229, 231, 233, 235 and 237 are also available for practice; the BB facing-4-bet charts on pages 240, 242, 244, 246 and 248, plus the limp-reraise chart on page 250, are also included:

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

Combination-weighted raise totals are checked within one percentage point of the source captions. The entire catalog is regenerated together. The Button addition corrects the missed 54s 3-bet against HJ as documented above; other existing per-hand frequencies remain unchanged. Opponent probabilities are computed from the catalog rather than stored separately.

Regeneration requires a local PDF and Python with `pymupdf` and `Pillow` installed:

```sh
python scripts/learn/extract-ranges.py /path/to/modern-poker-theory.pdf
npx prettier --write src/backend/learn-ranges.json
node --test test/backend/learn*.test.js
```

No source PDF or chart bitmap is included in the application. The displayed grid is rendered from the derived numbers. Explanations are original paraphrases of the position guidance and general heuristics (PDF pages 177–179); sizing is on PDF pages 180–181.

Action feedback requires inclusion of reference actions used at least 10% of the time and excludes actions absent from the reference. Frequency feedback allows a 15-percentage-point difference per action. Tiny chart actions can therefore be omitted without failing action selection. Exact mixes with the recommended sizing are graded correct. Mixes within tolerance and raise sizes within 1 BB of the recommendation are graded close; other strategies are graded incorrect. The sizing allowance is a teaching tolerance, not an EV estimate. Card feedback computes high-card count (ten or higher), pocket pairs, suitedness, and the number of five-rank straight patterns containing both hole-card ranks. Aces count high or low, never wrapping. These are descriptive features, not equity estimates or solver rationales, and do not affect grading. The range modal describes the players left to act and the actions recommended for the specific hand. `learn-explanations.js` composes position context and fold/call/check/raise reasons using every positive recommended frequency, including small mixes. It does not use the learner’s submitted actions to select guidance. Pure folds get only folding guidance; pure calls omit raise guidance. `learn-playability.js` includes pot odds only for recommended follow-up calls and sizing only for recommended raises. Mixed hands include the relevant reasons and a reminder to mix over repeated decisions. The range data and grading are unchanged. Source: “Main Variables that Affect Pre-flop Hand Ranges,” PDF pages 163–167.

## Domain types

`src/backend/learn-types.js` defines the JSDoc contracts shared by the lesson
backend and frontend. `HandClass` describes starting hands such as `AA`, `AKs`
and `AKo` using the existing deck `Rank` type; dealt cards use `Card` and `Suit`.
Actions, positions, situation/range keys and grades use literal unions. Situation
objects distinguish first-in decisions from decisions with an opponent, and
range maps are partial because later decisions omit unreachable hands.

Lesson calculations and submitted raise sizes use `BigBlinds`; scenario bets,
stacks and UI slider amounts use the existing `Cents` type. These number aliases
document units; they are not nominal types. HTTP submissions enter as `unknown`
and are narrowed by boundary validation. The frontend uses the same scenario,
submission and evaluation contracts through its request methods and rendering.

## Validation

Backend tests cover range totals, dealing, boundary validation and grading thresholds. Explanation tests check every hand in every range for action-specific guidance, conditional pot odds and sizing, all seven pure/mixed action combinations, and independence from the submitted answer. Focused examples check first-in folds, folding in and out of position, the SB limp discount, linear limp re-raises, call rationales with a separate price calculation, and 4-bets that reduce a positional disadvantage. Range comparisons verify the positional patterns. Range-wide takeaway and opponent-note content is also checked on the backend. Component tests cover mixed and pure strategies, BB and currency sizing, and retrying failed evaluations. A real-server smoke test exercises /learn, submission, Details, the next hand and invalid requests. The [UI catalog](../test/ui-catalog/README.md) renders independent examples of distinct visual states on desktop and mobile: action controls, sizing, loading/errors, feedback grades, full/conditional/check ranges, explanation lists and opponent tooltips. Positions, hands, calculations and explanation wording do not get separate screenshot cases.
