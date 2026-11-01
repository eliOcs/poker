# Tests

Tests exist to give confidence that a deploy works. They check behavior
through public interfaces, and mocks appear only at system edges: email goes
to a file sink, data goes to a temporary `DATA_DIR`, and the WebSocket is a
real one. If a refactor that keeps behavior intact breaks a test, the test is
wrong. Coverage numbers are a tool for finding gaps, not a target.

## Layers

Pick the cheapest layer that can observe the behavior.

| Layer        | Location                              | Runs                                                 | Use for                                                             |
| ------------ | ------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------- |
| Backend unit | `backend/` (mirrors `src`)            | `node:test`, `npm run test:backend`                  | Poker rules, calculations, routes, persistence, tournament policies |
| Frontend     | `frontend/`                           | web-test-runner in Chromium, `npm run test:frontend` | Component behavior and interaction, with `@open-wc/testing`         |
| End-to-end   | `e2e/`                                | Playwright against a real server, `npm run test:e2e` | Full user flows across browser, server and storage                  |
| UI catalog   | [`ui-catalog/`](ui-catalog/README.md) | Playwright screenshots                               | One baseline per distinct visual state                              |

- **Backend** tests build game states directly and assert on the result. To
  inspect intermediate steps, step through the dealing and showdown generators
  with `.next()`. Compare whole objects with deep equality rather than picking
  out fields.
- **Frontend** tests load the real `app.css` (see `web-test-runner.config.js`),
  so layout-dependent behavior matches production.
- **The bot engine** is a system edge. Tests use `test/fake-bot-engine.js`,
  which speaks the same protocol and always checks or calls; the e2e server
  runs it too. Changes to how requests are built should also be played
  against the real binary and a blueprint, which catches disagreements about
  the rules that the fake cannot.
- **UI catalog** cases set up states directly. Interactions belong in
  component or e2e tests, and poker calculations in backend tests.

## End-to-end

`playwright.config.js` starts a dedicated server for each project, with its own
port and its own data directory under `test-results/runtime-data/`. A running
dev server is never affected.

- `chromium` runs every spec except the stress tests. It uses a fixed
  `RNG_SEED`, so deals are deterministic. `smoke.spec.js` is scripted for the
  default seed and fails with any other.
- `stress` (`stress*.spec.js`) uses a new random seed on each run and prints
  it. Replay a failure with `STRESS_RNG_SEED=<seed>`.
- `TIMER_SPEED=10` runs the server's clocks ten times faster. Assert on durable
  state, such as the number of board cards, rather than on messages that may
  only last a few frames at that speed.
- `DEBUG_E2E=1` forwards page console output and errors.

The pre-commit hook and CI run only `npm run test:e2e:smoke`; run the full
suite when you change game flow.

### Coverage

`npm run test:e2e:coverage` collects JavaScript and CSS usage from the browser
and the server. Browser coverage counters die with the document. Call
`checkpointCoverage(page)` before anything that replaces the document: `goto`,
`reload`, `goBack`, `goForward`, or an action that triggers a full navigation.
Call `stopCoverage(page)` before closing a recorded page early. The report
merges all saved segments. CSS coverage shows which rules matched during the
run. An uncovered rule may still be needed for an untested viewport or state.
