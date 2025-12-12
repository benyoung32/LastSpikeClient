"use client";

import { useState, useMemo } from "react";
import { Player, SessionData, City, SpaceType, GameState } from "@/types";
import { SPACES, VALID_CITY_PAIRS } from "@/lib/gameConstants";

interface GameBoardProps {
    session: SessionData;
    players: Player[];
    currentPlayerId: string | null;
    gameState: GameState | null;
    onRouteSelect: (route: City[]) => void;
    validRoutes?: City[][];
}

// Layout Constants for Internal SVG Coordinate System (1600x900)
const VIEWBOX_WIDTH = 1400;
const VIEWBOX_HEIGHT = 900;
const BOARD_PADDING = 50; // Inner padding from the edge of the viewBox
const CORNER_SIZE = 140; // Size of corner squares
const CITY_RADIUS = 20;
const CORNER_PADDING = 20;
const SPACE_GAP = 2;

const BOARD_INNER_WIDTH = VIEWBOX_WIDTH - BOARD_PADDING * 2;
const BOARD_INNER_HEIGHT = VIEWBOX_HEIGHT - BOARD_PADDING * 2;

// Calculated dimensions for spaces
// Top/Bottom has 5 shared spaces between corners
const SPACE_WIDTH_H = (BOARD_INNER_WIDTH - CORNER_SIZE * 2) / 5;
// Left/Right has 3 shared spaces between corners
const SPACE_HEIGHT_V = (BOARD_INNER_HEIGHT - CORNER_SIZE * 2) / 3;

// Map Coordinates (Inner Diamond)
const MAP_WIDTH = BOARD_INNER_WIDTH * 0.7;
const MAP_HEIGHT = BOARD_INNER_HEIGHT * 0.6;
const MAP_CENTER_X = VIEWBOX_WIDTH / 2;
const MAP_CENTER_Y = VIEWBOX_HEIGHT / 2;
const MAP_LEFT = MAP_CENTER_X - MAP_WIDTH / 2;
const MAP_TOP = MAP_CENTER_Y - MAP_HEIGHT / 2;

const CITY_COORDS: Record<City, { x: number; y: number }> = {
    [City.Montreal]: { x: 1, y: 0.5 },
    [City.Toronto]: { x: 0.75, y: 0.65 },
    [City.Sudbury]: { x: 0.75, y: 0.35 },
    [City.Winnipeg]: { x: 0.5, y: 0.5 },
    [City.Regina]: { x: 0.5, y: 0.8 },
    [City.Saskatoon]: { x: 0.5, y: 0.2 },
    [City.Calgary]: { x: 0.25, y: 0.65 },
    [City.Edmonton]: { x: 0.25, y: 0.35 },
    [City.Vancouver]: { x: 0, y: 0.5 }
};

const SPACE_COLORS: Record<SpaceType, string> = {
    [SpaceType.Land]: "#4472efa9",
    [SpaceType.Go]: "#0a91d3",
    [SpaceType.SettlerRents]: "#a32a2f",
    [SpaceType.Track]: "#be9f1fff",
    [SpaceType.LandClaims]: "#5b45b1",
    [SpaceType.Rebellion]: "#77216a",
    [SpaceType.EndOfTrack]: "#6ca427",
    [SpaceType.Scandal]: "#c23f9c",
    [SpaceType.SurveyFees]: "#3da939",
    [SpaceType.RoadbedCosts]: "#ae41caff",
}

const PLAYER_COLORS = [
    "#ef4444",
    "#3b82f6",
    "#22c55e",
    "#eab308",
    "#a855f7",
    "#ec4899",
    "#f97316",
    "#06b6d4",
];

const getCityPos = (city: City) => {
    const offset = CITY_COORDS[city];
    return {
        x: MAP_LEFT + offset.x * MAP_WIDTH,
        y: MAP_TOP + offset.y * MAP_HEIGHT
    };
};

