import { html, LitElement } from "lit";

class ReleaseNotes extends LitElement {
  createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <main class="main">
        <div class="container">
          <h1>Release Notes</h1>

          <h2>July 17, 2026</h2>
          <h3>New Features</h3>
          <h4>Multi-Table Tournaments</h4>
          <ul>
            <li>
              Create a multi-table tournament with your choice of buy-in and
              table size, then invite players with a shareable link
            </li>
            <li>
              Register before the tournament starts, with the owner in control
              of the start time and tournament name
            </li>
            <li>
              Follow entrants, tables, blind levels, payouts, live standings,
              and net results from the tournament lobby
            </li>
            <li>
              Players are seated, rebalanced between tables, and brought
              together at the final table automatically
            </li>
            <li>
              Player names link to profiles, and completed tournaments and table
              histories remain available after play ends
            </li>
          </ul>
          <h4>Late Registration and Rebuys</h4>
          <ul>
            <li>
              Join a tournament after it starts through level 4 and be seated as
              soon as a table is ready
            </li>
            <li>
              Choose to rebuy or leave after being eliminated, with one rebuy
              available through level 4
            </li>
            <li>
              Rebuys are included in the prize pool, payouts, tournament
              results, and player stats
            </li>
          </ul>
          <h4>Account Sign-Up</h4>
          <ul>
            <li>
              New sign-up flow collects your name and email before sending a
              passwordless confirmation link
            </li>
            <li>
              A registered account is now required to create or enter a
              multi-table tournament
            </li>
            <li>
              After signing up from a tournament lobby, registration continues
              automatically
            </li>
          </ul>
          <h4>Hand History</h4>
          <ul>
            <li>
              Resize the action timeline on desktop to make more room for the
              table or hand details
            </li>
          </ul>
          <h3>Improvements</h3>
          <ul>
            <li>
              View the complete blind-level and break schedule from a tournament
              table
            </li>
            <li>
              Returning to the home page now takes you straight back to an
              active game
            </li>
            <li>
              Turn notifications can vibrate your device, with a saved on/off
              setting
            </li>
            <li>
              Poker table layouts now adapt more cleanly to different table
              sizes
            </li>
            <li>
              A dedicated All-In button is shown whenever going all-in is
              available as a separate action
            </li>
            <li>
              Navigation between games, tournament lobbies, profiles, and hand
              histories is smoother and preserves the game screen while tables
              load
            </li>
            <li>Signed-in sessions now remain active for 30 days</li>
          </ul>
          <h3>Bug Fixes</h3>
          <ul>
            <li>
              Fixed tournament table balancing, table closures, and final-table
              moves occasionally stalling or moving players at the wrong time
            </li>
            <li>
              Fixed tournament breaks starting too early, remaining pending, or
              displaying the wrong state
            </li>
            <li>
              Fixed the action clock display reaching zero before the player's
              turn actually expired
            </li>
            <li>
              Fixed hand histories being incomplete for hands ended by timed or
              automatic actions
            </li>
            <li>
              Fixed eliminated tournament seats and players with chips being
              handled incorrectly during table transitions
            </li>
            <li>Fixed Sit &amp; Go games sometimes not completing correctly</li>
            <li>Fixed mobile games not reconnecting reliably</li>
          </ul>

          <h2>March 13, 2026</h2>
          <h3>New Features</h3>
          <h4>Email Sign-In</h4>
          <ul>
            <li>
              Sign in with your email address to keep your identity across
              devices
            </li>
            <li>A magic link is sent to your inbox — no password needed</li>
            <li>
              Your guest session merges into your account when you sign in
            </li>
          </ul>
          <h4>Player Profiles</h4>
          <ul>
            <li>View your stats: total hands played and net winnings</li>
            <li>
              Recent games table with game type, net result, and hands played
            </li>
            <li>Click a game row to jump to your last hand in that game</li>
          </ul>
          <h3>Improvements</h3>
          <ul>
            <li>
              Smooth navigation between home, profile, and release notes pages
            </li>
            <li>
              Navigation drawer now available on landing page and release notes
            </li>
          </ul>
          <h3>Bug Fixes</h3>
          <ul>
            <li>Fixed text not being selectable in release notes</li>
          </ul>

