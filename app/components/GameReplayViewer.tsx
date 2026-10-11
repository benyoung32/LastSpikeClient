"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Player, GameState, GameHistoryTurnDiff, Route, Property, City, PLAYER_COLORS, TurnPhase } from "@/types";
import { VALID_CITY_PAIRS } from "@/lib/gameConstants";
import GameBoard from "./GameBoard";

interface GameReplayViewerProps {
    players: Player[];
    history: GameHistoryTurnDiff[];
    finalGameState?: GameState;
}

export interface ReplayFrame {
    turn: number;
    gameState: GameState;
}

// Helper to convert unknown/string/number city representation to City enum
function parseCityEnum(val: unknown): City | null {
    if (val === undefined || val === null) return null;
    if (typeof val === "number") {
        if (val in City) return val as City;
        return null;
    }
    if (typeof val === "string") {
        if (!isNaN(Number(val))) {
            const num = Number(val);
            if (num in City) return num as City;
        }
        const match = City[val as keyof typeof City];
        if (match !== undefined) return match as unknown as City;

        const lower = val.toLowerCase();
        for (const [key, value] of Object.entries(City)) {
            if (typeof value === "number" && key.toLowerCase() === lower) {
                return value as City;
            }
        }
    }
    return null;
}


// Module-level cache for reconstructed replay frames keyed by history array
const framesCache = new WeakMap<GameHistoryTurnDiff[], ReplayFrame[]>();