export default function GameBoard({ session, players, currentPlayerId, gameState, onRouteSelect, validRoutes }: GameBoardProps) {
    const [hoveredElement, setHoveredElement] = useState<string | null>(null);

    const isRouteValid = (c1: City, c2: City) => {
        if (!validRoutes) return false;
        return validRoutes.some(pair =>
            (pair.includes(c1) && pair.includes(c2))
        );
    };

    const playerGroups = useMemo(() => {
        const groups: Record<number, string[]> = {};
        if (gameState?.players) {
            // Sort by ID to ensure stable positioning
            Object.entries(gameState.players)
                .sort(([idA], [idB]) => idA.localeCompare(idB))
                .forEach(([pId, pState]) => {
                    if (!groups[pState.boardPosition]) groups[pState.boardPosition] = [];
                    groups[pState.boardPosition].push(pId);
                });
        }
        return groups;
    }, [gameState]);

    const getPlayerOffset = (index: number, total: number) => {
        if (total <= 1) return { x: 0, y: 0 };

        // Custom distribution for multiple players to avoid overlap
        // Larger radius for 3+ players to make room
        const radius = total === 2 ? 12 : 18;

        if (total === 2) {
            // Diagonal offset for 2 players
            const dist = 12;
            return index === 0 ? { x: -dist, y: -dist } : { x: dist, y: dist };
        }

        // Circular distribution for 3+
        // Start from top (-PI/2)
        const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
        return {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius
        };
    };

    // --- Helper to calculate Space Geometry ---
    const getSpaceGeometry = (index: number) => {
        let x = 0, y = 0, w = 0, h = 0;
        let isCorner = false;

        const left = BOARD_PADDING;
        const top = BOARD_PADDING;
        const right = VIEWBOX_WIDTH - BOARD_PADDING;
        const bottom = VIEWBOX_HEIGHT - BOARD_PADDING;

        if (index === 0) { // Bottom Right (GO)
            isCorner = true;
            x = right - CORNER_SIZE;
            y = bottom - CORNER_SIZE;
            w = CORNER_SIZE;
            h = CORNER_SIZE;
        } else if (index >= 1 && index <= 5) { // Bottom Edge
            const offset = index - 1;
            x = (right - CORNER_SIZE) - (offset + 1) * SPACE_WIDTH_H;
            y = bottom - CORNER_SIZE + CORNER_PADDING;
            w = SPACE_WIDTH_H;
            h = CORNER_SIZE - CORNER_PADDING;
        } else if (index === 6) { // Bottom Left
            isCorner = true;
            x = left;
            y = bottom - CORNER_SIZE;
            w = CORNER_SIZE;
            h = CORNER_SIZE;
        } else if (index >= 7 && index <= 9) { // Left Edge
            const offset = index - 7;
            x = left;
            y = (bottom - CORNER_SIZE) - (offset + 1) * SPACE_HEIGHT_V;
            w = CORNER_SIZE - CORNER_PADDING;
            h = SPACE_HEIGHT_V;
        } else if (index === 10) { // Top Left
            isCorner = true;
            x = left;
            y = top;
            w = CORNER_SIZE;
            h = CORNER_SIZE;
        } else if (index >= 11 && index <= 15) { // Top Edge
            const offset = index - 11;
            x = left + CORNER_SIZE + (offset * SPACE_WIDTH_H);
            y = top;
            w = SPACE_WIDTH_H;
            h = CORNER_SIZE - CORNER_PADDING;
        } else if (index === 16) { // Top Right
            isCorner = true;
            x = right - CORNER_SIZE;
            y = top;
            w = CORNER_SIZE;
            h = CORNER_SIZE;
        } else if (index >= 17 && index <= 19) { // Right Edge
            const offset = index - 17;
            x = right - CORNER_SIZE + CORNER_PADDING;
            y = top + CORNER_SIZE + (offset * SPACE_HEIGHT_V);
            w = CORNER_SIZE - CORNER_PADDING;
            h = SPACE_HEIGHT_V;
        }

        return {
            x: x + SPACE_GAP,
            y: y + SPACE_GAP,
            width: w - (SPACE_GAP * 2),
            height: h - (SPACE_GAP * 2),
            isCorner
        };
    };

    const getSpaceCenter = (index: number) => {
        const { x, y, width, height } = getSpaceGeometry(index);
        return {
            x: x + width / 2,
            y: y + height / 2
        };
    };

    const getPlayerColor = (playerId: string) => {
        const index = players.findIndex(p => p.id === playerId);
        if (index === -1) return "#ffffff";
        return PLAYER_COLORS[index % PLAYER_COLORS.length];
    };

    return (
        <main className="flex h-screen w-full flex-col bg-zinc-950 text-white overflow-hidden font-cute">
            <div className="flex-1 relative flex items-center justify-center p-4">
                <svg
                    viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
                    className="w-[80%] h-[80%] max-w-[80vw] max-h-[80vh] select-none shadow-2xl bg-zinc-900/50 rounded-xl border border-zinc-800"
                    preserveAspectRatio="xMidYMid meet"
                >
                    {/* --- Helper Definitions (Gradients, Filters) --- */}
                    <defs>
                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                        <filter id="token-shadow" x="-50%" y="-50%" width="200%" height="200%">
                            <feDropShadow dx="2" dy="6" stdDeviation="1" floodColor="#000000" floodOpacity="0.5" />
                        </filter>
                        <filter id="text-shadow" x="-50%" y="-50%" width="200%" height="200%">
                            <feDropShadow dx="3" dy="3" stdDeviation="0" floodColor="#000000" floodOpacity="0.75" />
                        </filter>
                    </defs>

                    {/* --- Routes (Tracks) --- */}
                    <g className="routes">
                        {VALID_CITY_PAIRS.map(([c1, c2], idx) => {
                            const p1 = getCityPos(c1);
                            const p2 = getCityPos(c2);
                            const isHovered = hoveredElement === `route-${idx}`;
                            const isValid = isRouteValid(c1, c2);

                            return (
                                <g
                                    key={`route-${idx}`}
                                    onMouseEnter={() => setHoveredElement(`route-${idx}`)}
                                    onMouseLeave={() => setHoveredElement(null)}
                                    onClick={() => {
                                        console.log(`Clicked Route: ${City[c1]} <-> ${City[c2]}`)
                                        if (isValid && onRouteSelect) {
                                            onRouteSelect([c1, c2]);
                                        }
                                    }}
                                    className={`transition-all duration-300 ${isValid ? "cursor-pointer" : "cursor-not-allowed opacity-30"}`}
                                >
                                    {/* Invisible thick line for easier clicking */}
                                    <line
                                        x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                                        stroke="transparent"
                                        strokeWidth={20}
                                    />
                                    {/* Visible Line */}
                                    <line
                                        x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                                        stroke={isHovered ? "#fbbf24" : "#71717a"}
                                        strokeWidth={isHovered ? 6 : 3}
                                        className="transition-colors duration-200"
                                    />
                                </g>
                            );
                        })}
                    </g>

                    {/* --- Cities --- */}
                    <g className="cities">
                        {Object.keys(CITY_COORDS).map((key) => {
                            const city = parseInt(key) as City;
                            const pos = getCityPos(city);
                            const isHovered = hoveredElement === `city-${key}`;

                            return (
                                <g
                                    key={`city-${key}`}
                                    onMouseEnter={() => setHoveredElement(`city-${key}`)}
                                    onMouseLeave={() => setHoveredElement(null)}
                                    onClick={() => console.log(`Clicked City: ${City[city]}`)}
                                    className="cursor-pointer"
                                    style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
                                >
                                    <circle
                                        cx={pos.x}
                                        cy={pos.y}
                                        r={isHovered ? CITY_RADIUS * 1.2 : CITY_RADIUS}
                                        fill="#09090b"
                                        stroke={isHovered ? "#fbbf24" : "#f59e0b"}
                                        strokeWidth={isHovered ? 3 : 2}
                                        className="transition-all duration-200"
                                    />
                                    <text
                                        x={pos.x}
                                        y={pos.y - CITY_RADIUS - 12}
                                        textAnchor="middle"
                                        fill={isHovered ? "#fbbf24" : "#f59e0b"}
                                        className="text-sm font-bold uppercase pointer-events-none transition-all duration-200"
                                        style={{ fontSize: isHovered ? '22px' : '20px', fontWeight: 'bold' }}
                                    >
                                        {City[city]}
                                    </text>
                                </g>
                            );
                        })}
                    </g>

                    {/* --- Board Spaces --- */}
                    <g className="spaces">
                        {SPACES.map((space, index) => {
                            const { x, y, width, height, isCorner } = getSpaceGeometry(index);
                            const isHovered = hoveredElement === `space-${index}`;
                            const label = SpaceType[space.type].replace(/([A-Z])/g, ' $1').trim();

                            return (
                                <g
                                    key={index}
                                    transform={`translate(${x}, ${y})`}
                                    onMouseEnter={() => setHoveredElement(`space-${index}`)}
                                    onMouseLeave={() => setHoveredElement(null)}
                                    onClick={() => console.log(`Clicked Space: ${label}`)}
                                    className="cursor-pointer"
                                >
                                    <rect
                                        width={width}
                                        height={height}
                                        fill={SPACE_COLORS[SPACES[index].type]}
                                        stroke={isHovered ? "#fbbf24" : "#52525b"}
                                        strokeWidth={isHovered ? 3 : 1}
                                        className="transition-all duration-200 hover:filter-brightness-110"
                                    />
                                    <text
                                        x={width / 2}
                                        y={height / 2 - (space.cost > 0 ? 8 : 0)}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        fill="#f1f1f5ff"
                                        style={{
                                            fontSize: isCorner ? '24px' : '22px',
                                            fontWeight: 'normal',
                                        }}
                                        className="pointer-events-none"
                                        filter="url(#text-shadow)"
                                    >
                                        {label === "Go" ? "GO" : label}
                                    </text>
                                    {space.cost > 0 && (
                                        <text
                                            x={width / 2}
                                            y={height / 2 + 14}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            fill="#f59e0b"
                                            style={{ fontSize: '20px' }}
                                            className="pointer-events-none"
                                            filter="url(#text-shadow)"
                                        >
                                            ${space.cost / 1000}k
                                        </text>
                                    )}
                                </g>
                            );
                        })}
                    </g>

                    {/* --- Players --- */}
                    {gameState && gameState.players && (
                        <g className="players">
                            {Object.entries(gameState.players).map(([pId, pState]) => {
                                const spaceCenter = getSpaceCenter(pState.boardPosition);
                                const group = playerGroups[pState.boardPosition] || [];
                                const index = group.indexOf(pId);
                                const offset = getPlayerOffset(index, group.length);

                                const finalX = spaceCenter.x + offset.x;
                                const finalY = spaceCenter.y + offset.y;

                                const color = getPlayerColor(pId);

                                return (
                                    <g
                                        key={pId}
                                        style={{ transform: `translate(${finalX}px, ${finalY}px)` }}
                                        className="transition-all duration-500"
                                    >


                                        {/* Token Body - Donut */}
                                        <circle
                                            r={15}
                                            fill="none"
                                            stroke={color}
                                            strokeWidth={10}
                                            filter="url(#token-shadow)"
                                        />
                                    </g>
                                );
                            })}
                        </g>
                    )}
                </svg>
            </div>

            {/* HUD / Footer */}
            <div className="h-16 bg-zinc-900 border-t border-zinc-800 flex items-center justify-center px-6 z-10">
                <p className="text-zinc-500 text-sm">gameState: {gameState ? gameState.toString() : "No"}</p>
            </div>
        </main>
    );
}
