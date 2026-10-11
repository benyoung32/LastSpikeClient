# Todo list

TODO: shorten the dice roll animation

TODO: add the dice roll animation to the LandClaims action. this will likely require reworking the turn phase states

TODO: game balance options. scandal maybe should be only minus 5k or 7k. land spaces could become track spaces once the deck is empty.
boost money when there are less players than 4 players in the lobby. there could be 300k or so money total, divided evenly between players.

TODO: play notification sound when a player joins a lobby.

TODO: player turn notifications dont always work.

TODO: cards are in the way of the money. make cards higher, draw text on top of cards if need be

TODO: make the dice button the dice themselves?

TODO: show tooltip when landed on a space.

TODO: make edmonton not go next to montreal in the hand because the colors are too similar. cities could be sorted from west to east?

TODO: trades with more than 4 properties make the trade window too tall. the cities in the trade window should spread out horizontally and be scrollable as a fallback.

TODO: really loud sound on page reload. dont play sounds for a few seconds after page load.

TODO: add click to enlarge tooltip

TODO: add train chuga chuga sound when a route is finished, or other animation

TODO: add sounds when clicking on things

-- BOT 

bots should be able to emote with simple emojis, like laughing, crying, angry, etc. the emote wheel should be available for players as well 

bots should take over for players when they disconnect from an in progress game. heartbeat function to detect players who have left ? signalR connections? players should also be able to take over from the bot maybe? 

personalities: bots should have different personalities or multipliers on weights. personalities like frugal, aggressive, shy, etc. 

game state scoring mechanism. the bot should be able to score each position and determine the best decision to make based on those decisions. for example when buying land it should look at an average or median score of possible futures to decide if it should buy a property.



    weights: 
    large bonus for being 1st or 2nd, small penalty for being 3rd or 4th.
    negative bonus for being near bankruptcy or having much less money than the next player 
    negative weights for having 