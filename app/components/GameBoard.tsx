"use client";

import { useState, useMemo, useEffect, useRef, memo } from "react";
import { createPortal } from "react-dom";
import { Player, Route, SessionData, City, SpaceType, GameState, CITY_COLORS, PLAYER_COLORS } from "@/types";
import { SPACES, VALID_CITY_PAIRS } from "@/lib/gameConstants";
import { useGameSounds } from "@/app/hooks/useGameSounds";
import { PropertyCard } from "./PropertyCard";
import { motion, useAnimation, AnimatePresence } from "framer-motion";
import { DiceRollAnimation } from "./DiceRollAnimation";

interface GameBoardProps {
    session: SessionData;
    players: Player[];
    currentPlayerId: string | null;
    gameState: GameState | null;
    onRouteSelect: (route: Route) => void;
    validRoutes: Route[];
    highlightWinningPath?: boolean;
}

// Layout Constants for Internal SVG Coordinate System (1600x900)
const VIEWBOX_WIDTH = 1400;
const VIEWBOX_HEIGHT = 900;
const BOARD_PADDING = 50; // Inner padding from the edge of the viewBox
const CORNER_SIZE = 160; // Size of corner squares
const CITY_RADIUS = 20;
const CORNER_PADDING = 30;
const SPACE_GAP = 4;

const BOARD_INNER_WIDTH = VIEWBOX_WIDTH - BOARD_PADDING * 2;
const BOARD_INNER_HEIGHT = VIEWBOX_HEIGHT - BOARD_PADDING * 2;

// Calculated dimensions for spaces
// Top/Bottom has 5 shared spaces between corners
const SPACE_WIDTH_H = (BOARD_INNER_WIDTH - CORNER_SIZE * 2) / 5;
// Left/Right has 3 shared spaces between corners
const SPACE_HEIGHT_V = (BOARD_INNER_HEIGHT - CORNER_SIZE * 2) / 3;

// Map Coordinates (Inner Diamond)
const MAP_WIDTH = BOARD_INNER_WIDTH * 0.65;
const MAP_HEIGHT = BOARD_INNER_HEIGHT * 0.65;
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
    [SpaceType.Land]: "#0557dba4",       // Blue
    [SpaceType.CPRSubsidy]: "#22c55eaf",         // Green
    [SpaceType.SettlerRents]: "#f97416ab", // Orange
    [SpaceType.Track]: "#eab208b0",      // Yellow
    [SpaceType.LandClaims]: "#8a5cf6b6", // Violet
    [SpaceType.Rebellion]: "#ef4444c4",  // Red
    [SpaceType.EndOfTrack]: "#64748b", // Slate
    [SpaceType.Scandal]: "#ec489ab9",    // Pink
    [SpaceType.SurveyFees]: "#10b981a2", // Emerald
    [SpaceType.RoadbedCosts]: "#6365f1b1", // Indigo
}

const SPACE_DESCRIPTIONS: Record<SpaceType, string> = {
    [SpaceType.CPRSubsidy]: "Collect $5000 when landing on CPR Subsidy, not passing it",
    [SpaceType.Track]: `You must build a track if you land here.
    Building on an empty route awards a free deed. 
    Completing a route awards all players who own deeds of either city. 
    `,
    [SpaceType.SettlerRents]: "Collect {cost} for each deed owned",
    [SpaceType.Land]: "Optionally pay {cost} to purchase a random remaining deed. There are 5 deeds for each city",
    [SpaceType.RoadbedCosts]: "Pay {cost} for each deed owned",
    [SpaceType.Rebellion]: "Remove a track piece from a route containing 2 or 3 pieces",
    [SpaceType.EndOfTrack]: "Skip your next turn",
    [SpaceType.LandClaims]: "Roll the dice. Pay the number rolled x {cost}",
    [SpaceType.SurveyFees]: "Collect {cost} from all other players",
    [SpaceType.Scandal]: "Get caught visiting a tropical island. Pay {cost}",
};


