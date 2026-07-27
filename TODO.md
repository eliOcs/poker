# To do

- unify speed selector in MTTs and Sit n Gos add a tooltip to explain the differences and estimated time based on the number of players
- improve styles from: https://www.pokerstarsreplayer.com/hands/090eb7d816
- Ideas from: https://plaspokerleague.blogspot.com/, add to poker tournament summary the number of knockouts, the number of rebuys, announce next scheduled tournament, poll to select the best date.
- Bounty option: (+10% buyin)
- graph of the evolution
- background on pot numbers
- allow sit in in the middle of the hand
- muck button, show at the end of the hand
- keyboard short cuts for buttons on desktop: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/kbd, inspiration fizzy
- on your turn player card border animated
- Dealer button out of player card
- Vibrate API if availble to announce turn
- Ready button to skip the break
- Larger suit icon
- Announcements chat
- Ready button and then start
- history in a new tab (in desktop)
- when sit out shows waiting for your turn
- show the level structure and other tournament details (next break)
- Allow different currencys USD, EUR and BTC
- Avatar creator: wii style but pixel art
- show past games on home page, hands played and net win/loss
- In cash games add option to refill/top up
- Poker club: invite members, members notified of events.
- Seasons: allow grouping games into a seasson to get aggregate results
- Inspiration Chess.com - "Learn poker"
- Inspiration Chess.com - "Hand review"
- Inspiration Chess.com - "Play coach"
- Inspiration Chess.com - "Ranked Poker"
- use SSE instead of websockets when we are only communicating updates from the backend to the frontend (eg: hand history)
- OLAP db to store logs (DuckDB)

## Hand Rank modal [WIP]

- Allow clicking your hand rank to understand your odds to improve your hand with the current available information
  AcKs - Ace High
  Pair of Kings
  Pair of Aces
  Full House
  Straight

# Not right now

- Posicion en la mesa fija
- once we start chargin set license to: https://osaasy.dev/
- sb/bb indicators (more position information)
- Store hand history as gzip
- gzip dynamic backend responses
- Send diffs instead of the full game state to reduce websocket traffic
