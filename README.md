# Poker Home Games

A web-based Texas Hold'em poker game with real-time multiplayer support.

## Quick Start

### Prerequisites

- Node.js 24+
- OpenSSL (for generating certificates)

### Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Generate self-signed SSL certificates**

   ```bash
   ./scripts/generate-certs.sh
   ```

3. **Create environment file**

   ```bash
   cp .env.example .env
   ```

4. **Start the server**

   ```bash
   npm start
   ```

5. **Open in browser**
   Navigate to https://localhost:8443

   Note: You'll need to accept the self-signed certificate warning in your browser.

## Development

```bash
npm start       # Start dev server with file watching
npm test        # Run unit tests
npm run lint    # Run ESLint
npm run format  # Run Prettier
npm run test:e2e # Run Playwright e2e tests
```

## Architecture

- **Backend**: Node.js with native ES modules, HTTPS, WebSocket
- **Frontend**: Lit web components (loaded from CDN, no build step)
- **Protocol**: WebSocket for real-time bidirectional communication
- **Testing**: Node.js built-in test runner + Playwright for e2e

See [CLAUDE.md](./CLAUDE.md) for detailed architecture documentation.

## License

MIT
