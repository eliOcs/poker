# Poker Home Games

A web-based Texas Hold'em poker game with real-time multiplayer support.

## Quick Start

### Prerequisites

- Node.js 24+

### Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create environment file**

   ```bash
   cp .env.example .env
   ```

3. **Start the server**

   ```bash
   npm start
   ```

4. **Open in browser**
   Navigate to http://localhost:3000

## Architecture

### Philosophy

- **Pragmatic over perfect** — Simple solutions that work, no over-engineering
- **Modern runtime only** — Targets latest Node.js (24+) and modern browsers (no polyfills)
- **Minimal dependencies** — Use native APIs when possible (e.g., `node:test`, `crypto`)
- **Backend authority** — All game logic runs server-side; frontend is a thin rendering layer
- **Validate at boundaries, trust internally** — Runtime validation at system edges; static analysis internally

### Tech Stack

- **Backend**: Node.js with native ES modules, HTTP, WebSocket (`ws`)
- **Frontend**: Lit web components installed via npm (no build step, served via importmap)
- **Protocol**: WebSocket for real-time bidirectional communication
- **Testing**: Node.js test runner, web-test-runner, Playwright

### Detailed Documentation

- [Backend](doc/backend.md) — Communication model, game state, patterns, currency convention
- [Frontend](doc/frontend.md) — Components, development workflow, UI catalog
- [Infrastructure](doc/infrastructure.md) — Server setup, deployment, storage, secrets
- [CLAUDE.md](CLAUDE.md) — Full project context for AI assistants and contributors

## Development

### Commands

```bash
npm start                       # Run dev server with file watching
npm test                        # Run all tests (backend + frontend)
npm run test:backend            # Run backend unit tests (node:test)
npm run test:frontend           # Run frontend component tests (web-test-runner)
npm run test:e2e                # Run end-to-end tests (Playwright)
npm run test:ui-catalog         # Run visual regression tests
npm run test:ui-catalog:update  # Regenerate UI catalog screenshots
npm run coverage                # Run tests with coverage reporting
npm run duplicates              # Check for code duplication (jscpd)
npm run lint                    # ESLint + Stylelint (check only)
npm run format                  # Prettier (check only)
npm run fix                     # Auto-fix format + lint issues
npm run typecheck               # TypeScript type checking
npm run validate                # Run all checks (format, lint, typecheck, test)
npm run deps                    # Generate dependency graphs (doc/deps-*.svg)
```

### Git Hooks

A shared pre-commit hook runs `npm run validate` before each commit. It is configured automatically via the `prepare` script when running `npm install` (sets `core.hooksPath` to `.githooks/`).

### Environment (.env)

```
DOMAIN=localhost
PORT=3000
```

## Deployment

Deployment uses [Kamal](https://kamal-deploy.org/) for zero-downtime deploys:

- **Registry**: AWS ECR (eu-central-1)
- **Server**: ARM64 (Graviton) instance
- **SSL**: Let's Encrypt via Kamal proxy
- **Domain**: plutonpoker.com

### Prerequisites

- [Kamal](https://kamal-deploy.org/docs/installation/) installed (`gem install kamal`)
- AWS CLI configured with ECR access
- SSH key for the deployment server (`~/.ssh/poker_ed25519`)

### Commands

```bash
kamal deploy                   # Full deploy (build, push, deploy)
kamal redeploy                 # Deploy without rebuilding
kamal rollback                 # Rollback to previous version
kamal app logs                 # View application logs
kamal app exec -i 'sh'         # Shell into container
```

### Secrets

The `.kamal/secrets` file generates the ECR password:

```bash
KAMAL_REGISTRY_PASSWORD=$(aws ecr get-login-password --region eu-central-1 --profile personal)
```

ECR tokens expire after 12 hours. If deploy fails with auth errors, the token has expired.

## Dependencies

**Runtime** (keep minimal):

- `ws` — WebSocket server
- `lit` — Web components

**Dev**:

- `eslint`, `prettier`, `stylelint` — Code quality
- `typescript` — Type checking (no compilation)
- `@open-wc/testing`, `web-test-runner` — Frontend testing
- `@playwright/test` — E2E and visual regression testing
- `jscpd` — Code duplication detection
- `madge` — Dependency graph generation (via npx)

## License

MIT
