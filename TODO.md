# To do

- https://plutonpoker.com/history/ml1c1ixx2027/36 why not sho2wing cards on board (last hand of tournament)
- Ready button to skip the break
- Break should start at the end of the hand not at the middle
- https://plutonpoker.com/history/ml1c1ixx2027/26 won on turn
- buy in amount is in cents in cash game
- Larger suit icon
- Bounties
- Don't allow cent bets in sitngos
- Left side in history wider if space available
- ESC key exit history
- Poker history not respecting seat positioning
- All-in annimate each turn
- Announcements chat
- https://plutonpoker.com/history/ml1c1ixx2027/13 should be split pot
- https://plutonpoker.com/history/ml1c1ixx2027/10 cañas folded own raise
- https://plutonpoker.com/games/ml1ayguxdc31 cañas disconnected
- icons bigger and even buttons if space is avaiable
- longer wait showdown
- You shows cards
- poker history show total win loss not only showdown
- poker history timeline cent values
- poker history value center board cent values
- don't allow raise if other players are all in and they can't
- see your hands when folded
- level with number of hands click to show tournament structures move to top left
- last hands needs to show first in the list
- action panel fixed
- sb/bb button
- betting slider cents
- Ready button and then start
- sit n go, only allow player to seat in the frist level of blinds
- history in a new tab (in desktop)
- history tab not updated
- history tab guest players should be able to see cards if shown
- Sit out toggle
- Not allowed to sit in (in tournament)
- Cards shown in the showdown even if players folded
- Tournament timer starts couting before the game start
- Sound when it is your turn
- Version number / Release notes
- Send diffs instead of the full game state to reduce traffic
- Store hand history as gzip
- gzip between backend a frontend
- Move timer and level to top right corner, clicking on it will show the level structure and other tournament details
- Adapt stats table for tournaments
- Allow buying amount for sit n gos
- Allow different currencys USD, EUR and BTC
- Different styles for table positions if table is 2max, 6max or 9max
- Avatar creator: wii style but pixel art
- Chat: to talk to players but also announcements: shows who won the hand, blind announcments
- Emotes
- More betting buttons: pot bet, etc
- add chips when betting UI
- Tournaments: multi table tournaments, tournament lobby then multiple games/tables generated, players moved when tables get too small
- Poker club: invite members, members notified of events
- Seasons: allow grouping games into a seasson to get aggregate results
- Inspiration Chess.com - "Learn poker"
- Inspiration Chess.com - "Ranked Poker"

{
"running": true,
"button": 1,
"blinds": {
"ante": 0,
"small": 5000,
"big": 10000
},
"board": {
"cards": []
},
"hand": {
"phase": "preflop",
"pot": 0,
"currentBet": 10000,
"actingSeat": 1,
"actingTicks": 32,
"clockTicks": 0
},
"countdown": null,
"winnerMessage": null,
"rankings": [
{
"seatIndex": 1,
"playerId": "5c1dc77045d3ecfe1becf691dd9cccc3",
"playerName": "Elio",
"stack": 871999,
"totalBuyIn": 500000,
"netWinnings": 371999,
"handsPlayed": 17,
"winRate": 218.82294117647058
},
{
"seatIndex": 4,
"playerId": "ml1azhl368f8",
"playerName": "Cañas",
"stack": 472500,
"totalBuyIn": 500000,
"netWinnings": -27500,
"handsPlayed": 4,
"winRate": null
},
{
"seatIndex": 2,
"playerId": "ml1b129ad83c",
"playerName": "SBM",
"stack": 135501,
"totalBuyIn": 500000,
"netWinnings": -364499,
"handsPlayed": 17,
"winRate": -214.41117647058823
}
],
"tournament": {
"level": 2,
"timeToNextLevel": 690,
"onBreak": false,
"winner": null
},
"seats": [
{
"empty": true,
"actions": []
},
{
"empty": false,
"player": {
"id": "5c1dc77045d3ecfe1becf691dd9cccc3",
"name": "Elio"
},
"stack": 871999,
"bet": 5000,
"folded": false,
"allIn": false,
"sittingOut": false,
"disconnected": false,
"cards": [
"Jc",
"Ks"
],
"actions": [
{
"action": "call",
"amount": 5000
},
{
"action": "raise",
"min": 20000,
"max": 876999
},
{
"action": "allIn",
"amount": 871999
},
{
"action": "fold"
}
],
"isCurrentPlayer": true,
"isActing": true,
"lastAction": null,
"handResult": null,
"handRank": "K High",
"winningCards": null,
"bustedPosition": null
},
{
"empty": false,
"player": {
"id": "ml1b129ad83c",
"name": "SBM"
},
"stack": 135501,
"bet": 10000,
"folded": false,
"allIn": false,
"sittingOut": false,
"disconnected": false,
"cards": [
"??",
"??"
],
"actions": [],
"isCurrentPlayer": false,
"isActing": false,
"lastAction": null,
"handResult": null,
"handRank": null,
"winningCards": null,
"bustedPosition": null
},
{
"empty": true,
"actions": []
},
{
"empty": false,
"player": {
"id": "ml1azhl368f8",
"name": "Cañas"
},
"stack": 472500,
"bet": 0,
"folded": false,
"allIn": false,
"sittingOut": true,
"disconnected": true,
"cards": [],
"actions": [],
"isCurrentPlayer": false,
"isActing": false,
"lastAction": null,
"handResult": null,
"handRank": null,
"winningCards": null,
"bustedPosition": null
},
{
"empty": true,
"actions": []
}
]
}