const getCityPos = (city: City) => {
    const offset = CITY_COORDS[city];
    return {
        x: MAP_LEFT + offset.x * MAP_WIDTH,
        y: MAP_TOP + offset.y * MAP_HEIGHT
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


// --- PlayerToken Component ---
interface PlayerTokenProps {
    playerId: string;
    color: string;
    boardPosition: number;
    offset: { x: number, y: number };
    addSound: (sound: string) => void;
    getSoundDuration: (sound: string) => number;
}

const PlayerToken = memo(({ playerId, color, boardPosition, offset, addSound, getSoundDuration }: PlayerTokenProps) => {
    const controls = useAnimation();
    const prevPositionRef = useRef<number>(boardPosition);

    useEffect(() => {
        const prevPos = prevPositionRef.current;
        const currentPos = boardPosition;

        if (prevPos !== currentPos) {
            let steps: number[] = [];

            if (currentPos > prevPos) {
                for (let i = prevPos; i <= currentPos; i++) {
                    steps.push(i);
                }

            } else if (currentPos < prevPos) {
                for (let i = prevPos; i < 20; i++) steps.push(i); // To end
                for (let i = 0; i <= currentPos; i++) steps.push(i); // From start
            } else {
                steps.push(currentPos);
            }

            if (steps.length > 1) {
                const getTargetForStep = (idx: number) => {
                    const center = getSpaceCenter(idx);
                    return { x: center.x + offset.x, y: center.y + offset.y };
                };

                const stepRandoms = steps.slice(1).map(() => Math.floor(Math.random() * 4) + 1);
                const stepSounds = stepRandoms.map(idx => `slide${idx}`);
                const stepDurations = stepSounds.map(s => Math.min(getSoundDuration(s), 0.4));

                // Ensure non-zero total duration to avoid division by zero or instant animation
                const totalDuration = stepDurations.reduce((a, b) => a + b, 0) || (steps.length - 1) * 0.2;

                let accumulatedTime = 0;
                const times = [0];
                stepDurations.forEach(d => {
                    accumulatedTime += d;
                    times.push(Math.min(accumulatedTime / totalDuration, 1));
                });

                let currentDelay = 0;
                stepSounds.forEach((sound, i) => {
                    setTimeout(() => {
                        addSound(sound);
                    }, currentDelay * 1000);
                    currentDelay += stepDurations[i];
                });

                controls.start({
                    x: steps.map(s => getTargetForStep(s).x),
                    y: steps.map(s => getTargetForStep(s).y),
                    transition: {
                        duration: totalDuration,
                        ease: "easeInOut",
                        times: times
                    }
                });
            } else {
                // Initial render or no move (just offset change?)
                const center = getSpaceCenter(currentPos);
                controls.start({
                    x: center.x + offset.x,
                    y: center.y + offset.y,
                    transition: { duration: 0.5, ease: "easeInOut" }
                });
            }

            prevPositionRef.current = currentPos;
        } else {
            // Position didn't change, but Offset might have!
            const center = getSpaceCenter(currentPos);
            controls.start({
                x: center.x + offset.x,
                y: center.y + offset.y,
                transition: { duration: 0.5, ease: "easeInOut" }
            });
        }
    }, [boardPosition, offset, controls, playerId, addSound]);

    // Initial position for first render (no animation needed? Or animate from 0,0?)
    // to avoid jump, we can set initial to the target.
    const initialPos = useMemo(() => {
        const center = getSpaceCenter(boardPosition);
        return { x: center.x + offset.x, y: center.y + offset.y + 20 };
    }, []); // Run once

    return (
        <motion.g
            initial={initialPos}
            animate={controls}
        >
            {/* Token Body - 3D Cylinder with Hole */}
            <g filter="url(#token-shadow)">
                {/* Side/Body (Darker for depth) */}
                <path
                    d="M -20,0 L -20,16 A 20,18 0 0 0 20,16 L 20,0 Z"
                    fill={color}
                    stroke="none"
                    style={{ filter: "brightness(0.75)" }}
                />

                {/* Inner Hole Depth (Darkest) */}
                <ellipse
                    cx={0}
                    cy={0}
                    rx={11}
                    ry={9}
                    fill={color}
                    stroke="none"
                    style={{ filter: "brightness(0.4)" }}
                />

                {/* Top Cap (Ring) */}
                <path
                    d="M -20,0 A 20,18 0 1 0 20,0 A 20,18 0 1 0 -20,0 Z M -11,0 A 11,9 0 1 0 11,0 A 11,9 0 1 0 -11,0 Z"
                    fill={color}
                    fillRule="evenodd"
                    stroke="none"
                />

                {/* Optional Highlight on Ring */}
                <ellipse
                    cx={0}
                    cy={-14}
                    rx={11}
                    ry={2}
                    fill="white"
                    fillOpacity={0.25}
                    stroke="none"
                />
            </g>
        </motion.g>
    );
}, (prev, next) => {
    return (
        prev.playerId === next.playerId &&
        prev.color === next.color &&
        prev.boardPosition === next.boardPosition &&
        prev.offset.x === next.offset.x &&
        prev.offset.y === next.offset.y
    );
});


export default function GameBoard({ session, players, currentPlayerId, gameState, onRouteSelect, validRoutes, highlightWinningPath = false }: GameBoardProps) {
    const [selectedCity, setSelectedCity] = useState<City | null>(null);
    const [hoveredSpace, setHoveredSpace] = useState<{ type: SpaceType; cost: number; x: number; y: number } | null>(null);
    const [winningPath, setWinningPath] = useState<Route[]>([]);


    const { addSound, getSoundDuration } = useGameSounds();
    const prevGameStateRef = useRef<GameState | null>(null);

    // Pathfinding Effect
    useEffect(() => {
        // DEBUG: Trace prop and state
        console.log("GameBoard: highlightWinningPath changed to:", highlightWinningPath);

        if (highlightWinningPath && gameState) {
            console.log("GameBoard: Starting Pathfinding BFS...");
            // BFS to find path from Vancouver to Montreal
            const startCity = City.Vancouver;
            const endCity = City.Montreal;

            const queue: { city: City; path: Route[] }[] = [{ city: startCity, path: [] }];
            const visited = new Set<City>();
            visited.add(startCity);

            let foundPath: Route[] = [];

            while (queue.length > 0) {
                const { city, path } = queue.shift()!;

                if (city === endCity) {
                    foundPath = path;
                    console.log("GameBoard: Path Found!", path);
                    break;
                }

                // Find connected routes
                const connectedRoutes = gameState.routes.filter(r =>
                    r.numTracks === 4 &&
                    (r.cityPair.city1 === city || r.cityPair.city2 === city)
                );

                for (const route of connectedRoutes) {
                    const nextCity = route.cityPair.city1 === city ? route.cityPair.city2 : route.cityPair.city1;
                    if (!visited.has(nextCity)) {
                        visited.add(nextCity);
                        queue.push({ city: nextCity, path: [...path, route] });
                    }
                }
            }

            if (foundPath.length === 0) {
                console.warn("GameBoard: No winning path found between Vancouver and Montreal.");
            }

            setWinningPath(foundPath);
        } else {
            console.log("GameBoard: highlightWinningPath is false or gameState missing. Clearing path.");
            setWinningPath([]);
        }
    }, [highlightWinningPath, gameState]);

    useEffect(() => {
        if (!gameState) return;

        const prevGameState = prevGameStateRef.current;

        // Update ref immediately if it's the first run, but don't play sounds
        if (!prevGameState) {
            prevGameStateRef.current = JSON.parse(JSON.stringify(gameState));
            return;
        }

        const soundsToQueue: string[] = [];

        // 1. Check for piece movement (slide)
        // Handled by PlayerToken component for visual sync

        // 2. Check for track changes (build / riot)
        gameState.routes.forEach((route) => {
            const prevRoute = prevGameState.routes.find(r =>
                (r.cityPair.city1 === route.cityPair.city1 && r.cityPair.city2 === route.cityPair.city2) ||
                (r.cityPair.city1 === route.cityPair.city2 && r.cityPair.city2 === route.cityPair.city1)
            );

            const prevTracks = prevRoute ? prevRoute.numTracks : 0;
            if (route.numTracks > prevTracks) {
                soundsToQueue.push('build');
            } else if (route.numTracks < prevTracks) {
                soundsToQueue.push('riot');
            }
        });

        // 3. Check for money increase (cash)
        Object.entries(gameState.players).forEach(([pId, pState]) => {
            const prevPState = prevGameState.players[pId];
            if (prevPState && pState.money !== prevPState.money) {
                soundsToQueue.push('cash');
            }
        });

        // Queue signals
        soundsToQueue.forEach(sound => addSound(sound));

        // Update Ref
        prevGameStateRef.current = JSON.parse(JSON.stringify(gameState));
    }, [gameState, addSound]);

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

    const getPlayerColor = (playerId: string) => {
        const index = players.findIndex(p => p.id === playerId);
        if (index === -1) return "#ffffff";
        return PLAYER_COLORS[index % PLAYER_COLORS.length];
    };

    return (
        <main className="flex h-screen w-full flex-col bg-stone-800 text-white overflow-hidden font-cute items-center justify-center p-4">
            <div className="relative w-full max-w-[calc(80vh*14/9)] aspect-[14/9] shadow-2xl rounded-xl border border-stone-400 overflow-hidden">
                <svg
                    viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
                    preserveAspectRatio="xMidYMid meet"
                >
                    {/* --- Helper Definitions (Gradients, Filters) --- */}
                    <defs>
                        {/* Board Vignette */}
                        <radialGradient id="board-grad" cx="50%" cy="50%" r="70%" fx="50%" fy="50%">
                            <stop offset="0%" stopColor="#eedece" />
                            <stop offset="100%" stopColor="#d4c5b0" />
                        </radialGradient>

                        {/* Space Tile Gradient (glassy/convex look) */}
                        <linearGradient id="space-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="white" stopOpacity="0.3" />
                            <stop offset="50%" stopColor="white" stopOpacity="0" />
                            <stop offset="100%" stopColor="black" stopOpacity="0.1" />
                        </linearGradient>

                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>

                        <filter id="token-shadow" x="-50%" y="-50%" width="200%" height="200%">
                            <feDropShadow dx="2" dy="4" stdDeviation="2" floodColor="#000000" floodOpacity="0.4" />
                        </filter>

                        <filter id="inner-map-shadow" x="-50%" y="-50%" width="200%" height="200%">
                            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#5c4d3c" floodOpacity="0.3" />
                        </filter>

                        <filter id="text-shadow" x="-50%" y="-50%" width="200%" height="200%">
                            <feDropShadow dx="2" dy="2" stdDeviation="1" floodColor="#000000" floodOpacity="0.6" />
                        </filter>

                        {/* Paper Texture Filter */}
                        <filter id="paper-texture">
                            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" result="noise" />
                            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.05 0" in="noise" result="coloredNoise" />
                            <feComposite operator="in" in="coloredNoise" in2="SourceGraphic" result="composite" />
                            <feBlend mode="multiply" in="composite" in2="SourceGraphic" />
                        </filter>
                    </defs>

                    {/* Board Background */}
                    <rect x="0" y="0" width="100%" height="100%" fill="url(#board-grad)" filter="url(#paper-texture)" />

                    {/* Inner Map Separation Area */}
                    <rect
                        x={MAP_LEFT - 70}
                        y={MAP_TOP}
                        width={MAP_WIDTH + 140}
                        height={MAP_HEIGHT}
                        rx="30"
                        fill="#e6dccd"
                        opacity="0.6"
                        filter="url(#inner-map-shadow)"
                    />

                    {/* --- Routes (Tracks) --- */}
                    <g className="routes">
                        {VALID_CITY_PAIRS.map((cities, idx) => {
                            const p1 = getCityPos(cities.city1);
                            const p2 = getCityPos(cities.city2);

                            const routeIndex = validRoutes.findIndex(route => {
                                return route.cityPair.city1 === cities.city1 && route.cityPair.city2 === cities.city2
                            });
                            const isValid = routeIndex !== -1;

                            // Find the route in gameState to get numTracks
                            const gameRoute = gameState?.routes.find(r =>
                                (r.cityPair.city1 === cities.city1 && r.cityPair.city2 === cities.city2) ||
                                (r.cityPair.city1 === cities.city2 && r.cityPair.city2 === cities.city1)
                            );
                            const numTracks = gameRoute?.numTracks || 0;

                            // Track Geometry Logic
                            const midX = (p1.x + p2.x) / 2;
                            const isRightSide = midX > MAP_CENTER_X;

                            const isReversed = isRightSide ? p1.x < p2.x : p1.x > p2.x;
                            const start = isReversed ? p2 : p1;
                            const end = isReversed ? p1 : p2;

                            const dx = end.x - start.x;
                            const dy = end.y - start.y;

                            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            const segLen = dist / 4;

                            const w = segLen + 1;
                            const h = 8; // Width of the track piece

                            // Ladder Style Track
                            const railWidth = 6;
                            const tieWidth = 5;
                            const railColor = "#000000ff"; // Dark Brown
                            const tieColor = "#000000ff"; // Dark Brown

                            // Calculate visible line start/end to avoid overlap with tracks
                            const coverageRatio = numTracks / 4.0;
                            const lineStartX = start.x + dx * coverageRatio;
                            const lineStartY = start.y + dy * coverageRatio;

                            return (
                                <g
                                    key={`route-${idx}`}
                                    onClick={() => {
                                        console.log("clicked route", [cities.city1, cities.city2]);
                                        console.log(validRoutes);
                                        if (isValid && onRouteSelect) {
                                            onRouteSelect(validRoutes[routeIndex]);
                                        }
                                    }}
                                    className={`group transition-all duration-300`}
                                >
                                    {/* Invisible thick line for easier clicking - Full Length */}
                                    <line
                                        x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                                        stroke="transparent"
                                        strokeWidth={20}
                                    />
                                    {/* Visible Line - Clipped based on tracks */}
                                    <line
                                        x1={lineStartX} y1={lineStartY} x2={end.x} y2={end.y}
                                        stroke={isValid ? "#fbbf24" : "#71717a"}
                                        strokeWidth={isValid ? 3 : 3}
                                        className={`transition-all duration-200 ${isValid ? 'group-hover:stroke-[6px]' : ''}`}
                                    />
                                    {/* Built Track Segments */}
                                    {numTracks > 0 && (
                                        <g filter="url(#token-shadow)">
                                            {Array.from({ length: numTracks }).map((_, tIdx) => {
                                                const t = (tIdx + 0.5) / 4.0;
                                                const cx = start.x + dx * t;
                                                const cy = start.y + dy * t;

                                                return (
                                                    <g
                                                        key={`track-${idx}-${tIdx}`}
                                                        transform={`translate(${cx}, ${cy}) rotate(${angle})`}
                                                        className={`transition-all duration-100 pointer-events-none`}
                                                    >
                                                        {/* Sleeper Ties (3 per segment) */}
                                                        {[-0.3, 0, 0.3].map((offset, i) => (
                                                            <rect
                                                                key={i}
                                                                x={(w * offset) - (tieWidth / 2)}
                                                                y={-h}
                                                                width={tieWidth}
                                                                height={h * 2}
                                                                fill={tieColor}
                                                            />
                                                        ))}

                                                        {/* Rails (Top and Bottom) */}
                                                        <rect
                                                            x={-w / 2}
                                                            y={(-h / 2) + 10}
                                                            width={w}
                                                            height={railWidth}
                                                            fill={railColor}
                                                        />
                                                        <rect
                                                            x={-w / 2}
                                                            y={(h / 2) - railWidth - 10}
                                                            width={w}
                                                            height={railWidth}
                                                            fill={railColor}
                                                        />
                                                    </g>
                                                );
                                            })}
                                        </g>
                                    )}
                                </g>
                            );
                        })}

                        {/* Winning Path Highlight - Rendered AFTER tracks to be on top */}
                        {highlightWinningPath && winningPath.length > 0 && (
                            <g className="winning-path-highlight">
                                {(() => {
                                    // Reconstruct path direction to animate from ends
                                    let currentCity = City.Vancouver;
                                    const totalSegments = winningPath.length;
                                    const midpoint = totalSegments / 2;

                                    return winningPath.map((route, idx) => {
                                        // Determine direction: Current -> Next
                                        const p1City = currentCity;
                                        const p2City = route.cityPair.city1 === currentCity ? route.cityPair.city2 : route.cityPair.city1;

                                        // Update for next iteration
                                        currentCity = p2City;

                                        // Logic for "Drawing from Ends"
                                        // If we are in the second half, reverse the drawing direction (P2 -> P1)
                                        // so it visually flows From End -> Middle
                                        const isSecondHalf = idx >= midpoint;

                                        const drawStart = isSecondHalf ? getCityPos(p2City) : getCityPos(p1City);
                                        const drawEnd = isSecondHalf ? getCityPos(p1City) : getCityPos(p2City);

                                        // Delay calculation Start -> Mid <- End
                                        // Segments closer to ends have lower delay.
                                        const distFromEnd = isSecondHalf ? (totalSegments - 1 - idx) : idx;
                                        const delay = distFromEnd * 0.8; // 0.3s per segment

                                        return (
                                            <motion.line
                                                key={`win-path-${idx}`}
                                                x1={drawStart.x} y1={drawStart.y} x2={drawEnd.x} y2={drawEnd.y}
                                                stroke="#fbbf24" // Gold
                                                strokeWidth={25}
                                                strokeLinecap="round"
                                                initial={{ pathLength: 0, opacity: 0 }}
                                                animate={{ pathLength: 1, opacity: 1 }}
                                                transition={{
                                                    duration: 2,
                                                    delay: delay,
                                                    ease: "easeOut",
                                                    // No Repeat, stay visible
                                                }}
                                                style={{ filter: "drop-shadow(0 0 6px #fbbf24)" }}
                                            />
                                        );
                                    });
                                })()}
                            </g>
                        )}
                    </g>


                    {/* --- Cities --- */}
                    <g className="cities">
                        {Object.keys(CITY_COORDS).map((key) => {
                            const city = parseInt(key) as City;
                            const pos = getCityPos(city);


                            return (
                                <g
                                    key={`city-${key}`}
                                    onClick={() => setSelectedCity(city)}
                                    className="cursor-pointer group"
                                    style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
                                >
                                    <circle
                                        cx={pos.x}
                                        cy={pos.y}
                                        r={CITY_RADIUS}
                                        stroke={CITY_COLORS[city]}
                                        fill={CITY_COLORS[city]}
                                        strokeWidth={6}
                                        className="transition-all duration-200 group-hover:stroke-[10px]"
                                        filter="url(#token-shadow)"
                                    />
                                    <text
                                        x={pos.x}
                                        y={pos.y - CITY_RADIUS - 16}
                                        textAnchor="middle"
                                        fill={CITY_COLORS[city]}
                                        className="text-[24px] group-hover:text-[26px] font-bold uppercase pointer-events-none transition-all duration-200 tracking-widest"
                                        filter="url(#text-shadow)"
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

                            const label = SpaceType[space.type].replace(/([A-Z])/g, '$1').trim();

                            return (
                                <g
                                    key={index}
                                    transform={`translate(${x}, ${y})`}
                                    onClick={() => console.log(`Clicked Space: ${label}`)}
                                    className="cursor-pointer group"
                                    style={{ transition: 'opacity 0.2s' }}
                                >
                                    <rect
                                        width={width}
                                        height={height}
                                        fill={SPACE_COLORS[SPACES[index].type]}
                                        stroke={"rgba(0,0,0,0.2)"}
                                        strokeWidth={1}
                                        rx={4}
                                        className="transition-all duration-200 hover:filter-brightness-110 group-hover:stroke-[#fbbf24] group-hover:stroke-[3px]"
                                        filter="url(#token-shadow)"
                                    />
                                    {/* Overlay Gradient for depth */}
                                    <rect
                                        width={width}
                                        height={height}
                                        fill="url(#space-grad)"
                                        rx={4}
                                        className="pointer-events-none"
                                    />

                                    <text
                                        x={width / 2}
                                        y={height / 5}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        fill="#f1f1f5ff"
                                        style={{
                                            fontSize: isCorner ? '24px' : '22px',
                                        }}
                                        className="pointer-events-none tracking-wider"
                                        filter="url(#text-shadow)"
                                    >
                                        {label}
                                    </text>
                                    <rect
                                        x={0}
                                        y={0}
                                        width={width}
                                        height={height}
                                        fill="transparent"
                                        onMouseEnter={(e) => {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            setHoveredSpace({
                                                type: space.type,
                                                cost: space.cost,
                                                x: rect.left + rect.width / 2,
                                                y: rect.top
                                            });
                                        }}
                                        onMouseLeave={() => setHoveredSpace(null)}
                                    />
                                    {space.cost > 0 && (
                                        <text
                                            x={width / 2}
                                            y={height / 2 + 30}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            fill="#ffcc00ff"
                                            style={{ fontSize: '24px' }}
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
                                const group = playerGroups[pState.boardPosition] || [];
                                const index = group.indexOf(pId);
                                const offset = getPlayerOffset(index, group.length);
                                const color = getPlayerColor(pId);

                                return (
                                    <PlayerToken
                                        key={pId}
                                        playerId={pId}
                                        color={color}
                                        boardPosition={pState.boardPosition}
                                        offset={offset}
                                        addSound={addSound}
                                        getSoundDuration={getSoundDuration}
                                    />
                                );
                            })}
                        </g>
                    )}
                </svg>
            </div>
            {/* City Property Modal */}
            {
                selectedCity !== null && createPortal(
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
                        {/* Backdrop */}
                        <div
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto transition-opacity"
                            onClick={() => setSelectedCity(null)}
                        />

                        {/* Modal Content */}
                        <div className="relative pointer-events-auto transform transition-all animate-in fade-in zoom-in-95 duration-200">
                            <div className="transform scale-125">
                                <PropertyCard
                                    property={{ city: selectedCity, owner_PID: "" }}
                                    index={0}
                                    totalInStack={1}
                                />
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }

            {/* Space Tooltip */}
            {
                createPortal(
                    <AnimatePresence>
                        {hoveredSpace && (
                            <motion.div
                                key={`${hoveredSpace.x}-${hoveredSpace.y}`}
                                initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-90%" }}
                                animate={{ opacity: 1, scale: 1, x: "-50%", y: "-100%" }}
                                exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-90%" }}
                                transition={{ duration: 0.3 }}
                                className="fixed z-[10000] pointer-events-none px-4 py-2 bg-zinc-900/90 text-white rounded-lg shadow-xl border border-zinc-700 backdrop-blur-sm max-w-xs text-center font-cute"
                                style={{
                                    left: hoveredSpace.x,
                                    top: hoveredSpace.y - 10,
                                }}
                            >
                                <p className="text-md font-medium">
                                    {SPACE_DESCRIPTIONS[hoveredSpace.type].replace("{cost}", `$${hoveredSpace.cost / 1000}k`)}
                                </p>
                                <div
                                    className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-zinc-900/90"
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )
            }
            {/* Dice Animation Overlay */}
            {
                gameState && (
                    <DiceRollAnimation
                        dice1={gameState.dice1}
                        dice2={gameState.dice2}
                    />
                )
            }
        </main >
    );
}
