# Play vs bots (spec)

Status: draft spec, not implemented. The first step is a spike (see
[Spike](#spike)) that decides hosting and packaging.

`/learn` gains a second section next to the preflop drill: a six-handed cash
table where the learner plays against five bots whose decisions come from the
[noregrets](https://github.com/conorarmstrong/noregrets) engine, an MCCFR
blueprint in the style of Pluribus.

## MVP scope

The MVP is just playing. The learner opens the section, gets a private table
with five bots, and plays hands. There is no coaching, no feedback and no
record kept. Coaching ideas are listed in [TODO.md](../TODO.md).

## Good enough, not perfect

This is a platform for recreational players. The bots need to be solid and
believable opponents, not unbeatable ones. The MVP deliberately accepts weaker
bot play in exchange for simplicity and cheap hosting: blueprint-only
decisions, real session stacks and free bet sizing. The known weaknesses are
listed in [Accepted tradeoffs](#accepted-tradeoffs), together with how to
improve on them later. Bot quality improves inside the engine fork, behind
the same protocol, so the table code does not change when the bots get
better.

## Decisions

- **6-max, learner plus five bots.** This continues the six-handed preflop
  lessons and is the engine's main target. Multiway is also where the engine
  is weakest (see [Accepted tradeoffs](#accepted-tradeoffs)).
- **A private table only.** Nobody else can join, and bots never sit at
  normal cash games or tournaments. Rankings, history and the play index stay
  free of bot results.
- **Ephemeral, and no account needed.** The table runs under the usual guest
  session. No OHH file and no SQLite rows are written, so a guest who only
  played bots is still cleaned up like one who never played. The table ends
  when the learner disconnects or reloads, and a server restart ends it too.
- **The live game engine is reused, without persistence.** The table is a
  real in-memory cash game with the same WebSocket protocol and table UI.
  Betting, pots and showdown rules stay in one place. Bot seats are driven by
  the server when the action reaches them. The game needs a way to opt out of
  hand-history persistence and recovery, because otherwise history files are
  the system of record.
- **Real session stacks, with automatic rebuys to 100 BB.** Stacks carry over
  between hands. Anyone who busts, bot or learner, is rebought to 100 BB before
  the next hand.
- **Instant bots, and no action clock.** Bots act as soon as their decision
  is back. The learner has unlimited time. Amounts are shown in BB by default,
  as in the lessons.
- **Free bet sizing, with action translation.** The learner gets the same
  slider and presets as at live tables. Any amount that is not on the engine's
  bet menu is mapped onto the nearest menu sizes (pseudo-harmonic mapping)
  before the bots consult the blueprint.
- **Blueprint only, with no real-time search.** Decisions are table lookups:
  cheap enough for a small instance and fast enough for instant bots. The cost
  is weaker play off the menu and at stack depths other than 100 BB.
- **Labelled as bots, not "GTO".** Bots get generated pixel avatars and names
  with a visible bot badge. The UI calls the section something like "Play vs
  bots". The engine approximates equilibrium play, and its own results show it
  is exploitable multiway, so the UI makes no "GTO" claim.

## Engine integration

- **A fork with a JSON `serve` command.** Upstream noregrets is CLI-only, and
  its `play` command is an interactive terminal game. The public repository
  trails private development by about a year, and it does not accept pull
  requests. We fork it and add one long-lived command that loads the blueprint
  once and answers decision requests as JSON lines over stdin/stdout.
- **A child process, not an addon.** Node spawns the engine as a subprocess.
  The Node side needs no native build step, and an engine crash cannot take the
  game server down with it.
- **The server stays the authority.** Each request carries only what that bot
  may know: its own cards, the board, stacks, blinds and the hand's action
  sequence, normalized to big blinds. Translation of bet sizes and stacks
  happens in the fork, which knows the abstraction tree.
- **The engine returns a distribution, and Node samples it.** The engine
  answers with a mixed strategy, and the server picks an action with the
  game's seeded RNG. `RNG_SEED` therefore still makes e2e runs reproducible,
  and sampling sits next to the rest of the randomness.
- **One engine process for all tables.** Blueprint lookups are cheap, so one
  process takes requests in order. If profiling ever shows queueing, add a
  small pool.
- **The feature is hidden until the engine is ready.** Loading a
  multi-gigabyte blueprint takes time. Until the engine reports that it is
  healthy, the Learn entry is disabled with a notice. If the engine crashes
  mid-hand, the server restarts it, and the waiting bot checks if it can,
  otherwise folds.
- **Tests stop at the subprocess.** The engine process is the system edge.
  Unit and e2e tests use a fake engine that speaks the same protocol, and an
  optional contract test runs against the real binary when it is available.

## Spike

These questions must be answered before building, and the answers decide the
open items:

1. Build the fork for ARM64 (Graviton) and add the `serve` protocol.
2. Train a six-handed blueprint (about an hour on 16 cores for 200M
   iterations, on rented hardware) and record its file size.
3. Measure resident memory with the blueprint loaded normally and
   memory-mapped, plus load time and per-decision latency, on candidate
   Graviton instances. Production is a t4g.micro with 1 GB RAM, and the 200M
   blueprint is about 4.3 GB.
4. Check that the bots beat the engine's `caller` baseline. Watch for
   obviously absurd play at stack depths other than 100 BB and when facing
   off-menu sizes. The bar is "plausible to a recreational player", not
   solver precision.
5. Decide the instance type, and whether the cost justifies it. Otherwise,
   find the smallest abstraction that still plays well.
6. Decide packaging: where the fork lives, whether the Dockerfile gets a
   multi-stage Rust build, and where the blueprint is stored (it never goes
   in this repository).

## Accepted tradeoffs

These are known weaknesses that the MVP accepts. Each comes with the way to
improve on it later.

- **Engine strength.** The engine's own README reports a leak of about
  +900 mbb/hand in six-handed play with search on, and a loss to Slumbot
  heads-up. Blueprint-only play is weaker still. _Later:_ enable real-time
  search, and pull in upstream improvements as they are published.
- **Stack depths other than 100 BB.** Real session stacks drift away from the
  100 BB the blueprint was trained at, so deep or short stacks get
  approximate play. _Later:_ blueprints trained at more depths, search, or
  resetting stacks every hand if the drift turns out to matter.
- **Off-menu bet sizes.** Free sizing is translated onto the engine's menu,
  and without search an unusual size gets the strategy for a nearby size.
  _Later:_ a finer bet menu (`wide`, `pluribus-fine-pre`), better
  translation, or search.

## Risks

- **Licensing.** The code is MIT-licensed, but pretrained blueprints are
  commercial, so we must train and keep our own. Upstream improvements reach
  the public repository only after a delay of about a year.
- **Hosting cost.** The blueprint's memory footprint may force a
  several-times larger instance for a single feature.
