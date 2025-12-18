# LastSpikeClient

A browser client for the "Last Spike" board game, built with Next.js. This application provides a UI for the game, connecting to a backend server, allowing players to create and join sessions and play the game. [The backend server is available here](https://github.com/benyoung32/LastSpikeServer).

## Inspiration

The goal behind this project was to recreate one of my favorite board games, The Last Spike 1976, inside a web application so that I could play the game with friends from far away. The classic Canadian board game is a monopoly-type game where players compete to hoard properties and money while building the transcontinental railroad across Canada. The ultimate goal of each player is to have the most money when the last spike of the rail connecting Vancouver and Montreal is driven.

## Project Structure & Components

### Pages (`app/`)

**Home Page (`app/page.tsx`)**: The entry point. Handles user registration (creating a transient player identity) and allows users to either create a new game session or join an existing one via ID.

**Session Page (`app/session/[id]/page.tsx`)**: The core game interface. It connects to the SignalR hub, manages the game loop, maintains local state (syncing with the server), and coordinates all sub-components.

### Components (`app/components/`)

**LobbyView**: Displayed before the game starts, showing joined players and the "Start Game" button for the host.

**GameBoard**: An SVG-based gameboard. It handles the rendering of cities, routes, and built tracks, as well as user input for selecting routes.

**PlayerInfoPanel**: Displays individual player state (money, properties, position). The layout dynamically adjusts based on the number of players (supporting up to 6 positions).

**ActionBar**: The primary control interface for the current player. It displays valid actions (Roll, Buy, Place Track, etc.) based on the current `TurnPhase`.

**TradeWindow**: A modal interface for negotiating property trades between players.

### Core Logic (`lib/` & `types/`)

**`lib/api.ts`**: The HTTP client layer. Wrapper around `axios` to handle all REST API calls to the backend (creating players, fetching state, submitting actions).

**`types/index.ts`**: TypeScript definitions for the game model (`GameState`, `Player`, `Route`, `ActionType`, `City`, etc.). These definitions mirror the backend models, this allows the client to make type-safe API calls, render the game state accurately, while exposing as little information as possible from the server.

## Session Joining Process

1. **User Entry**: On the Home Page, the user enters their name.
2. **Player Creation**: A `POST /api/Players` request creates a player record and returns an ID.
3. **Session Association**:
    * **Create**: `POST /api/Sessions` creates a new room.
    * **Join**: `POST /api/Sessions/{sessionId}/players/{playerId}` adds the player to an existing room.
4. **Navigation**: The user is redirected to `/session/[id]`.
5. **Initialization**:
    The `SessionPage` mounts and uses `useSignalR` to connect to the backend hub.
    It invokes `JoinSession` on the hub to subscribe to room-specific updates.
    Initial `SessionData` and `GameState` are fetched via REST API.

## Real-time Architecture (SignalR)

Instead of polling for updates, the client uses **SignalR** for real-time, event-driven communication.

**Connection**: Managed globally via `SignalRContext`.
**Events**: The client listens for specific server-sent events:

* `PlayerJoined` / `PlayerRemoved`: Triggers a refresh of the player list in the Lobby.
* `GameStarted`: Triggers the transition from LobbyView to GameBoard.
* `GameBoardUpdated`: The most critical event. Sent whenever the game state changes (after a move, roll, or payment). It triggers the client to re-fetch the latest `GameState` to ensure full synchronization.

## Action Model

Interactions are modeled as explicit **Actions** rather than direct state mutations.

1. **Validation**: The server sends a list of `validActions` (e.g., `[Roll, TradeOffer]`) as part of the `GameState` for the current player.
2. **Selection**: When a user clicks a button (e.g., "Roll Dice"), the client calls `selectAction` in `api.ts`.
3. **Transmission**: A `PUT` request is sent to `/api/GameBoards/{boardId}/action` with the specific `ActionType`.
    * *Example payload:* `{ type: ActionType.PlaceTrack, target: { city1: "Calgary", city2: "Vancouver" } }`
4. **Update**: The server processes the action, mutates the state, and broadcasts `GameBoardUpdated` to all clients.
