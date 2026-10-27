# Play vs bots (spec)

Status: the MVP is built. The spike (see [Spike](#spike)) settled hosting,
packaging and bot quality. How the code is organized is in the
[backend README](../src/backend/README.md#bot-tables).

`/learn/bots` is the second training mode on `/learn`, next to the preflop
trainer: a six-handed cash table where the learner plays against five bots whose
decisions come from the [noregrets](https://github.com/conorarmstrong/noregrets)
engine, an MCCFR blueprint in the style of Pluribus.

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
  played bots is still cleaned up like one who never played. The table
  survives a dropped connection or a reload, so a flaky mobile network does
  not end a hand. A disconnected learner is sat out at the next hand, which
  pauses the table, and the idle table is evicted like any game. Leaving, a
  server restart or opening a new table ends it. There is no sitting out:
  with no action clock, the learner can take any time they need, so the
  table menu offers leaving instead.
- **The live game engine is reused, without persistence.** The table is a
  real in-memory cash game with the same WebSocket protocol and table UI.
  Betting, pots and showdown rules stay in one place. Bot seats are driven by
  the server when the action reaches them. The game needs a way to opt out of
  hand-history persistence and recovery, because otherwise history files are
  the system of record.
- **Every stack is reset to 100 BB every hand.** Before each hand, every
  stack, bot or learner, goes back to 100 BB, so nobody busts and no rebuy
  prompt is needed. A blueprint is solved for a single stack depth, which is
  baked into its game rather than stored in its keys. At another depth, the
  same action history means a different amount behind, so different play is
  correct. Short stacks have a measured cost (see
  [Findings](#findings-so-far)). Deep stacks measured none, but they look
  broken: the first build let winners keep their chips, and a bot at 103 BB
  "shoved" by raising to 100 BB and keeping 3 BB behind, then could only check
  or call. The learner's winnings carry no weight at a private practice table,
  so resetting costs nothing. Multiple depths would need either one blueprint per
  depth, with memory adding up and the right one chosen per bot from its
  effective stack, or a depth-aware blueprint whose infosets multiply and
  get less training each. Both stay possible behind the same protocol if a
  short-stack mode is ever wanted.
- **Instant bots, and no action clock.** Bots act as soon as their decision
  is back. The learner has unlimited time. Amounts are shown in BB by default,
  as in the lessons.
- **Free bet sizing, with action translation.** The learner gets the same
  slider and presets as at live tables. Any amount that is not on the engine's
  bet menu is mapped onto the log-nearest menu size before the bots consult
  the blueprint. Randomized (pseudo-harmonic) mapping would be harder to
  exploit, but it would need a seed in every request, and arbitrary sizes
  measured as costing the human rather than the bots (see
  [Findings](#findings-so-far)).
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
- **A child process, not an addon or a separate service.** Node spawns the
  engine as a subprocess. The Node side needs no native build step, and an
  engine crash cannot take the game server down with it. A separate container
  (a Kamal accessory) would add a network protocol, supervision outside the
  app and a second deploy procedure, for no extra isolation. The engine does
  restart on every app deploy, but that is free: the memory-mapped blueprint
  is ready at once, its pages stay in the kernel's page cache, and requests
  are stateless. A service pays off only if the engine ever needs its own
  machine, for example for real-time search. The line-based protocol can then
  move behind a socket.
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
- **No table until the engine is ready.** Until the engine reports that it
  is healthy, opening a table shows a notice instead. A drawer entry that
  stays visible keeps the client simple, and the memory-mapped blueprint is
  ready at once anyway. If the engine crashes mid-hand, the server restarts
  it, and the waiting bot checks if it can, otherwise folds.
- **The fork is a public GitHub repository under `eliOcs`.** MIT allows it,
  and a public repository needs no tokens to fetch and gets free ARM64 CI
  runners. Vendoring Rust into this repository would bring in a toolchain.
- **The fork's CI builds a static binary, and the Dockerfile downloads it.**
  A tagged release in the fork builds an ARM64 binary for the musl target
  inside `rust:alpine`. Statically linked musl has no runtime dependencies,
  so it runs in `node:24-alpine` or any other image, and no libc version can
  mismatch. The Dockerfile pins it with `ADD --checksum`. A multi-stage Rust
  build here would run under QEMU, because deploys build ARM64 on x86, and
  an LTO build under emulation takes tens of minutes on every cache miss. An
  x86_64 binary in the same release serves local development.
- **The blueprint lives on the data volume.** It is about 1 GB, too big for
  the image and never in this repository. Each blueprint has its own file
  name under `/opt/poker/data/engine/`, an env var in `config/deploy.yml`
  selects one, and a script uploads new ones with rsync. A deploy can switch
  blueprints and a rollback can switch back. The weekly snapshots back it up,
  and it survives instance replacement. The volume grows from 5 to 10 GB, so
  that two blueprints fit next to the data during a swap. Blueprints change
  rarely, so S3 is not needed until training is automated. The compact
  format carries a version header that `serve` checks at startup. A binary
  and blueprint that do not match never report healthy, so the feature stays
  hidden.
- **Tests stop at the subprocess.** The engine process is the system edge.
  Unit and e2e tests use a fake engine that speaks the same protocol, and an
  optional contract test runs against the real binary when it is available.

## Spike

These questions had to be answered before building. The answers are in
[Findings](#findings-so-far).

1. Build the fork for ARM64 (Graviton) and add the `serve` protocol.
   _Done._
2. Train a six-handed blueprint and record its size. _Done, up to 800M
   iterations._
3. Measure memory, load time and per-decision latency on Graviton. _Done._
4. Check play quality, including stack depths other than 100 BB and
   off-menu sizes. The bar is "plausible to a recreational player", not
   solver precision. _Done with paired matches between blueprints,
   `offmenu-match` for off-menu sizes, best-response probes, scripted
   opponents that play like human leaks, and a comparison with the lesson
   charts._
5. Decide the instance type. _The current t4g.micro serves even the 800M
   blueprint, so no upgrade is needed._
6. Decide packaging: where the fork lives, whether the Dockerfile gets a
   multi-stage Rust build, and where the blueprint is stored (it never goes
   in this repository). _Decided; see
   [Engine integration](#engine-integration)._

### Experiments

Ideas for an engine that is cheaper to run and good enough for recreational
play:

- **Training iterations.** Compare iteration counts by fallback rate,
  strength and memory. Measured from 10M to 800M; see findings.
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
  Serving does not need it: lazy bucketing now computes exactly the
  table's values (see findings), and it is fast enough. A bucket miss costs
  a few milliseconds of Monte Carlo once, then is cached. The caches are bounded only by a 30M-entry cap, and river tables
  by the roughly 134k canonical boards. A long-running server should cap
  them lower, or memory-map the table like the strategies.
- **Configurable bot strength.** For example a temperature on the strategy
  mix, or blueprints with different numbers of iterations.

### Findings so far

Most early findings come from a development machine (12 x86 cores, 32 GB)
and a 20M iteration blueprint. Training from 200M up ran on an m7g.8xlarge
(32 Graviton cores, 128 GB). Hosting was measured on a t4g.micro like
production's.

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
  reference run) needs rented hardware. The depth results below used 20M
  bots, so they compare undertrained bots with one another.

- **On Graviton, strength keeps improving up to 800M, while size levels
  off.**

  | Iterations | train time (32 cores) | train peak | stored infosets | compact file | vs an 800M field (mbb/hand, 4M hands) |
  | ---------- | --------------------- | ---------- | --------------- | ------------ | ------------------------------------- |
  | 100M       | (on x86)              | 25.6 GB    | 84.1M           | 639 MB       | −811 ±28                              |
  | 200M       | 11 min                | 42.3 GB    | 99.4M           | 754 MB       | −424 ±25                              |
  | 400M       | 28 min                | 44.4 GB    | 118.5M          | 896 MB       | −166 ±22                              |
  | 800M       | 66 min                | 46.9 GB    | 140.3M          | 1,056 MB     | (field)                               |

  A second 200M run with another seed scored −461 ±25. At this depth of
  training, luck moves results by only about 40 mbb/hand, against about 150
  at 20M, so the gaps above are real.

  Each doubling of iterations still more than halves the gap to 800M. At
  400M and up, check/call fallbacks are below 0.5% on every street. The
  better-trained bots also see more flops: they shove preflop less often.
  The 800M run cost about $1.70 of compute, and the whole Graviton session
  about $4. Quantization still costs
  nothing measurable at 800M: 0 ±4 mbb/hand.

- **Bucketing is identical on x86 and ARM64.** A bucket table rebuilt on
  Graviton has the same configuration, centroids and all 15,246,842
  buckets as the x86 one; only the order of entries differs. Blueprints and
  tables are portable between architectures. The engine builds on ARM64 in
  under a minute, and its tests pass there.

- **The current t4g.micro can host the bots, and the blueprint lives on
  disk.** The micro (1 GB, EBS gp3) ran `serve` next to a process holding
  550 MB, about production's peak memory use (40% on average, 58% at peak
  over a week). Page caches were dropped before each run. `serve` itself
  used 6–10 MB of anonymous memory, even after 30,000 hands with mixed
  stack depths. The rest is page cache, which the kernel evicts first under
  memory pressure.

  | Blueprint | beside 550 MB: p50 / p99 / max | `serve` capped at 48 MB: p50 / p99 / max |
  | --------- | ------------------------------ | ---------------------------------------- |
  | 100M      | 0.08 / 2.4 / 16.5 ms           |                                          |
  | 400M      | 0.08 / 2.4 / 17.9 ms           | 0.31 / 5.0 / 17.7 ms                     |
  | 800M      | 0.08 / 2.5 / 18.6 ms           | 0.30 / 5.3 / 18.9 ms                     |

  The 48 MB cap includes page cache, so most lookups read from EBS: at
  worst a few pages of the index and one block. Bots may take up to a
  second to decide, so this leaves headroom for blueprints far larger than
  RAM. Serving size is now bounded by disk, at about $0.08 per GB-month.
  Training cost and returns in strength bound it instead. That reopens
  richer abstractions (finer bet menus for human off-menu sizes, more card
  buckets) and blueprints for several stack depths. If lookups ever need to
  be faster, loading the 24 MB block index into RAM would cap them at one
  disk read.

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

- **Serving bucketed differently from training until fixed.** The bucket
  table that training uses holds one value per suit-isomorphic class,
  computed from its canonical representative. Without the table, as in
  `serve`, a cache miss ran the Monte Carlo on whichever suit variant
  arrived first, seeded from the canonical key, and stored that for the
  whole class. `bucket-check` found 12.4% of flop hands and 7.5% of turn
  hands in a different bucket from training. Which variant came first also
  depended on thread timing and on earlier requests. The fork now runs the
  Monte Carlo on the representative, which matches the table on every hand
  checked and makes bucketing deterministic. The same state always gets the
  same strategy, so Node-side sampling is the only randomness, as the design
  requires. The matches above ran before the fix. Every side of a pairing
  shared the skew, so the comparisons stand, but all the bots will play
  slightly better than measured.

- **Off-menu bet sizes cost the bots little.** `offmenu-match` lets one
  seat play the 800M blueprint but resize every bet it makes, against a
  field of the same blueprint that translates sizes to the log-nearest menu
  size. Every deal is played twice with the same cards, once resized and
  once on the menu.

  | Resizing (4M hands)                           | gain for the resizer (mbb/hand) |
  | --------------------------------------------- | ------------------------------- |
  | Largest amount that still maps to the size    | −97 ±6                          |
  | Smallest amount that still maps to the size   | +43 ±1                          |
  | Log-uniform between the two (arbitrary sizes) | −13 ±4                          |
  | Every bet a min-raise                         | +59 ±13                         |

  Arbitrary sizes cost the human, not the bots. Betting just under a menu
  size, or min-betting, wins 0.04–0.06 BB per hand, because the bots treat
  the bet as larger and fold a little too often. That is about the gap
  between two 800M training runs and a fraction of a recreational player's
  leaks. The resizer also mistranslates its own bets, so a deliberate
  exploiter could win somewhat more.

- **The bots are far less exploitable than folding every hand.** No
  strategy can be proven correct here, so the evidence is a lower bound on
  exploitability. `lbr` and `br` play an opponent that knows the bot's exact
  strategy and picks the most profitable reply, heads-up between the blinds
  of the six-handed game, with the bot's own bet sizes plus all-in. At 800M
  iterations `br` wins +387 ±118 mbb/hand over 100k hands, and `lbr` +75
  ±266 over 20k. Folding every hand loses 750. For scale, the strongest
  abstraction-based bots of 2016 (Act1, Slumbot, Hyperborean) lost
  2,597–4,020 mbb/hand to a comparable probe, and DeepStack, which searches in
  real time, could not be exploited at all
  ([Lisý and Bowling 2017](https://arxiv.org/abs/1612.07547),
  [DeepStack](https://arxiv.org/abs/1701.01724)). Those were heads-up at
  200 BB, where exploits pay more, and they faced off-menu sizes too, so
  the comparison places the bots in a league rather than ranking them.

- **The bots beat every simple exploit.** `eval --duplicate` seats the bot
  against five scripted opponents and plays every deal from each seat, so
  card luck cancels (1M hands each, mbb/hand):

  | Opponents                        | bot's winrate |
  | -------------------------------- | ------------- |
  | Calling station                  | +3,356 ±143   |
  | Maniac, always the largest raise | +3,235 ±196   |
  | Shover, always all-in            | +3,340 ±165   |
  | Push-fold with the top 20%       | +243 ±55      |
  | Nit playing the top 6%           | +228 ±25      |

  The exploits a curious human tries first are punished hardest. Push-fold
  players and nits fold most hands, so less is there to win, but
  23–24 BB/100 is still a very large winrate; a strong human regular wins about 5.

- **Preflop the bots play a different style from the lesson charts.** The
  55 charts from _Modern Poker Theory_ were compared with the blueprint's
  preflop strategy through `serve`, using the histories the lessons replay.
  Range sizes are close (LJ opens 17% in both, BTN 40% against 43%), and no
  lookup fell back to check/call. But the bots limp strong hands from early
  position (AA 29%, 88 48% from LJ), mix four open sizes, and play the
  rarely reached 4-bet spots erratically. Only 1–38% of hands would pass
  the lessons' own grading, depending on the spot. More training improves
  everything except the limping, and dropping actions below 10% removes
  most of the small noise. This is not a verdict on quality: the charts
  come from a different solver that assumed rake, and preflop ranges only
  make sense together with the postflop play that follows them, so a book
  preflop grafted onto blueprint postflop would not be a fair opponent
  either.

- **Playing the real engine found a betting bug in every game.** A contract
  run played 1,000 hands against the 800M blueprint, with a learner acting at
  random. The engine rejected requests after an all-in that was too small to
  count as a full raise. When action came back round to the previous
  raiser, the table closed the betting round, although that player still
  owed the difference. The engine was right. With the fix, the same run made
  7,672 decisions without an error. About 13% of lookups were capped,
  because the random learner gives its chips away and the bots get deep.

## Accepted tradeoffs

These are known weaknesses that the MVP accepts. Each comes with the way to
improve on it later.

- **Engine strength.** The bots are exploitable, by at least +387 mbb/hand
  between the blinds (see [Findings](#findings-so-far)), though far less
  than folding every hand. _Later:_ enable real-time
  search, and pull in upstream improvements as they are published. GPU
  training could make bigger abstractions affordable: GPU-CFR
  ([arXiv:2609.11923](https://arxiv.org/abs/2609.11923)) compiles the game
  into static dataflow and replays each CFR iteration as a CUDA graph. It
  reports speedups of 30–80 times over earlier GPU CFR, and even its CPU
  version is faster. Its approach targets full-width CFR, so adapting this
  engine's sampled MCCFR, which keeps its tables in a hash map, would be a
  redesign rather than a port. No code is published.
- **Bots and lessons teach different preflop styles.** A learner may see a
  bot limp aces from early position, which the preflop drill never does.
  _Later:_ drop low-probability actions if paired matches show it costs no
  strength, or average the preflop strategy over late iterations only, as
  the postflop already is.
- **Off-menu bet sizes.** Free sizing is translated onto the engine's menu,
  and without search an unusual size gets the strategy for a nearby size.
  Small bets just under a menu size win about 0.05 BB per hand against the
  bots. _Later:_ a finer bet menu (`wide`, `pluribus-fine-pre`), randomized
  translation, or search.

## Risks

- **Licensing.** The code is MIT-licensed, but pretrained blueprints are
  commercial, so we must train and keep our own. Upstream improvements reach
  the public repository only after a delay of about a year.
- **Hosting cost.** _Resolved._ The memory-mapped compact format runs on the
  current t4g.micro, next to the app. It shares the instance's memory, so
  the app's growth eats into the blueprint's page cache. That costs latency
  rather than failing, and latency has ample headroom.
