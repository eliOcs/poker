# Changelog

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
