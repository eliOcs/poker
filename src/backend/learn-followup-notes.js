// Modern Poker Theory, PDF pages 181–207 and 216–250.
// Decision-wide insights from the learner’s perspective. Future responses are
// conditional, not descriptions of the action the opponent has already taken.
/** @satisfies {Partial<Record<import("./learn-types.js").SituationKey, import("./learn-types.js").LearnNote[]>>} */
export const FOLLOWUP_NOTES = {
  SB_LIMP_BB: [
    {
      title: "A raise does not mean BB has a premium",
      text: "After your limp, BB can check and see a free flop in position. Its raising range instead combines strong hands with selected hands that can raise and fold. Do not treat every raise as strength or assume that every medium-strength hand raises.",
    },
    {
      title: "Plan for resistance to your limp-reraise",
      text: "If you reraise, BB can use position to call with playable hands. The source folds about 51.4%, calls 41.3% and 4-bets 7.3% of BB’s prior raising range. That narrow 4-bet range includes strong hands and selected ace or king blockers; your reraise does not always end the hand.",
    },
  ],
  SB_RAISE_BB: [
    {
      title: "BB’s 3-bets mix strength and bluffs",
      text: "BB has position on you and can call with medium-strength hands, leaving its 3-bets more polarized: strong hands plus selected blocker and board-coverage bluffs. Your own medium-strength hands often prefer calling rather than 4-betting and facing an all-in.",
    },
    {
      title: "A call to your 4-bet can conceal aces",
      text: "If you 4-bet, BB calls AA every time in this reference and often calls KK and AKs too. BB folds the bottom of its polarized 3-bet range and continues mainly through calls in position. A call would not mean you can rule out premiums.",
    },
  ],
  BTN_RAISE_SB: [
    {
      title: "SB attacks your wide opening range",
      text: "Against your BTN open, SB 3-bets about 15% of starting hands and has no flat-calling range in this reference. This is its widest defense against an open, including selected offsuit broadways, suited aces and connectors.",
    },
    {
      title: "If you 4-bet, SB can slowplay AA",
      text: "If you 4-bet, SB calls AA 100% in this reference to protect a broad calling range. KK, QQ and AK shove, while other hands mix calls and shoves. Your 4-bet therefore does not simply separate strong shoves from weak calls.",
    },
  ],
  BTN_RAISE_BB: [
    {
      title: "BB’s 3-bets emphasize high-equity hands",
      text: "Against your wide BTN open, BB uses a more linear 3-bet range built around high-equity hands, alongside a broad calling range. Its extra aggression does not consist only of weak bluffs.",
    },
    {
      title: "If you 4-bet, expect calls as well as shoves",
      text: "If you 4-bet, BB continues mainly by calling against your polarized range. Those calls can include AA and hands with useful postflop playability. Its shoves include strong pairs, ace-king and selected wheel-ace bluffs, so neither response identifies one exact kind of hand.",
    },
  ],
  CO_RAISE_BTN: [
    {
      title: "BTN can call, making its 3-bets more polarized",
      text: "BTN has position on you and can flat-call with playable hands, including some strong hands that protect those calls against squeezes. Its 3-bets mix strength with selected bluffs.",
    },
    {
      title: "If you 4-bet, BTN keeps AA among its calls",
      text: "If you 4-bet, BTN calls AA every time in this reference, while QQ, JJ and AKo often shove or mix. Calls with hands such as AQo, QJs, JTs and K9s sit alongside those premiums. A call would leave BTN with position and a range that can still be very strong.",
    },
  ],
  CO_RAISE_SB: [
    {
      title: "SB’s range widens against CO",
      text: "SB uses 3-bet or fold, entering about 10.9% of starting hands against your CO open. Compared with an HJ open, AJo, A8s and T9s gain frequency.",
    },
    {
      title: "If you 4-bet, SB has calls and some bluff shoves",
      text: "If you 4-bet, SB keeps AA among its calls and can also call with AQo, A3s and JTs. Selected ATs and A5s shoves appear against your more polarized 4-bet range. Neither a call nor a shove is limited to one hand-strength category.",
    },
  ],
  CO_RAISE_BB: [
    {
      title: "BB widens selectively against your open",
      text: "Against CO, BB expands both calls and 3-bets compared with earlier openers, but weak disconnected offsuit hands still struggle out of position. Its 3-bet range is a selected part of that defense, not every hand it can profitably play.",
    },
    {
      title: "If you 4-bet, BB protects its calls",
      text: "If you 4-bet, BB responds to your more polarized range by calling more and keeping AA among its calls more often than against earlier openers. Hands such as KQs, AQo and suited aces also gain calls. Do not interpret a call as a weak range with no premiums.",
    },
  ],
  HJ_RAISE_CO: [
    {
      title: "CO uses 3-bet or fold against your open",
      text: "CO has no flat-calling range here and 3-bets about 9.9% of starting hands, compared with 8.6% against LJ. Your wider opening range allows selected additions such as A9s, QTs and JTs. You are out of position against CO and cannot defend as freely by calling as against the blinds.",
    },
    {
      title: "If you 4-bet, CO can continue in position",
      text: "If you 4-bet, CO supports its wider 3-bet range with additional calls, including KJs and some ATs and KTs. Most continuing hands call, and premiums can remain among them.",
    },
  ],
  HJ_RAISE_BTN: [
    {
      title: "BTN’s calling range changes its 3-bets",
      text: "BTN can flat-call with playable hands and protected premiums, so its 3-bets are more polarized than CO’s. That lets more of your opening range call profitably against BTN than against CO, even though you remain out of position. Selected QJo and ATo mixes add high-card blockers to BTN’s 3-bets.",
    },
    {
      title: "If you 4-bet, BTN still has a calling range",
      text: "If you 4-bet, BTN calls with hands such as AQo, KTs, QJs, JTs and suited wheel aces alongside stronger slowplays. Even a hand that always calls at that point can be rare overall: BTN only 3-bets 54s about 4% of the time in the source. Read the opponent chart as a distribution, not a list of equally likely hands.",
    },
  ],
  HJ_RAISE_SB: [
    {
      title: "SB adds selected hands against HJ",
      text: "SB uses 3-bet or fold against your open, widening from about 7.3% against LJ to 8.7% against HJ. A9s, KQo, K9s and J9s enter or gain frequency.",
    },
    {
      title: "If you 4-bet, SB must defend its wider range",
      text: "If you 4-bet, SB adds some AQo calls and more KQs, KJs and KTs calls compared with its response against LJ. Strong slowplays protect those calls even though SB acts first postflop. A wider 3-bet range does not mean all its extra hands fold to your next raise.",
    },
  ],
  HJ_RAISE_BB: [
    {
      title: "BB’s defense expands only a little from LJ",
      text: "Against HJ, BB 3-bets about 7.6% of starting hands and calls 23.9%, often by increasing frequencies near the edge of its LJ defense. The blind discount and closing the action support calls, but its 3-bet is still a selective action.",
    },
    {
      title: "If you 4-bet, look at the overall defense",
      text: "If you 4-bet, BB supports its wider 3-bet range with additional calls such as KJs and KTs. The chart also mixes JJ shoves while QQ calls; the source treats such small irregularities as possible blocker effects rather than rules to memorize.",
    },
  ],
  LJ_RAISE_HJ: [
    {
      title: "HJ’s tight range still includes small pairs",
      text: "Against your LJ open, HJ 3-bets about 8% of starting hands. There is no calling range in this reference. Occasional pairs from 88 down to 22 give HJ set potential across different flops and make your blockers less effective at narrowing its range; its 3-bets are not exclusively big cards.",
    },
    {
      title: "If you 4-bet, HJ can call with premiums",
      text: "If you 4-bet, HJ uses position to call with most of its continuing range. The source response is 38.3% fold, 43.3% call and 18.4% shove over the hands that already 3-bet. HJ calls AA about half the time, protecting calls with other pairs, suited broadways and selected suited connectors or wheel aces.",
    },
  ],
  LJ_RAISE_CO: [
    {
      title: "One fewer player makes CO only slightly wider",
      text: "Against your tight LJ open, CO 3-bets about 8.6% of starting hands versus HJ’s 8.1%, still with no flat calls. Removing one player behind it allows only a small expansion. You are out of position against a selective range, so do not treat this like defending a late-position open.",
    },
    {
      title: "If you 4-bet, CO need not shove every premium",
      text: "If you 4-bet, CO always shoves KK and AKs in the reference, but mostly calls QQ and calls AA roughly half the time. AKo mixes calls and shoves, while some suited wheel aces call. Position lets CO keep a substantial calling range that remains protected by strong hands.",
    },
  ],
  LJ_RAISE_BTN: [
    {
      title: "BTN’s 3-bets differ from its calls",
      text: "BTN has guaranteed postflop position and a flat-calling range, leaving its 3-bets more polarized than those from HJ or CO. Some strong hands remain in its calls to withstand blind squeezes. This range structure lets more of your opening hands call a BTN 3-bet than an HJ or CO 3-bet.",
    },
    {
      title: "If you 4-bet, BTN’s shove range stays narrow",
      text: "If you 4-bet, BTN always shoves KK and AKs in the reference, while AA and AKo mix and QQ mostly calls. Most continuing hands take a flop in position. A call would not rule out AA, and small unusual mixes should not outweigh the overall range structure.",
    },
  ],
  LJ_RAISE_SB: [
    {
      title: "The blind discount does not give SB a calling range",
      text: "SB uses 3-bet or fold against your LJ open, entering about 7.3% of starting hands. Flat-calling would leave BB active and SB out of position under the book’s raked cash-game assumptions.",
    },
    {
      title: "If you 4-bet, lower cards can still call",
      text: "If you 4-bet, SB can call with medium pairs and small suited connectors because they leave your possible bluffs available and retain postflop potential. Strong slowplays protect those calls, while AKs shoves and AA and AKo mix. Raw high-card strength alone does not tell you which hands continue.",
    },
  ],
  LJ_RAISE_BB: [
    {
      title: "BB must respect your tight opening range",
      text: "The blind discount and closing the action let BB call some hands, but your strong LJ range limits speculative calls and 3-bet bluffs. Offsuit AQ–AT favor calls; suited broadways, aces and connected hands make better aggressive candidates.",
    },
    {
      title: "If you 4-bet, premiums can call or shove",
      text: "If you 4-bet, BB shoves AKs while AA, KK, AKo and QQ mix calls with shoves. Some A5s bluff shoves accompany the strong hands. Calls also use pairs, suited aces and connected hands, so neither calling nor shoving reveals a single hand-strength category.",
    },
  ],
};
