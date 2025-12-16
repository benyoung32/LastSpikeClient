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
    validActions: ActionType[];
    pendingTrade: Trade | null;
}

export function createEmptyGameState(): GameState {
    return {
        players: {},
        routes: [],
        properties: [],
        isGameOver: false,
        currentPlayerId: "",
        turnPhase: TurnPhase.Start,
        validActions: [],
        pendingTrade: null
    };
}

export interface Trade {
    Player1Id: string;
    Player2Id: string;
    Properties: Property[];
    Player1Money: number;
    Player2Money: number;
}

export interface PlayerState {
    money: number;
    boardPosition: number;
    skipNextTurn: boolean;
}

export interface CityPair {
    city1: City;
    city2: City;
}

export interface Route {
    cityPair: CityPair;
    numTracks: number;
}

export interface Property {
    city: City;
    owner_PID: string;
}

export enum ActionType {
    Move,
    Ok,
    Pass,
    Rebellion,
    Trade,
    PlaceTrack,
    Roll,
    Buy
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

export const CITY_VALUES = {
    [City.Calgary]: [0, 5000, 12000, 22000, 35000, 50000],
    [City.Edmonton]: [0, 6000, 15000, 27000, 42000, 60000],
    [City.Montreal]: [0, 10000, 25000, 45000, 70000, 100000],
    [City.Regina]: [0, 7000, 17000, 32000, 50000, 70000],
    [City.Saskatoon]: [0, 8000, 20000, 36000, 56000, 80000],
    [City.Sudbury]: [0, 5000, 12000, 22000, 35000, 50000],
    [City.Toronto]: [0, 6000, 15000, 27000, 42000, 60000],
    [City.Vancouver]: [0, 9000, 22000, 40000, 63000, 90000],
    [City.Winnipeg]: [0, 4000, 10000, 18000, 28000, 40000]
};

export const CITY_COLORS: Record<City, string> = {
    [City.Calgary]: "#ce8349",   // Red
    [City.Edmonton]: "#dd2f57",  // Pink
    [City.Montreal]: "#da4041",  // Orange
    [City.Regina]: "#b13573ff",    // Purple
    [City.Saskatoon]: "#af4630", // Green
    [City.Sudbury]: "#85a7d3",   // Blue
    [City.Toronto]: "#b3a550",   // Yellow/Gold
    [City.Vancouver]: "#9e878f", // Cyan
    [City.Winnipeg]: "#d9753a"   // Grey
};

