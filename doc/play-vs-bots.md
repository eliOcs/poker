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
decisions, a single 100 BB blueprint and free bet sizing. The known weaknesses are
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
- **Stacks are topped up to 100 BB every hand.** Before each hand, anyone
  below 100 BB, bot or learner, is refilled to 100 BB. Winners keep their
  deeper stacks, so nobody busts and no rebuy prompt is needed. A blueprint
  is solved for a single stack depth, which is baked into its game rather than
  stored in its keys. At another depth, the same action history means a
  different amount behind, so different play is correct. Topping up removes
  short stacks, the only depth with a measured cost (see
  [Findings](#findings-so-far)). Deep stacks are played as 100 BB and
  measured no cost. Multiple depths would need either one blueprint per
  depth, with memory adding up and the right one chosen per bot from its
  effective stack, or a depth-aware blueprint whose infosets multiply and
  get less training each. Both stay possible behind the same protocol if a
  short-stack mode is ever wanted.
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
  may know: its own cards, the board, starting stacks, the button and the
  hand's actions so far. Translation of bet sizes and stacks happens in the
  fork, which knows the abstraction tree.
- **Stateless requests.** Each request describes the whole hand so far, and
  the engine replays it from scratch. That costs a few dozen cheap steps. In
  return, the engine holds no per-table state, and a restart or crash loses
  nothing.
- **Bot tables play $0.50/$1.** The engine counts in chips at 50/100 blinds.
  At $0.50/$1, one cent is one chip, and 100 BB is exactly the engine's
  10,000-chip training stack. Amounts need no scaling, and the table shows
  BB anyway, so the stake is invisible to the learner.
- **Every stack depth is played as 100 BB.** The engine already follows a
  human's off-menu bets with an on-menu "shadow" hand, mapping each bet to
  the log-nearest menu size. The fork's shadow always starts every player at
  the 100 BB training depth, whatever the real stacks are, so lookups stay
  inside the trained tree:
  - Bot bet sizes are clamped to what the bot really has, so a short stack's
    large bet becomes its all-in.
  - A short stack's all-in maps to the nearest bet size rather than to a
    100 BB shove, so callers keep their shadow chips.
  - When the real hand skips an all-in player, the shadow checks or calls
    for them.
  - A deep stack that has committed 100 BB is _capped_. It is all-in in the
    shadow, so it checks or calls for the rest of the hand.
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

### Experiments

Ideas for an engine that is cheaper to run and good enough for recreational
play:

- **Training iterations.** Compare 10M, 30M and 100M iterations against a
  200M baseline: fallback rate, strength and memory. Measured up to 100M; see
  findings.
- **Fewer card buckets.** For example 8 instead of 12, which means fewer
  infosets.
- **Keep the compact `pluribus` bet menu.** It is the default, and the
  engine measured it as the least exploitable.
- **A compact serving format.** Quantize the exported action probabilities to
  8-bit integers, and store the strategies as one flat, sorted,
  memory-mapped file instead of a hash map of vectors. Per-entry overhead
  dominates today, so the layout matters more than the probability width.
  With memory mapping, only the pages actually used stay resident.
- **Precomputed card-bucket tables.** These avoid repeated equity
  calculations. The engine already has a `bucket-table` command for training.
  Check whether serving can use the table too. So far it is not needed for
  speed: a bucket miss costs a few milliseconds of Monte Carlo once, then is
  cached. The caches are bounded only by a 30M-entry cap, and river tables
  by the roughly 134k canonical boards. A long-running server should cap
  them lower, or memory-map the table like the strategies.
- **Configurable bot strength.** For example a temperature on the strategy
  mix, or blueprints with different numbers of iterations.

### Findings so far

These are from a development machine (12 x86 cores, 32 GB) and a 20M
iteration blueprint. ARM64 numbers are still to come.

- **Training is cheaper than the engine's logs suggested.** With a bucket
  table (215 s to build, 152 MB), 20M iterations took 34 s at 592k
  iterations/s. That produced 57.6M infosets and a 1.86 GB file, with a 13.8 GB
  training peak. The reference 200M run (128.5M infosets) probably needs more
  than 32 GB of RAM, so it needs rented hardware.
- **Memory is the binding constraint, and latency is not.** `serve` loads
  the 1.86 GB blueprint in 12 s into 4.5 GB of RSS, about 2.4 times the file
  size, because it is deserialized into a hash map. Decisions take 0.14 ms
  at p99, including the pipe round trip. Extrapolated, the 200M blueprint
  needs about 10 GB of RSS, which makes the compact serving format the main
  lever for hosting cost.
- **The compact format removes memory as a constraint.** `compact` exports
  the strategies sorted by infoset into blocks of 64 records:
  - Each key stores only the part that differs from the previous key.
  - Probabilities are quantized to bytes that sum to 255.
  - A dense index of each block's first key lets a lookup binary-search the
    blocks, then scan one.

  The 20M blueprint shrinks from a 1.86 GB file and 4.5 GB of RSS to a
  364 MB file, about 7.7 bytes per infoset, in 35 s. It is memory-mapped,
  so `serve` is ready at once with 12 MB resident.

  To simulate a small instance, `serve` ran in a container capped at 64 MB,
  with page cache included and the file evicted beforehand. 3,000 hands
  read in only about 55 MB of the file. Decisions took 0.09 ms at p50 and
  0.9 ms at p99, with a worst case of 16 ms on local NVMe. EBS reads are
  slower, but still far below what an instant bot can take.

  Quantization costs nothing measurable. Playing the compact bot against
  the hash-map version in paired matches gave −5 ±11 mbb/hand at 20M
  iterations and +3 ±9 at 100M.

  Keys sort by card bucket before history, so the preflop infosets that
  serve about 92% of decisions are scattered through the file. Putting the
  street first would group them, should the working set ever matter.

- **More iterations pay off, because serving size barely grows.** All runs
  used the same bucket table, on 12 cores, with training capped at 27 GB:

  | Iterations | train time | train peak | stored infosets | compact file | unseen flop/turn/river | vs a 100M field (mbb/hand) |
  | ---------- | ---------- | ---------- | --------------- | ------------ | ---------------------- | -------------------------- |
  | 10M        | 36 s       | 12.2 GB    | 34.4M           | 266 MB       | 15% / 47% / 85%        | −2407 ±78                  |
  | 20M        | 59 s       | 13.8 GB    | 47.3M           | 364 MB       | 6% / 26% / 57%         | −1730 ±74                  |
  | 30M        | 90 s       | 22.4 GB    | 54.8M           | 420 MB       | 5% / 16% / 41%         | −990 ±69                   |
  | 50M        | 159 s      | 23.8 GB    | 67.4M           | 515 MB       | 3% / 5% / 15%          | −607 ±66                   |
  | 100M       | 365 s      | 25.6 GB    | 84.1M           | 639 MB       | 0.7% / 1.7% / 3.9%     | (field)                    |

  Unseen rates come from 3,000 self-play hands at 100 BB. The last column
  plays each bot as hero in a field of the 100M bot, paired against the 100M
  bot in the same seat. A second 20M run with another seed scored −1590 ±73,
  so training luck moves results by about 150 mbb/hand.

  Ten times the iterations makes the served file only 2.4 times larger. The
  strength curve has not flattened by 50M, and the postflop fallbacks that
  make bots look passive nearly disappear by 100M. Serving cost therefore
  hardly limits training; the training machine does. The 100M peak of
  25.6 GB is the most a 32 GB machine can take, so 200M (the engine's
  reference run) needs rented hardware. The depth results above used 20M
  bots, so they compare undertrained bots with one another.

- **The shadow must always be 100 BB deep.** The first fork kept each
  shadow stack at the real depth, capped at 100 BB. In self-play,
  check/call fallbacks then reached 74–99% postflop at 40, 150 and 250 BB.
  At 100 BB they were 9–42%. Short stacks shrank the bet menu, so stored
  strategies no longer matched it. Deep stacks diverged from the shadow once
  100 BB was in, and every later lookup missed. Both cases turned the bots
  into calling stations. With the 100 BB shadow above, 40 BB and 80 BB look
  like 100 BB: postflop misses of 6–74% that come from undertraining, and no
  capping. Deeper stacks are capped in the pots where 100 BB went in
  preflop. At 100 BB those hands end all-in, so this adds no new weak spots.
- **Playing 100 BB strategy at other depths costs something below 100 BB,
  and nothing measurable above.** `depth-match` plays one bot that uses the
  100 BB tree against bots trained natively at the table's depth (20M
  iterations each). Every deal is played twice, with the same cards and the
  native bot in the hero seat the second time, so card luck cancels.

  | Table depth | 100 BB tree vs native bots (mbb/hand, 2M hands) |
  | ----------- | ----------------------------------------------- |
  | 40 BB       | −263 ±40                                        |
  | 80 BB       | −595 ±79                                        |
  | 200 BB      | +306 ±184 (17% of decisions capped)             |

  A control puts a second 100 BB blueprint, trained with another seed, in
  the original's field at 100 BB: +155 ±94. Training luck alone therefore
  moves results by about 150 mbb/hand, and the table reads qualitatively.
  Short stacks cost 0.25–0.6 BB per hand against bots that know the depth.
  It is unexplained why 80 BB costs more than 40 BB. Deep stacks cost
  nothing measurable: the native 200 BB blueprint has a bigger tree, so the
  same 20M iterations leave it less trained. These are bot-against-bot
  edges, far smaller than what a recreational player typically leaks.

- **Card bucketing is deterministic.** It is seeded from the cards, not the
  caller, so the same state always gets the same strategy. That makes
  Node-side sampling the only randomness, as the design requires.

## Accepted tradeoffs

These are known weaknesses that the MVP accepts. Each comes with the way to
improve on it later.

- **Engine strength.** The engine's own README reports a leak of about
  +900 mbb/hand in six-handed play with search on, and a loss to Slumbot
  heads-up. Blueprint-only play is weaker still. _Later:_ enable real-time
  search, and pull in upstream improvements as they are published. GPU
  training could make bigger abstractions affordable: GPU-CFR
  ([arXiv:2609.11923](https://arxiv.org/abs/2609.11923)) compiles the game
  into static dataflow and replays each CFR iteration as a CUDA graph. It
  reports speedups of 30–80 times over earlier GPU CFR, and even its CPU
  version is faster. Its approach targets full-width CFR, so adapting this
  engine's sampled MCCFR, which keeps its tables in a hash map, would be a
  redesign rather than a port. No code is published.
- **Deep stacks.** Top-ups keep every stack at 100 BB or more, and deeper
  stacks are played as if 100 BB deep. A bot never puts more than 100 BB into
  a hand by choice. Past that it checks and calls, which a human can value-bet
  against. _Later:_ a deeper blueprint, chosen by effective stack, or search.
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
