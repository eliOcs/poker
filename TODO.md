# To do

- Avatar creator: wii style but pixel art
- hand strength modal
- delayed showed cards to end of the hand
- always show player on same seat
- setting to show amount of big blinds instead of cash
- Poker club: invite members, members notified of events.
- Seasons: allow grouping games into a seasson to get aggregate results
- Events: schedule, track assistance, notify
- background on pot numbers
- allow sit in in the middle of the hand
- when sit out shows waiting for your turn
- keyboard short cuts for buttons on desktop: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/kbd, inspiration fizzy
- on your turn player card border animated
- Dealer button out of player card
- Ready button to skip the break
- Larger suit icon
- Ready button and then start
- show recent and active games on home page to easily rejoin
- In cash games add option to refill/top up without having to be busted
- Inspiration Chess.com - "Learn poker"
- Inspiration Chess.com - "Hand review"
- Inspiration Chess.com - "Play coach"
- Inspiration Chess.com - "Ranked Poker"
- Allow different currencys USD, EUR and BTC
- graph of the evolution on tournament
- Bounty option: (+10% buyin)
- Ideas from: https://plaspokerleague.blogspot.com/, add to poker tournament summary the number of knockouts, the number of rebuys, announce next scheduled tournament, poll to select the best date.
- improve styles from: https://www.pokerstarsreplayer.com/hands/090eb7d816
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
