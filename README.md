# Pluton Poker

Texas Hold'em for home games, played in the browser in real time: cash games,
Sit & Go and multi-table tournaments, hand histories and replays, pixel-art
avatars, and a preflop trainer. Live at [plutonpoker.com](https://plutonpoker.com).

This README is the entry point for humans and AI agents alike. Documentation
explains the architecture and the reasons behind it; for specifics, read the
code. Each area has its own README next to its code (see
[Where things live](#where-things-live)).

## Quick start

Requires Node.js 24+ and Git LFS (UI catalog baselines are LFS files).

```bash
npm install            # also points Git at the shared hooks in .githooks/
cp .env.example .env
npm start              # http://localhost:3000, restarts on backend changes
```

Locally, sign-in emails are written to `EMAIL_SINK_DIR` as JSON files instead
of being sent through AWS SES. To play against bots, keep the server running,
run `npm run test:game` (`-- --help` lists table size and bot count) and open
the printed URL.

## Principles

- **Backend authority.** Every rule, timer and shuffle runs on the server. The
  browser sends intents and renders the view it receives. Clients never
  receive information they should not see, such as opponents' cards, so they
  cannot cheat by inspecting it, and the rules are testable without a browser.
- **Single instance, vertical scaling.** One Node process keeps all live games
  in memory and stores data in SQLite and files on the instance disk. A
  home-game site does not need a second machine. Without distributed state,
  whole classes of bugs and operational work never come up. Scale the machine
  up, not out.
- **No build step, few dependencies.** Plain ES modules run as written in Node
  and in the browser, where Lit is loaded through an import map. Native APIs
  come first (`node:test`, `node:sqlite`, `crypto`). The code you read is the
  code that runs, with no toolchain in between. Only current Node and evergreen
  browsers are supported, so there are no polyfills.
- **Types without compilation.** JavaScript is annotated with JSDoc and checked
  by TypeScript. Model the domain so that illegal states are unrepresentable;
  see [Domain types](doc/domain-types.md).
- **Validate at boundaries, trust internally.** HTTP bodies, WebSocket
  messages, files and database rows are validated where they enter. Inside,
  static analysis carries the guarantees, so values are not re-checked.
  Invalid internal state fails loudly instead of being silently ignored
  ([review rule](scripts/review/rules.md)).
- **Data and functions over classes.** State is plain objects, behavior is
  functions over them, and mutations happen in few places. Composition beats
  conditionals.
- **Open record formats.** Hands are stored as
  [Open Hand History](https://hh-specs.handhistory.org/) and tournaments as
  [Open Tournament Summary](https://ts-specs.handhistory.org/), so the records
  work with other poker tools and outlive this code.
- **Money is integer cents.** Amounts are integers (`Cents`) to avoid
  floating-point rounding in pots and splits. Conversion to dollars happens
  only at the edges: UI formatting and the OHH/OTS files.
- **Test behavior, not implementation.** Mock only at system edges. A refactor
  that breaks tests without changing behavior shows the tests were wrong. See
  [test/README.md](test/README.md).
- **Pragmatic over perfect.** The simplest thing that works. Complexity costs
  more than hardware.

## Architecture

```
Browser: Lit single-page app (src/frontend)
   │  HTTP: pages, assets, JSON APIs (sessions, settings, history, lessons)
   │  WebSocket: player intents up, per-player state down
   ▼
Node process (src/backend)
   ├── in memory: live games and tournaments, cached users, sign-in tokens
   ├── data/poker.db (SQLite): users and an index of who played where
   └── data/*.ohh, data/*.ots: hand histories and tournament summaries
```

A player action travels over the WebSocket. The server validates it, mutates
the game, builds a separate view for every connected player, and pushes those
views. A one-second server tick drives everything time-based: action clocks,
countdowns, blind levels and runouts. The browser holds no game logic beyond
presentation, which is why reconnecting or reloading always shows the correct
state.

Hand history files are the system of record for play. SQLite holds accounts
and lookup indices. Idle games are evicted from memory. After an eviction or a
restart, a cash game, Sit & Go or bot table is rebuilt from its history file
the next time someone connects to it.

## Where things live

| Path                                             | What                                                                                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [src/backend](src/backend/README.md)             | Server, sessions, persistence, tournaments, lessons, logging                                                                                                  |
| [src/backend/poker](src/backend/poker/README.md) | Poker rules, game engine, hand history                                                                                                                        |
| [src/frontend](src/frontend/README.md)           | Lit UI: routing, table layout, styling                                                                                                                        |
| `src/shared`                                     | Imported by both sides: routes, stakes, tournament structure, avatar schema                                                                                   |
| [test](test/README.md)                           | Test strategy and suites                                                                                                                                      |
| [test/ui-catalog](test/ui-catalog/README.md)     | Visual regression screenshots                                                                                                                                 |
| [doc](doc/)                                      | Cross-cutting topics: [avatars](doc/avatar.md), [preflop lessons](doc/learn.md), [domain types](doc/domain-types.md), [infrastructure](doc/infrastructure.md) |
| [scripts](scripts/)                              | Dev and ops tools                                                                                                                                             |
| `config/`, `terraform/`, `Dockerfile`            | Deployment; see [infrastructure](doc/infrastructure.md)                                                                                                       |

## Development

All commands are npm scripts in [package.json](package.json). The ones you
need daily:

```bash
npm start              # dev server with --watch
npm test               # backend + frontend unit tests
npm run test:e2e       # Playwright end-to-end tests
npm run fix            # Prettier + ESLint/Stylelint autofix
npm run validate       # everything below; also the pre-commit hook
```

`npm run validate` runs formatting, linting, type checking, Knip (unused
files, exports and dependencies), jscpd (duplication), dependency-cruiser
(architectural rules: no cycles, no orphans, the frontend never imports the
backend), unit tests, the e2e smoke test, the UI catalog in Docker, and
`npm run review`. Docker must be running. The review step sends uncommitted
changes to the Codex CLI and checks them against
[semantic review rules](scripts/review/rules.md) that linters cannot express.
CI runs the same checks except duplication, dependency rules and the review,
and it runs the UI catalog natively on Ubuntu instead of in Docker.

Type checking uses the TypeScript 7 native compiler (`@typescript/native`). The
`typescript` dependency is an alias for TypeScript 6 because ESLint still needs
its compiler API. This follows Microsoft's
[side-by-side setup](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6-0).

`npm run deps` regenerates the dependency graphs in `doc/deps-*.svg`.

### Conventions

- Prettier defaults; ES modules; `camelCase`; a file is named after its
  primary export; tests mirror the source tree.
- Keep docs at the right level. Explain structure and decisions in the README
  closest to the code they concern. Do not restate what the code already says:
  file listings, field lists and constants go stale. When a change alters an
  architectural decision, update the README that describes it.
