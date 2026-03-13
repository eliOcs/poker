import { html, css, LitElement } from "lit";
import { designTokens, baseStyles } from "./styles.js";

class ReleaseNotes extends LitElement {
  static get styles() {
    return [
      designTokens,
      baseStyles,
      css`
        :host {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: var(--color-bg-medium);
          color: var(--color-fg-medium);
          box-sizing: border-box;
          overflow: hidden;
        }

        :host * {
          box-sizing: inherit;
          user-select: text;
        }

        .main {
          flex: 1;
          min-width: 0;
          background: var(--color-bg-medium);
          padding: clamp(20px, 4vw, 48px);
          overflow-y: auto;
        }

        .container {
          max-width: 700px;
          margin: 0 auto;
          line-height: 1.8;
          font-size: var(--font-sm);
          padding-bottom: clamp(24px, 6vw, 64px);
        }

        h1 {
          color: var(--color-fg-medium);
          font-size: var(--font-lg);
          margin: 0 0 calc(var(--space-lg) * 2);
          text-align: center;
        }

        h2 {
          color: var(--color-secondary);
          font-size: var(--font-md);
          margin-top: calc(var(--space-lg) * 2);
          margin-bottom: var(--space-lg);
          border-bottom: 2px solid var(--color-bg-light);
          padding-bottom: var(--space-sm);
        }

        h3 {
          color: var(--color-primary);
          font-size: var(--font-sm);
          margin-top: calc(var(--space-lg) * 1.5);
          margin-bottom: var(--space-md);
        }

        h4 {
          color: var(--color-fg-white);
          font-size: var(--font-sm);
          margin-top: var(--space-lg);
          margin-bottom: var(--space-sm);
        }

        p {
          margin: var(--space-md) 0;
        }

        strong {
          color: var(--color-fg-white);
        }

        ul {
          margin: var(--space-sm) 0;
          padding-left: 1.5rem;
        }

        li {
          margin: var(--space-sm) 0;
        }

        .container a {
          color: var(--color-secondary);
          text-decoration: none;
        }

        .container a:hover {
          text-decoration: underline;
        }

        @media (width < 800px) {
          .main {
            padding: 56px var(--space-md) var(--space-md);
          }
        }
      `,
    ];
  }

  render() {
    return html`
      <main class="main">
        <div class="container">
          <h1>Release Notes</h1>

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
