import { html } from "lit";

export const september2026ReleaseNotes = html`
  <h2>September 10, 2026</h2>
  <h3>New Features</h3>
  <h4>Pixel-Art Avatars</h4>
  <ul>
    <li>
      Create a custom avatar with selectable facial features, hair, clothes,
      colors, and fine position and size controls
    </li>
    <li>
      Open the avatar editor from Settings, preview your changes, or explore new
      combinations with Randomize
    </li>
    <li>
      Avatar changes return to Settings as a draft and are saved with the rest
      of your profile when you select Save
    </li>
    <li>Avatars appear at poker tables and on player profiles</li>
  </ul>
  <h4>Hand Replay</h4>
  <ul>
    <li>Replay past hands with play, pause, and step-by-step controls</li>
    <li>
      Watch cards, bets, stacks, and the pot change as the action timeline
      follows the replay
    </li>
  </ul>
  <h4>Tournament Speeds</h4>
  <ul>
    <li>
      Choose Normal, Semi-Turbo, or Turbo when creating a Sit &amp; Go or
      multi-table tournament
    </li>
    <li>
      See estimated playing time and blind schedules to help choose a speed for
      your game
    </li>
    <li>
      Multi-table blind schedules adapt to the number of entrants, with support
      for late registration and expected rebuys
    </li>
  </ul>
  <h4>About Page</h4>
  <ul>
    <li>
      Read the story behind Pluton Poker and its approach to playing home games
      with friends on the new About page
    </li>
  </ul>
  <h3>Improvements</h3>
  <ul>
    <li>
      Redesigned table layouts improve seating, card readability, and chip
      placement across heads-up, 6-max, and full-ring games, including mobile
      landscape
    </li>
    <li>
      Action buttons stay in consistent positions as your available choices
      change, with a single full-width Sit button to join a table
    </li>
    <li>
      Clearer active-player and winner highlights, plus refined chat and emote
      animations
    </li>
    <li>
      After folding or winning by a fold, choose Muck, show one card, or show
      both during a timed decision window
    </li>
    <li>
      Settings, sign-in, and sign-up dialogs now support consistent browser back
      navigation
    </li>
    <li>
      More reliable reconnection after returning to the app, connection errors,
      or actions that stop receiving a response
    </li>
    <li>
      Clearer game creation descriptions, tournament speed tooltips, standings,
      and tournament result messages
    </li>
    <li>
      Improved page sizing on mobile, selectable text outside the table, and
      smoother profile loading
    </li>
  </ul>
  <h3>Bug Fixes</h3>
  <ul>
    <li>
      Fixed Half Pot and Pot bet presets to include current bets and the amount
      needed to call, with preflop presets kept on preflop
    </li>
    <li>
      Fixed spectators being able to see private cards in hand history; hidden
      cards now appear face down
    </li>
    <li>
      Fixed folded or mucked cards being exposed to opponents and ensured
      voluntarily shown cards are recorded in tournament history
    </li>
    <li>
      Fixed uncalled bets being highlighted as winning hands when the chips are
      simply returned
    </li>
    <li>
      Fixed tournament tables starting another hand while waiting for a
      scheduled break
    </li>
    <li>
      Fixed multi-table registration controls so players join through tournament
      registration instead of a table's Sit button
    </li>
    <li>Only active players can call the action clock</li>
    <li>
      Fixed avatar editing and added loading feedback with a retry option if
      avatar artwork fails to load
    </li>
    <li>
      Fixed modal controls falling outside the screen, sign-in emails
      overflowing on mobile, and tournament winner overlays not covering the
      table
    </li>
  </ul>
`;
