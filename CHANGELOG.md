# Changelog

## Week of January 27, 2026

### New Features

**Sit & Go Tournament Mode**

- 6-player Sit & Go format with $5,000 starting stack
- 7 blind levels (15 min each) with a 5-min break after level 4
- Blinds escalate from $25/$50 up to $500/$1,000
- Tournament level and timer display on the board
- Break overlay shown during tournament breaks
- Game type selector on home page (Cash / Sit & Go)
- Sitting out players still post blinds and auto-fold
- Players cannot leave or buy-in during tournament

**Tournament Results**

- Busted players see their finishing position (e.g., "You finished in 3rd place")
- Winner overlay when one player remains ("You've won!")

### Improvements

**Hand History**

- Cards now shown in "Shows Cards" action in the timeline
- Better player highlighting using server-side player ID

### Bug Fixes

- Fixed non-participating players showing "$0" during showdown (now shows stack)
- Fixed split pot win amounts in hand history

## Week of January 13, 2026

### New Features

**Hand History Viewer**

- View complete history of all hands played in a game
- Access via the 🔁 button on the game screen
- See the final table state with player cards and board
- Timeline shows all actions street-by-street (Preflop, Flop, Turn, River, Showdown)
- Navigate between hands using:
  - Arrow keys (← →)
  - Swipe gestures on mobile
  - Sidebar hand list (desktop)
  - Nav bar buttons (mobile)
- Your actions are highlighted in green
- Winners shown with golden border matching the live game

### Improvements

**Visual Polish**

- Rounded corners throughout the UI for a softer look
- Consistent spacing and typography across all components
- Winner highlighting now matches between live game and hand history

**Call Clock**

- More reliable timing system (tick-based instead of timestamps)
- Consistent behavior across all players

### Bug Fixes

- Fixed hand history sometimes showing 7 cards on board instead of 5
- Fixed history error page - now redirects back to game with a toast message
- Fixed action timeline not grouping actions by street correctly