const GameReplayViewer = React.memo(function GameReplayViewer({ players, history }: GameReplayViewerProps) {
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [speedMultiplier, setSpeedMultiplier] = useState<1 | 2>(1);

    const getPlayerName = useCallback((pid?: string) => {
        if (!pid) return "Unknown";
        if (pid === "bank") return "Bank";
        const found = players.find(p => p.id === pid);
        return found?.name || pid.slice(0, 6);
    }, [players]);

    const getPlayerColor = useCallback((pid?: string) => {
        if (!pid) return "#a1a1aa";
        const idx = players.findIndex(p => p.id === pid);
        return idx >= 0 ? PLAYER_COLORS[idx % PLAYER_COLORS.length] : "#38bdf8";
    }, [players]);

    // Reconstruct full chronological frames from history diffs
    const frames = useMemo<ReplayFrame[]>(() => {
        if (!players || players.length === 0) return [];
        if (framesCache.has(history)) {
            return framesCache.get(history)!;
        }

        const sortedDiffs = [...history].sort((a, b) => a.turn - b.turn);

        // State baseline before Turn 1
        const initialPlayersState: GameState["players"] = {};

        players.forEach(p => {
            const startingMoney = 70000;
            initialPlayersState[p.id] = {
                money: startingMoney,
                boardPosition: 0,
                skipNextTurn: false
            };
        });

        const initialRoutes: Route[] = VALID_CITY_PAIRS.map(cp => ({
            cityPair: { city1: cp.city1, city2: cp.city2 },
            numTracks: 0
        }));

        const frameList: ReplayFrame[] = [];

        // Frame 0: Initial state
        frameList.push({
            turn: 0,
            gameState: {
                players: { ...initialPlayersState },
                routes: initialRoutes.map(r => ({ ...r, cityPair: { ...r.cityPair } })),
                properties: [],
                isGameOver: false,
                currentPlayerId: players[0]?.id || "",
                turnPhase: TurnPhase.Start,
                validActions: [],
                dice1: 0,
                dice2: 0,
                pendingTrade: null
            }
        });

        // Current cumulative state tracking
        const currentPlayersState: GameState["players"] = {};
        Object.entries(initialPlayersState).forEach(([id, p]) => {
            currentPlayersState[id] = { ...p };
        });
        const currentRoutes: Route[] = initialRoutes.map(r => ({ ...r, cityPair: { ...r.cityPair } }));
        const currentProperties: Property[] = [];
        let currentGameOver = false;

        sortedDiffs.forEach(diff => {
            const activePid = diff.currentPlayerId || "";

            // 1. Update Player changes
            if (diff.players) {
                Object.entries(diff.players).forEach(([pid, pDiff]) => {
                    if (!currentPlayersState[pid]) {
                        currentPlayersState[pid] = { money: 100000, boardPosition: 0, skipNextTurn: false };
                    }
                    if (pDiff.money !== undefined) {
                        currentPlayersState[pid].money = pDiff.money;
                    }
                    if (pDiff.boardPosition !== undefined) {
                        currentPlayersState[pid].boardPosition = pDiff.boardPosition;
                    }
                    if (pDiff.skipNextTurn !== undefined) {
                        currentPlayersState[pid].skipNextTurn = pDiff.skipNextTurn;
                    }
                });
            }

            // 2. Update Routes
            if (diff.routes && Array.isArray(diff.routes) && diff.routes.length > 0) {
                diff.routes.forEach(rDiff => {
                    const c1 = parseCityEnum(rDiff.cityPair?.city1);
                    const c2 = parseCityEnum(rDiff.cityPair?.city2);
                    if (c1 !== null && c2 !== null) {
                        const targetRoute = currentRoutes.find(cr =>
                            (cr.cityPair.city1 === c1 && cr.cityPair.city2 === c2) ||
                            (cr.cityPair.city1 === c2 && cr.cityPair.city2 === c1)
                        );
                        if (targetRoute) {
                            targetRoute.numTracks = rDiff.numTracks;
                        }
                    }
                });
            }

            // 3. Update Properties
            if (diff.properties && Array.isArray(diff.properties) && diff.properties.length > 0) {
                diff.properties.forEach(pDiff => {
                    const c = parseCityEnum(pDiff.city);
                    if (c !== null && pDiff.owner_PID) {
                        currentProperties.push({
                            city: c,
                            owner_PID: pDiff.owner_PID
                        });
                    }
                });
            }

            // 4. Game Over
            if (diff.isGameOver) {
                currentGameOver = true;
            }

            const clonedPlayers: GameState["players"] = {};
            Object.entries(currentPlayersState).forEach(([id, p]) => {
                clonedPlayers[id] = { ...p };
            });

            frameList.push({
                turn: diff.turn,
                gameState: {
                    players: clonedPlayers,
                    routes: currentRoutes.map(r => ({ ...r, cityPair: { ...r.cityPair } })),
                    properties: [...currentProperties],
                    isGameOver: currentGameOver,
                    currentPlayerId: activePid,
                    turnPhase: TurnPhase.Start,
                    validActions: [],
                    dice1: diff.dice1 ?? 0,
                    dice2: diff.dice2 ?? 0,
                    pendingTrade: null
                }
            });
        });

        framesCache.set(history, frameList);
        return frameList;
    }, [history, players]);

    // Track frame index with React 19 safe state adjustment
    const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(() => (frames.length > 1 ? 1 : 0));

    useEffect(() => {
        if (frames.length > 1) {
            setCurrentFrameIndex(prev => (prev === 0 ? 1 : Math.min(prev, frames.length - 1)));
        } else {
            setCurrentFrameIndex(0);
        }
    }, [frames.length]);

    // Auto-advance play timer
    useEffect(() => {
        if (!isPlaying) return;

        const interval = setInterval(() => {
            setCurrentFrameIndex(prev => {
                if (prev >= frames.length - 1) {
                    setIsPlaying(false);
                    return prev;
                }
                return prev + 1;
            });
        }, 1500 / speedMultiplier);

        return () => clearInterval(interval);
    }, [isPlaying, frames.length, speedMultiplier]);

    // Keyboard navigation (Left / Right / Space)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeTag = (document.activeElement?.tagName || "").toLowerCase();
            if (activeTag === "input" || activeTag === "textarea") return;

            if (e.key === "ArrowLeft") {
                e.preventDefault();
                setIsPlaying(false);
                setCurrentFrameIndex(prev => Math.max(0, prev - 1));
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                setIsPlaying(false);
                setCurrentFrameIndex(prev => Math.min(frames.length - 1, prev + 1));
            } else if (e.key === " " || e.code === "Space") {
                e.preventDefault();
                setIsPlaying(prev => !prev);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [frames.length]);

    const activeFrame = frames[currentFrameIndex] || frames[0];

    if (!activeFrame || frames.length === 0) {
        return (
            <div className="h-72 flex flex-col items-center justify-center text-center p-6 bg-zinc-900/40 border border-dashed border-zinc-800 rounded-xl max-w-sm mx-auto">
                <span className="text-4xl mb-2">🚂</span>
                <h3 className="text-lg font-bold text-zinc-300 mb-1">No Replay Available</h3>
                <p className="text-sm text-zinc-500">Play a game or check back when turns have completed.</p>
            </div>
        );
    }

    const maxTurnIndex = frames.length - 1;
    const progressPercent = maxTurnIndex > 0 ? (currentFrameIndex / maxTurnIndex) * 100 : 0;

    return (
        <section
            id="replay-viewer-container"
            aria-label="Game Replay"
            className="flex-1 min-h-0 w-full max-w-7xl mx-auto flex flex-col justify-between gap-2.5 select-none"
        >
            {/* MIDDLE ROW: GAME BOARD (LEFT) + PLAYERS INFO PANEL (RIGHT) */}
            <div className="flex-1 min-h-0 flex flex-row gap-2.5 sm:gap-3 items-stretch justify-center w-full">
                {/* 1. CENTERPIECE: GAMEBOARD VIEW */}
                <div className="flex-1 min-h-0 min-w-0 relative rounded-xl overflow-hidden border border-zinc-800 shadow-2xl bg-zinc-950/70 p-1.5 sm:p-2 flex items-center justify-center">
                    <GameBoard
                        players={players}
                        currentPlayerId={activeFrame.gameState.currentPlayerId}
                        gameState={activeFrame.gameState}
                        validRoutes={[]}
                        highlightWinningPath={activeFrame.gameState.isGameOver}
                        isReplay={true}
                        disableSounds={true}
                        className="w-full h-full max-w-full max-h-full flex items-center justify-center select-none"
                    />
                </div>

                {/* 2. PLAYERS INFO PANEL ON THE RIGHT */}
                <aside
                    aria-label="Players Information"
                    className="w-64 sm:w-72 lg:w-80 flex-shrink-0 flex flex-col bg-zinc-900/95 border border-zinc-800 rounded-xl p-3 shadow-xl min-h-0 justify-between"
                >
                    {/* Header: Title + Turn Counter */}
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800/80 flex-none">
                        <div className="flex items-center bg-zinc-950 px-2 py-0.5 rounded-lg border border-zinc-800 shadow-inner">
                            <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-bold mr-1">Turn</span>
                            <span
                                id={`timeline-turn-${activeFrame.turn}`}
                                className="text-sm font-mono font-black text-amber-400"
                            >
                                {activeFrame.turn === 0 ? "Start" : activeFrame.turn}
                            </span>
                            <span className="text-[11px] text-zinc-500 font-mono ml-1">/ {frames[frames.length - 1]?.turn}</span>
                        </div>
                    </div>

                    {/* Scrollable Player Cards List */}
                    <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-0.5">
                        {players.map(p => {
                            const isCurrent = p.id === activeFrame.gameState.currentPlayerId;
                            const pCash = activeFrame.gameState.players[p.id]?.money ?? 70000;

                            return (
                                <div
                                    key={p.id}
                                    className={`p-2 rounded-lg border transition-all ${isCurrent
                                        ? "bg-amber-500/10 border-amber-500/50 shadow-md ring-1 ring-amber-500/30"
                                        : "bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700/80"
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span
                                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: getPlayerColor(p.id) }}
                                            />
                                            <span className={`text-xs sm:text-sm font-bold truncate ${isCurrent ? "text-amber-200" : "text-zinc-200"}`}>
                                                {p.name}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs font-mono">
                                        <span className="text-emerald-400 font-bold">
                                            ${pCash.toLocaleString()}
                                        </span>
                                    </div>

                                </div>
                            );
                        })}
                    </div>
                </aside>
            </div>

            {/* 3. TRANSPORT CONTROLS & TIMELINE SCRUBBER */}
            <div className="flex-none bg-zinc-900/95 border border-zinc-800 rounded-xl px-3.5 py-2 sm:px-4 sm:py-2.5 shadow-xl space-y-1.5">
                {/* Scrub Slider with Progress fill */}
                <div className="space-y-0.5">
                    <div className="flex justify-between text-[11px] font-bold text-zinc-400">
                        <span>Turn 0</span>
                        <span className="text-amber-400 font-mono text-xs font-bold">
                            {activeFrame.turn === 0 ? "Initial State" : `Turn ${activeFrame.turn}`}
                        </span>
                        <span>Turn {frames[frames.length - 1]?.turn} (End)</span>
                    </div>

                    <div className="relative flex items-center w-full">
                        <input
                            id="replay-scrubber"
                            type="range"
                            min={0}
                            max={maxTurnIndex}
                            value={currentFrameIndex}
                            onChange={(e) => {
                                setIsPlaying(false);
                                setCurrentFrameIndex(Number(e.target.value));
                            }}
                            className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                            style={{
                                background: `linear-gradient(to right, #f59e0b ${progressPercent}%, #27272a ${progressPercent}%)`
                            }}
                            aria-label="Replay scrubber"
                        />
                    </div>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-between gap-3 pt-1 border-t border-zinc-800/80">
                    {/* Transport Buttons */}
                    <div className="flex items-center gap-1 sm:gap-1.5">
                        {/* Jump to start */}
                        <button
                            id="replay-btn-first"
                            onClick={() => {
                                setIsPlaying(false);
                                setCurrentFrameIndex(0);
                            }}
                            disabled={currentFrameIndex === 0}
                            title="First Turn"
                            className="px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-zinc-800 text-zinc-200 text-xs font-bold transition-all cursor-pointer"
                        >
                            ⏮
                        </button>

                        {/* Step back */}
                        <button
                            id="replay-btn-prev"
                            onClick={() => {
                                setIsPlaying(false);
                                setCurrentFrameIndex(prev => Math.max(0, prev - 1));
                            }}
                            disabled={currentFrameIndex === 0}
                            title="Previous Turn (←)"
                            className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-zinc-800 text-zinc-200 text-xs font-bold transition-all cursor-pointer"
                        >
                            ◀
                        </button>

                        {/* Play / Pause */}
                        <button
                            id="replay-btn-play"
                            onClick={() => {
                                if (currentFrameIndex >= maxTurnIndex) {
                                    setCurrentFrameIndex(0);
                                    setIsPlaying(true);
                                } else {
                                    setIsPlaying(prev => !prev);
                                }
                            }}
                            title="Play/Pause (Space)"
                            className="px-3 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs transition-all shadow-md cursor-pointer flex items-center gap-1"
                        >
                            {isPlaying ? "⏸ Pause" : "▶ Play"}
                        </button>

                        {/* Step forward */}
                        <button
                            id="replay-btn-next"
                            onClick={() => {
                                setIsPlaying(false);
                                setCurrentFrameIndex(prev => Math.min(maxTurnIndex, prev + 1));
                            }}
                            disabled={currentFrameIndex === maxTurnIndex}
                            title="Next Turn (→)"
                            className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-zinc-800 text-zinc-200 text-xs font-bold transition-all cursor-pointer"
                        >
                            ▶
                        </button>

                        {/* Jump to end */}
                        <button
                            id="replay-btn-last"
                            onClick={() => {
                                setIsPlaying(false);
                                setCurrentFrameIndex(maxTurnIndex);
                            }}
                            disabled={currentFrameIndex === maxTurnIndex}
                            title="Last Turn"
                            className="px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-zinc-800 text-zinc-200 text-xs font-bold transition-all cursor-pointer"
                        >
                            ⏭
                        </button>

                        {/* Speed Toggle */}
                        <button
                            id="replay-btn-speed"
                            onClick={() => setSpeedMultiplier(prev => (prev === 1 ? 2 : 1))}
                            title="Playback Speed"
                            className="ml-1 px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-xs font-mono font-bold text-amber-300 transition-all cursor-pointer"
                        >
                            {speedMultiplier}x
                        </button>
                    </div>

                    {/* Keyboard Hint */}
                    <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono">
                        <span>Use</span>
                        <kbd className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 rounded text-[10px] text-zinc-400">←</kbd>
                        <kbd className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 rounded text-[10px] text-zinc-400">→</kbd>
                        <kbd className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 rounded text-[10px] text-zinc-400">Space</kbd>
                    </div>
                </div>
            </div>
        </section>
    );
});

export default GameReplayViewer;
