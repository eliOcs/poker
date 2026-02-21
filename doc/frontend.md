# Frontend

## Dependency Graph

![Frontend dependency graph](deps-frontend.svg)

## Project Structure

```
src/frontend/
├── index.html         # Entry point with importmap
├── base.css           # Shared base styles (font, body reset)
├── manifest.json      # PWA manifest
├── release-notes.html # Release notes page
├── app.js             # Main app router
├── index.js           # Game table component
├── history.js         # Hand history viewer
├── history-styles.js  # History page styles
├── home.js            # Landing page
├── action-panel.js    # Betting action buttons
├── audio.js           # Sound effects
├── bet-collection.js  # Bet collection animation
├── board.js           # Community cards
├── card.js            # Card component
├── chips.js           # Chip stack visual component
├── currency-slider.js # Currency amount slider
├── game-layout.js     # Game table layout
├── seat.js            # Player seat component
├── button.js          # Generic button component
├── modal.js           # Modal dialog
├── ranking-panel.js   # Hand rankings display
├── toast.js           # Toast notifications
└── styles.js          # Design tokens and base styles
```

## Development Workflow

- Lit installed via npm, served from `node_modules` via importmap (no bundler)
- Environment variables injected at serve time via stream transform
- Hot reload via browser refresh (backend has `--watch`)

## Components

| Component       | File                 | Description                         |
| --------------- | -------------------- | ----------------------------------- |
| App Router      | `app.js`             | Top-level routing between pages     |
| Game Table      | `index.js`           | Main game view, orchestrates layout |
| Home            | `home.js`            | Landing page                        |
| Hand History    | `history.js`         | Past hands viewer                   |
| Action Panel    | `action-panel.js`    | Fold / Call / Raise buttons         |
| Board           | `board.js`           | Community cards display             |
| Card            | `card.js`            | Single playing card                 |
| Seat            | `seat.js`            | Player seat with stack and cards    |
| Chips           | `chips.js`           | Chip stack visualization            |
| Bet Collection  | `bet-collection.js`  | Animated bet gathering              |
| Currency Slider | `currency-slider.js` | Slider for selecting bet amounts    |
| Game Layout     | `game-layout.js`     | Table layout positioning            |
| Ranking Panel   | `ranking-panel.js`   | Hand rankings reference             |
| Button          | `button.js`          | Reusable button component           |
| Modal           | `modal.js`           | Dialog overlay                      |
| Toast           | `toast.js`           | Notification popups                 |
| Audio           | `audio.js`           | Sound effect management             |
| Styles / Tokens | `styles.js`          | Design tokens and shared styles     |

## Testing

### Unit Tests

Frontend component tests live in `test/frontend/` and use `@open-wc/testing` with `web-test-runner`.

```bash
npm run test:frontend   # Run frontend component tests
```

### UI Catalog

Visual regression testing with Playwright screenshots. Test cases live in `test/ui-catalog/test-cases/` and snapshots are stored in Git LFS.

```bash
npm run test:ui-catalog          # Run visual regression tests
npm run test:ui-catalog:update   # Regenerate snapshots after UI changes
```