          <h2>February 27, 2026</h2>
          <h3>New Features</h3>
          <h4>Chat</h4>
          <ul>
            <li>
              Send short text messages visible to all players at the table
            </li>
            <li>
              Speech bubble appears above your seat and fades after 3 seconds
            </li>
          </ul>
          <h4>Pre-Action Buttons</h4>
          <ul>
            <li>
              Select Check/Fold or Call in advance while waiting for your turn
            </li>
            <li>Action executes automatically when it's your turn</li>
          </ul>
          <h4>Bet Presets</h4>
          <ul>
            <li>Quick bet buttons: Min, Half Pot, Pot, Max (postflop)</li>
            <li>Quick raise buttons: Min, 2.5 BB, 3 BB, Max (preflop)</li>
          </ul>
          <h4>Share Button</h4>
          <ul>
            <li>
              Share game link from the action panel while waiting to start
            </li>
          </ul>
          <h3>Improvements</h3>
          <ul>
            <li>Navigation drawer replaces the old toolbar</li>
            <li>Drawer closes when tapping outside on mobile</li>
            <li>Sit out toggle moved from action panel to navigation drawer</li>
            <li>Emote picker moved to a modal dialog</li>
            <li>"All-In" label shown for calls that use your entire stack</li>
            <li>Pot display hidden during the waiting phase</li>
            <li>Pixel-art slider styling with inset track and 3D thumb</li>
            <li>Sunken appearance on currency input field</li>
            <li>Game container capped at 700px on tall desktop viewports</li>
            <li>Mobile side padding on game container</li>
            <li>Auto-reconnect when returning to the game on mobile</li>
          </ul>
          <h3>Bug Fixes</h3>
          <ul>
            <li>Fixed shown cards not raised for opponents during showdown</li>
            <li>Fixed tournament winner text not centered on mobile</li>
            <li>Fixed player with $0 stack being dealt cards in cash game</li>
            <li>Fixed split pot amounts in hand history</li>
            <li>Fixed voluntary card shows not recorded in hand history</li>
            <li>Fixed white border artifact on scaled cards</li>
            <li>Fixed small scroll on mobile</li>
          </ul>

          <h2>February 12, 2026</h2>
          <h3>New Features</h3>
          <h4>Card Animations</h4>
          <ul>
            <li>Cards flip in when dealt (hole cards and board cards)</li>
            <li>Showdown card reveals use a 3D flip animation</li>
          </ul>
          <h4>Chip Animations</h4>
          <ul>
            <li>Visual chip stacks shown on bets and pot</li>
            <li>Bet collection animation when moving to the next street</li>
          </ul>
          <h4>Emotes</h4>
          <ul>
            <li>Send emoji reactions visible to all players at the table</li>
          </ul>
          <h4>Hole Card Reveals</h4>
          <ul>
            <li>
              Show one or both cards to opponents after folding or winning
            </li>
          </ul>
          <h4>Tournament Improvements</h4>
          <ul>
            <li>Buy-in selector and prize pool distribution for sit & go</li>
            <li>Net win/loss column in tournament ranking modal</li>
            <li>Stack-based rankings shown during sit & go play</li>
            <li>Leave a sit & go before it starts</li>
          </ul>
          <h3>Improvements</h3>
          <ul>
            <li>Game info bar at top-left shows hand number</li>
            <li>History timeline: muted street headers, fit-to-width layout</li>
            <li>Folded players can now sit out during an active hand</li>
            <li>Recover missing games from hand history on reconnect</li>
            <li>
              Performance: self-hosted font, gzip compression, cache headers
            </li>
            <li>Sharper pixel-art icons</li>
            <li>UI polish on seat button, sit out styling, and empty seats</li>
          </ul>
          <h3>Bug Fixes</h3>
          <ul>
            <li>
              Fixed show card buttons appearing after cards already shown at
              showdown
            </li>
            <li>
              Fixed new player joining mid-hand being included in betting
              rotation
            </li>
            <li>Fixed blind posting bug when there are only 3 players</li>
            <li>Fixed text being selectable on game components</li>
          </ul>

