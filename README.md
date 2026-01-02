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

## Development

```bash
npm start       # Start dev server with file watching
npm test        # Run unit tests
npm run lint    # Run ESLint
npm run format  # Run Prettier
npm run test:e2e # Run Playwright e2e tests
```

## Deployment

Deployment uses [Kamal](https://kamal-deploy.org/) with AWS ECR and ARM64 instances.

### Prerequisites

- [Kamal](https://kamal-deploy.org/docs/installation/) installed (`gem install kamal`)
- AWS CLI configured with ECR access
- SSH key for the deployment server (`~/.ssh/poker_ed25519`)

### Deploy

```bash
kamal deploy    # Build, push, and deploy
```

### Other Commands

```bash
kamal app logs  # View application logs
kamal app exec -i 'sh'  # Shell into container
kamal rollback  # Rollback to previous version
```

## Architecture

- **Backend**: Node.js with native ES modules, HTTP, WebSocket
- **Frontend**: Lit web components (loaded from CDN, no build step)
- **Protocol**: WebSocket for real-time bidirectional communication
- **Testing**: Node.js built-in test runner + Playwright for e2e

See [CLAUDE.md](./CLAUDE.md) for detailed architecture documentation.

## License

MIT
