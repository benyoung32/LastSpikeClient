import { City, SpaceType, CityPair } from "@/types";

export interface SpaceDef {
    type: SpaceType;
    cost: number;
}

export const SPACES: SpaceDef[] = [
    { type: SpaceType.CPRSubsidy, cost: 0 },
    { type: SpaceType.Track, cost: 1000 },
    { type: SpaceType.SettlerRents, cost: 1000 },
    { type: SpaceType.Land, cost: 1000 },
    { type: SpaceType.RoadbedCosts, cost: 1000 },
    { type: SpaceType.Track, cost: 2000 },
    { type: SpaceType.Rebellion, cost: 0 },
    { type: SpaceType.Land, cost: 3000 },
    { type: SpaceType.Track, cost: 4000 },
    { type: SpaceType.Land, cost: 5000 },
    { type: SpaceType.EndOfTrack, cost: 0 },
    { type: SpaceType.Track, cost: 6000 },
    { type: SpaceType.LandClaims, cost: 1000 },
    { type: SpaceType.Land, cost: 7000 },
    { type: SpaceType.SurveyFees, cost: 3000 },
    { type: SpaceType.Track, cost: 8000 },
    { type: SpaceType.Scandal, cost: 10000 },
    { type: SpaceType.Land, cost: 9000 },
    { type: SpaceType.Track, cost: 10000 },
    { type: SpaceType.Land, cost: 12000 }
];

export const CITY_VALUES: Record<City, number[]> = {
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

export const VALID_CITY_PAIRS: CityPair[] = [
    { city1: City.Montreal, city2: City.Toronto },
    { city1: City.Montreal, city2: City.Sudbury },
    { city1: City.Toronto, city2: City.Winnipeg },
    { city1: City.Toronto, city2: City.Regina },
    { city1: City.Sudbury, city2: City.Saskatoon },
    { city1: City.Sudbury, city2: City.Winnipeg },
    { city1: City.Winnipeg, city2: City.Calgary },
    { city1: City.Winnipeg, city2: City.Edmonton },
    { city1: City.Regina, city2: City.Calgary },
    { city1: City.Saskatoon, city2: City.Edmonton },
    { city1: City.Calgary, city2: City.Vancouver },
    { city1: City.Edmonton, city2: City.Vancouver }
];

const PLAYER_COLORS = [
    "#ef4444",
    "#3b82f6",
    "#22c55e",
    "#eab308",
    "#a855f7",
    "#ec4899",
];
