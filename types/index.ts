export interface Player {
    id: string;
    name: string | null;
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
    players: Record<string, PlayerState> | null;
    routes: Route[] | null;
    properties: Property[] | null;
    isGameOver: boolean;
    currentPlayerId: string;
    turnPhase: TurnPhase;
}

export interface PlayerState {
    money: number;
    boardPosition: number;
    skipNextTurn: boolean;
}

export interface Route {
    cityPair: City[] | null;
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
