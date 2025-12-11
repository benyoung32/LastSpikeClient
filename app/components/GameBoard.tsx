"use client";

import { useState } from "react";
import { Player, SessionData, City, SpaceType, GameState } from "@/types";
import { SPACES, VALID_CITY_PAIRS } from "@/lib/gameConstants";

interface GameBoardProps {
    session: SessionData;
    players: Player[];
    currentPlayerId: string | null;
    gameState: GameState | null;
}

// Layout Constants for Internal SVG Coordinate System (1600x900)
const VIEWBOX_WIDTH = 1600;
const VIEWBOX_HEIGHT = 900;
const BOARD_PADDING = 50; // Inner padding from the edge of the viewBox
const CORNER_SIZE = 140; // Size of corner squares
const CITY_RADIUS = 20;
const CORNER_PADDING = 20;

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

export default function GameBoard({ session, players, currentPlayerId, gameState }: GameBoardProps) {
    const [hoveredElement, setHoveredElement] = useState<string | null>(null);

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

        return { x, y, width: w, height: h, isCorner };
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
        <main className="flex h-screen w-full flex-col bg-zinc-950 text-white overflow-hidden">
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
                    </defs>

                    {/* --- Routes (Tracks) --- */}
                    <g className="routes">
                        {VALID_CITY_PAIRS.map(([c1, c2], idx) => {
                            const p1 = getCityPos(c1);
                            const p2 = getCityPos(c2);
                            const isHovered = hoveredElement === `route-${idx}`;
                            return (
                                <g
                                    key={`route-${idx}`}
                                    onMouseEnter={() => setHoveredElement(`route-${idx}`)}
                                    onMouseLeave={() => setHoveredElement(null)}
                                    onClick={() => console.log(`Clicked Route: ${City[c1]} <-> ${City[c2]}`)}
                                    className="cursor-pointer transition-all duration-300"
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
                                        style={{ fontSize: isHovered ? '20px' : '18px', fontWeight: 'bold', fontFamily: 'sans-serif' }}
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
                                        fill={isCorner ? "#27272a" : "#18181b"}
                                        stroke={isHovered ? "#fbbf24" : "#52525b"}
                                        strokeWidth={isHovered ? 3 : 1}
                                        className="transition-all duration-200"
                                    />
                                    <text
                                        x={width / 2}
                                        y={height / 2 - (space.cost > 0 ? 8 : 0)}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        fill="#a1a1aa"
                                        style={{
                                            fontSize: isCorner ? '20px' : '16px',
                                            fontWeight: isCorner ? 'bold' : 'normal',
                                            fontFamily: 'monospace'
                                        }}
                                        className="pointer-events-none"
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
                                            style={{ fontSize: '14px', fontFamily: 'monospace' }}
                                            className="pointer-events-none"
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
                                const pos = getSpaceCenter(pState.boardPosition);
                                const color = getPlayerColor(pId);
                                const player = players.find(p => p.id === pId);

                                return (
                                    <g
                                        key={pId}
                                        style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
                                        className="transition-all duration-500"
                                    >
                                        <filter id={`shadow-${pId}`}>
                                            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.5" />
                                        </filter>

                                        {/* Token Body */}
                                        <circle
                                            r={15}
                                            fill={color}
                                            stroke={PLAYER_COLORS[players.findIndex(p => p.id === pId)]}
                                            strokeWidth={2}
                                            filter={`url(#shadow-${pId})`}
                                        />

                                        {/* Initial/Icon */}
                                    </g>
                                );
                            })}
                        </g>
                    )}
                </svg>
            </div>

            {/* HUD / Footer */}
            <div className="h-16 bg-zinc-900 border-t border-zinc-800 flex items-center px-6 z-10">
                <p className="text-zinc-500 text-sm">gameState: {gameState ? "Yes" : "No"}</p>
            </div>
        </main>
    );
}
