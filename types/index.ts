export interface Player {
    id: string;
    name: string;
}

export interface SessionData {
    id: string;
    description: string | null;
    boardId: string;
    startTime: string | null; // ISO Date string
    endTime: string | null;   // ISO Date string
    playerIds: string[] | null;
}

export interface GameState {
    players: Record<string, PlayerState>;
    routes: Route[];
    properties: Property[];
    isGameOver: boolean;
    currentPlayerId: string;
    turnPhase: TurnPhase;
}

export function createEmptyGameState(): GameState {
    return {
        players: {},
        routes: [],
        properties: [],
        isGameOver: false,
        currentPlayerId: "",
        turnPhase: TurnPhase.Start
    };
}

export interface PlayerState {
    money: number;
    boardPosition: number;
    skipNextTurn: boolean;
}

export interface Route {
    cityPair: City[];
    numTracks: number;
}

export interface Property {
    city: City;
    owner_PID: string;
}

export enum ActionType {
    Move,
    Accept,
    Pass,
    Rebellion,
    Trade,
    PlaceTrack
}

export enum TurnPhase {
    Start,
    SpaceOption,
    RouteSelect,
    End
}

export enum SpaceType {
    Go,
    Track,
    SettlerRents,
    Land,
    RoadbedCosts,
    Rebellion,
    EndOfTrack,
    LandClaims,
    SurveyFees,
    Scandal
}

export enum City {
    Calgary,
    Edmonton,
    Montreal,
    Regina,
    Saskatoon,
    Sudbury,
    Toronto,
    Vancouver,
    Winnipeg
}