          <h2>February 5, 2026</h2>
          <h3>New Features</h3>
          <h4>Sound Effects</h4>
          <ul>
            <li>8-bit turn notification sounds when it's your turn to act</li>
            <li>Volume control slider in settings modal</li>
          </ul>
          <h4>All-In Runouts</h4>
          <ul>
            <li>Delayed card reveals when all players are all-in</li>
            <li>Cards dealt one at a time for dramatic effect</li>
          </ul>
          <h4>Hand History Enhancements</h4>
          <ul>
            <li>Hole cards shown in the hand list sidebar</li>
            <li>Net gain/loss displayed for each hand</li>
            <li>Ending stack shown in seat positions</li>
            <li>Your player name shown in purple instead of "You"</li>
            <li>Burgundy table color to distinguish from live game</li>
            <li>Latest hand shown first in sidebar</li>
            <li>ESC key closes history page</li>
          </ul>
          <h3>Improvements</h3>
          <ul>
            <li>Cash game defaults changed to 6-max and $0.02/$0.05 blinds</li>
            <li>Countdown between hands increased from 3 to 5 seconds</li>
            <li>Tournament breaks now wait for current hand to finish</li>
            <li>Betting slider uses chip denominations for step sizes</li>
            <li>Folded players' cards hidden from opponents</li>
            <li>Winner cards hidden when they win by fold</li>
            <li>Your own folded cards remain visible (dimmed)</li>
          </ul>
          <h3>Bug Fixes</h3>
          <ul>
            <li>
              Fixed betting slider unable to reach max when stack not divisible
              by step
            </li>
            <li>
              Fixed all-in action incorrectly shown as "Call" instead of "Raise"
            </li>
            <li>Fixed three-of-a-kind tie comparison error</li>
            <li>
              Fixed sitting out players unable to sit back in with short stack
            </li>
            <li>
              Fixed raise/bet option showing when all opponents are all-in
            </li>
            <li>Fixed tournament timer starting before first hand</li>
            <li>Fixed history view seat positions not matching game table</li>
          </ul>

          <h2>January 27, 2026</h2>
          <h3>New Features</h3>
          <h4>Sit &amp; Go Tournament Mode</h4>
          <ul>
            <li>6-player Sit &amp; Go format with $5,000 starting stack</li>
            <li>
              7 blind levels (15 min each) with a 5-min break after level 4
            </li>
            <li>Blinds escalate from $25/$50 up to $500/$1,000</li>
            <li>Tournament level and timer display on the board</li>
            <li>Break overlay shown during tournament breaks</li>
            <li>Game type selector on home page (Cash / Sit &amp; Go)</li>
            <li>Sitting out players still post blinds and auto-fold</li>
            <li>Players cannot leave or buy-in during tournament</li>
          </ul>
          <h4>Tournament Results</h4>
          <ul>
            <li>
              Busted players see their finishing position (e.g., "You finished
              in 3rd place")
            </li>
            <li>Winner overlay when one player remains ("You've won!")</li>
          </ul>
          <h3>Improvements</h3>
          <h4>Hand History</h4>
          <ul>
            <li>Cards now shown in "Shows Cards" action in the timeline</li>
            <li>Better player highlighting using server-side player ID</li>
          </ul>
          <h3>Bug Fixes</h3>
          <ul>
            <li>
              Fixed non-participating players showing "$0" during showdown (now
              shows stack)
            </li>
            <li>Fixed split pot win amounts in hand history</li>
          </ul>

          <h2>January 13, 2026</h2>
          <h3>New Features</h3>
          <h4>Hand History Viewer</h4>
          <ul>
            <li>View complete history of all hands played in a game</li>
            <li>Access via the button on the game screen</li>
            <li>See the final table state with player cards and board</li>
            <li>
              Timeline shows all actions street-by-street (Preflop, Flop, Turn,
              River, Showdown)
            </li>
            <li>
              Navigate between hands using:
              <ul>
                <li>Arrow keys</li>
                <li>Swipe gestures on mobile</li>
                <li>Sidebar hand list (desktop)</li>
                <li>Nav bar buttons (mobile)</li>
              </ul>
            </li>
            <li>Your actions are highlighted in green</li>
            <li>Winners shown with golden border matching the live game</li>
          </ul>
          <h3>Improvements</h3>
          <h4>Visual Polish</h4>
          <ul>
            <li>Rounded corners throughout the UI for a softer look</li>
            <li>Consistent spacing and typography across all components</li>
            <li>
              Winner highlighting now matches between live game and hand history
            </li>
          </ul>
          <h4>Call Clock</h4>
          <ul>
            <li>
              More reliable timing system (tick-based instead of timestamps)
            </li>
            <li>Consistent behavior across all players</li>
          </ul>
          <h3>Bug Fixes</h3>
          <ul>
            <li>
              Fixed hand history sometimes showing 7 cards on board instead of 5
            </li>
            <li>
              Fixed history error page - now redirects back to game with a toast
              message
            </li>
            <li>
              Fixed action timeline not grouping actions by street correctly
            </li>
          </ul>
        </div>
      </main>
    `;
  }
}

customElements.define("phg-release-notes", ReleaseNotes);
