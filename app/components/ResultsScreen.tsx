"use client";

import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import { Player, GameState, GameHistoryTurnDiff, PLAYER_COLORS, SpaceType } from "@/types";
import { getGameHistory } from "@/lib/api";
import { SPACES } from "@/lib/gameConstants";
import GameReplayViewer from "./GameReplayViewer";

// Style Constants
const TAB_BTN = "px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer";
const TAB_ACTIVE = "bg-amber-500/20 text-amber-300 border border-amber-500/40";
const TAB_INACTIVE = "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50";

const CARD_BASE = "bg-zinc-900/80 border border-zinc-800 rounded-xl";

const BTN_SECONDARY = "bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 font-semibold transition-all cursor-pointer";
const BTN_CLOSE = "w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition-all cursor-pointer text-base font-bold";

const TABLE_ROW_GRID = "grid grid-cols-12 gap-4 p-3.5";

const TABLE_TH = "py-3 px-4";
const TABLE_TD = "py-2.5 px-4";
const CATEGORY_CELL = "py-2 px-4 text-s font-black uppercase tracking-wider text-amber-400/90";

const SPACE_TYPE_COLORS: Record<SpaceType, string> = {
    [SpaceType.Land]: "#3b82f6",
    [SpaceType.CPRSubsidy]: "#22c55e",
    [SpaceType.SettlerRents]: "#f97316",
    [SpaceType.Track]: "#eab308",
    [SpaceType.LandClaims]: "#8b5cf6",
    [SpaceType.Rebellion]: "#ef4444",
    [SpaceType.EndOfTrack]: "#64748b",
    [SpaceType.Scandal]: "#ec4899",
    [SpaceType.SurveyFees]: "#10b981",
    [SpaceType.RoadbedCosts]: "#6366f1",
};

const SPACE_TYPE_LABELS: Record<SpaceType, string> = {
    [SpaceType.CPRSubsidy]: "CPR Subsidy",
    [SpaceType.Track]: "Track",
    [SpaceType.SettlerRents]: "Settler Rents",
    [SpaceType.Land]: "Land",
    [SpaceType.RoadbedCosts]: "Roadbed Costs",
    [SpaceType.Rebellion]: "Rebellion",
    [SpaceType.EndOfTrack]: "End Of Track",
    [SpaceType.LandClaims]: "Land Claims",
    [SpaceType.SurveyFees]: "Survey Fees",
    [SpaceType.Scandal]: "Scandal",
};

const ALL_SPACE_TYPES: SpaceType[] = [
    SpaceType.CPRSubsidy,
    SpaceType.Track,
    SpaceType.SettlerRents,
    SpaceType.Land,
    SpaceType.RoadbedCosts,
    SpaceType.Rebellion,
    SpaceType.EndOfTrack,
    SpaceType.LandClaims,
    SpaceType.SurveyFees,
    SpaceType.Scandal,
];

interface ResultsScreenProps {
    boardId?: string;
    players: Player[];
    gameState?: GameState;
    isOpen: boolean;
    onClose: () => void;
    onReturnHome?: () => void;
    serverUpdateCount?: number;
}

type TabType = "analytics" | "timeline" | "standings" | "statistics";

export interface PrecomputedResults {
    playerTurnWealth: Record<string, Record<number, number>>;
    turnsList: number[];
    playerStatistics: {
        spaceLandings: Record<string, Record<SpaceType, number>>;
        tradesCompleted: Record<string, number>;
        tracksBuilt: Record<string, number>;
        propertiesAcquired: Record<string, number>;
        timesSkipped: Record<string, number>;
        turnsPlayed: Record<string, number>;
        peakCash: Record<string, number>;
    };
    standingsList: Array<{
        player: Player;
        money: number;
        propertiesCount: number;
    }>;
    chartData: {
        width: number;
        height: number;
        padding: number;
        polylines: Array<{
            player: Player;
            points: string;
            color: string;
        }>;
        firstTurn: number;
        lastTurn: number;
    } | null;
    statisticsTotals: {
        spaceTotals: Record<SpaceType, number>;
        totalTracks: number;
        totalProps: number;
        totalSkipped: number;
        maxPeakCash: number;
    };
}

export interface CachedResults {
    boardId: string;
    serverUpdateCount?: number;
    history: GameHistoryTurnDiff[];
    precomputed?: PrecomputedResults;
}

export const resultsCache = new Map<string, CachedResults>();

export function clearResultsCache(boardId?: string) {
    if (boardId) {
        resultsCache.delete(boardId);
    } else {
        resultsCache.clear();
    }
}

const ResultsScreenContent = memo(function ResultsScreenContent({
    boardId,
    players,
    gameState,
    onClose,
    onReturnHome,
    serverUpdateCount
}: Omit<ResultsScreenProps, "isOpen">) {
    const [activeTab, setActiveTab] = useState<TabType>("statistics");
    const [history, setHistory] = useState<GameHistoryTurnDiff[]>(() => {
        if (boardId) {
            const cached = resultsCache.get(boardId);
            if (cached && cached.history) return cached.history;
        }
        return [];
    });
    const [isLoading, setIsLoading] = useState<boolean>(() => {
        if (!boardId) return false;
        const cached = resultsCache.get(boardId);
        if (cached && cached.history && cached.history.length > 0) return false;
        return true;
    });
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Fetch history from API
    const loadHistory = useCallback(async (start?: number, end?: number) => {
        if (!boardId) {
            setErrorMessage("No Board ID");
            return;
        }

        const cached = resultsCache.get(boardId);
        if (!cached || !cached.history || cached.history.length === 0) {
            setIsLoading(true);
        }
        setErrorMessage(null);

        try {
            const data = await getGameHistory(boardId, start, end);
            const nextHistory = data || [];
            setHistory(nextHistory);
            resultsCache.set(boardId, {
                boardId,
                serverUpdateCount,
                history: nextHistory,
                precomputed: cached?.history === nextHistory ? cached.precomputed : undefined
            });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Load failed";
            console.error("Error loading game history:", err);
            setErrorMessage(msg);
        } finally {
            setIsLoading(false);
        }
    }, [boardId, serverUpdateCount]);

    // Initial load when opened or when serverUpdateCount triggers a new event from server
    useEffect(() => {
        if (!boardId) return;

        const cached = resultsCache.get(boardId);
        const isCacheFresh = cached &&
            cached.history.length > 0 &&
            (serverUpdateCount === undefined || cached.serverUpdateCount === serverUpdateCount);

        if (isCacheFresh) {
            if (history !== cached.history) {
                setHistory(cached.history);
            }
            setIsLoading(false);
            return;
        }

        loadHistory();
    }, [boardId, serverUpdateCount, loadHistory, history]);

    // Fast O(1) player color lookup map
    const playerColorMap = useMemo(() => {
        const map: Record<string, string> = {
            bank: "#71717a"
        };
        players.forEach((p, idx) => {
            map[p.id] = PLAYER_COLORS[idx % PLAYER_COLORS.length];
        });
        return map;
    }, [players]);

    const getPlayerColor = useCallback((pid?: string) => {
        if (!pid) return "#a1a1aa";
        return playerColorMap[pid] || "#38bdf8";
    }, [playerColorMap]);

    // Cumulative net worth analysis derived from diffs - only computes when history or players changes
    const { playerTurnWealth, turnsList } = useMemo(() => {
        const cached = boardId ? resultsCache.get(boardId) : undefined;
        if (cached?.precomputed?.playerTurnWealth && cached.history === history && (serverUpdateCount === undefined || cached.serverUpdateCount === serverUpdateCount)) {
            return {
                playerTurnWealth: cached.precomputed.playerTurnWealth,
                turnsList: cached.precomputed.turnsList
            };
        }

        const turns = history.map(h => h.turn).sort((a, b) => a - b);
        const wealthMap: Record<string, Record<number, number>> = {};
        players.forEach(p => {
            wealthMap[p.id] = {};
        });

        const currentBalances: Record<string, number> = {};
        players.forEach(p => {
            currentBalances[p.id] = 70000;
        });

        history.forEach(diff => {
            if (diff.players) {
                Object.entries(diff.players).forEach(([pid, pDiff]) => {
                    if (pDiff.money !== undefined) {
                        currentBalances[pid] = pDiff.money;
                    }
                });
            }

            players.forEach(p => {
                if (!wealthMap[p.id]) wealthMap[p.id] = {};
                wealthMap[p.id][diff.turn] = currentBalances[p.id] ?? 0;
            });
        });

        return {
            playerTurnWealth: wealthMap,
            turnsList: turns
        };
    }, [history, players, boardId, serverUpdateCount]);

    // Per-player statistics across all history turns - memoized on history, players, and gameState properties
    const playerStatistics = useMemo(() => {
        const cached = boardId ? resultsCache.get(boardId) : undefined;
        if (cached?.precomputed?.playerStatistics && cached.history === history && (serverUpdateCount === undefined || cached.serverUpdateCount === serverUpdateCount)) {
            return cached.precomputed.playerStatistics;
        }

        const spaceLandings: Record<string, Record<SpaceType, number>> = {};
        const tradesCompleted: Record<string, number> = {};
        const tracksBuilt: Record<string, number> = {};
        const propertiesAcquired: Record<string, number> = {};
        const timesSkipped: Record<string, number> = {};
        const turnsPlayed: Record<string, number> = {};
        const peakCash: Record<string, number> = {};

        players.forEach(p => {
            spaceLandings[p.id] = {
                [SpaceType.Scandal]: 0,
                [SpaceType.Track]: 0,
                [SpaceType.Land]: 0,
                [SpaceType.SettlerRents]: 0,
                [SpaceType.RoadbedCosts]: 0,
                [SpaceType.EndOfTrack]: 0,
                [SpaceType.Rebellion]: 0,
                [SpaceType.CPRSubsidy]: 0,
                [SpaceType.LandClaims]: 0,
                [SpaceType.SurveyFees]: 0,
            };
            tradesCompleted[p.id] = 0;
            tracksBuilt[p.id] = 0;
            propertiesAcquired[p.id] = 0;
            timesSkipped[p.id] = 0;
            turnsPlayed[p.id] = 0;
            peakCash[p.id] = 70000;
        });

        // Track peak properties per city across history
        const maxPerPlayerCity: Record<string, number> = {};

        history.forEach(diff => {
            const rawDiff = diff as Record<string, unknown>;

            // Check direct trade in diff if provided
            if (Array.isArray(rawDiff.trades)) {
                for (const t of rawDiff.trades as Array<{ player1Id?: string; player2Id?: string }>) {
                    if (t.player1Id && tradesCompleted[t.player1Id] !== undefined) tradesCompleted[t.player1Id]++;
                    if (t.player2Id && tradesCompleted[t.player2Id] !== undefined) tradesCompleted[t.player2Id]++;
                }
            } else if (rawDiff.trade && typeof rawDiff.trade === "object") {
                const t = rawDiff.trade as { player1Id?: string; player2Id?: string };
                if (t.player1Id && tradesCompleted[t.player1Id] !== undefined) tradesCompleted[t.player1Id]++;
                if (t.player2Id && tradesCompleted[t.player2Id] !== undefined) tradesCompleted[t.player2Id]++;
            }

            // Current player turns
            if (diff.currentPlayerId && turnsPlayed[diff.currentPlayerId] !== undefined) {
                turnsPlayed[diff.currentPlayerId]++;
            }

            // Routes placed during current player's turn
            if (diff.routes && diff.routes.length > 0 && diff.currentPlayerId && tracksBuilt[diff.currentPlayerId] !== undefined) {
                tracksBuilt[diff.currentPlayerId] += diff.routes.length;
            }

            // Player changes
            if (diff.players) {
                Object.entries(diff.players).forEach(([pid, pDiff]) => {
                    // Board Position & Space landings
                    if (pDiff.boardPosition !== undefined) {
                        const pos = ((pDiff.boardPosition % SPACES.length) + SPACES.length) % SPACES.length;
                        const spaceDef = SPACES[pos];
                        if (spaceDef && spaceLandings[pid]) {
                            spaceLandings[pid][spaceDef.type] = (spaceLandings[pid][spaceDef.type] || 0) + 1;
                        }
                    }

                    // Skip next turn
                    if (pDiff.skipNextTurn && timesSkipped[pid] !== undefined) {
                        timesSkipped[pid]++;
                    }

                    // Cash & peak cash
                    if (pDiff.money !== undefined) {
                        if (peakCash[pid] === undefined || pDiff.money > peakCash[pid]) {
                            peakCash[pid] = pDiff.money;
                        }
                    }
                });
            }

            // Properties in history diffs (track count per player per city on each turn)
            if (diff.properties && Array.isArray(diff.properties)) {
                const turnCounts: Record<string, number> = {};
                diff.properties.forEach(prop => {
                    if (prop.owner_PID && prop.city !== undefined) {
                        const key = `${prop.owner_PID.toLowerCase()}_${prop.city}`;
                        turnCounts[key] = (turnCounts[key] || 0) + 1;
                    }
                });
                Object.entries(turnCounts).forEach(([key, count]) => {
                    if (!maxPerPlayerCity[key] || count > maxPerPlayerCity[key]) {
                        maxPerPlayerCity[key] = count;
                    }
                });
            }
        });

        // Compute properties acquired per player
        // 1. Authoritative count from gameState.properties if available
        const propsFromGameState: Record<string, number> = {};
        if (gameState?.properties && Array.isArray(gameState.properties)) {
            players.forEach(p => {
                const pidLower = p.id.toLowerCase();
                propsFromGameState[p.id] = gameState.properties.filter(
                    pr => pr.owner_PID && pr.owner_PID.toLowerCase() === pidLower
                ).length;
            });
        }

        // 2. Count from history turns (peak cards held per city)
        const propsFromHistory: Record<string, number> = {};
        players.forEach(p => {
            const pidLower = p.id.toLowerCase();
            let total = 0;
            Object.entries(maxPerPlayerCity).forEach(([key, count]) => {
                if (key.startsWith(`${pidLower}_`)) {
                    total += count;
                }
            });
            propsFromHistory[p.id] = total;
        });

        // Combine: use gameState properties if available, or history peak properties
        players.forEach(p => {
            const gsCount = propsFromGameState[p.id];
            const histCount = propsFromHistory[p.id] || 0;
            if (gsCount !== undefined && gsCount > 0) {
                propertiesAcquired[p.id] = Math.max(gsCount, histCount);
            } else if (histCount > 0) {
                propertiesAcquired[p.id] = histCount;
            } else {
                propertiesAcquired[p.id] = gsCount ?? 0;
            }
        });

        return {
            spaceLandings,
            tradesCompleted,
            tracksBuilt,
            propertiesAcquired,
            timesSkipped,
            turnsPlayed,
            peakCash
        };
    }, [history, players, gameState?.properties, boardId, serverUpdateCount]);

    // Memoized Standings List - recomputed only when players/state updates
    const standingsList = useMemo(() => {
        const cached = boardId ? resultsCache.get(boardId) : undefined;
        if (cached?.precomputed?.standingsList && cached.history === history && (serverUpdateCount === undefined || cached.serverUpdateCount === serverUpdateCount)) {
            return cached.precomputed.standingsList;
        }

        return players
            .map(p => {
                const pState = gameState?.players[p.id];
                const ownedProps = gameState?.properties?.filter(pr => pr.owner_PID && pr.owner_PID.toLowerCase() === p.id.toLowerCase()).length
                    ?? playerStatistics.propertiesAcquired[p.id]
                    ?? 0;
                return {
                    player: p,
                    money: pState ? pState.money : 0,
                    propertiesCount: ownedProps
                };
            })
            .sort((a, b) => b.money - a.money);
    }, [players, gameState?.players, gameState?.properties, playerStatistics.propertiesAcquired, boardId, history, serverUpdateCount]);

    // Memoized Cash Trajectory Chart points - recomputed only when turnsList or wealthMap updates
    const chartData = useMemo(() => {
        const cached = boardId ? resultsCache.get(boardId) : undefined;
        if (cached?.precomputed?.chartData !== undefined && cached.history === history && (serverUpdateCount === undefined || cached.serverUpdateCount === serverUpdateCount)) {
            return cached.precomputed.chartData;
        }

        if (turnsList.length === 0) return null;

        let minCash = 0;
        let maxCash = 70000;
        players.forEach(p => {
            turnsList.forEach(t => {
                const val = playerTurnWealth[p.id]?.[t] ?? 0;
                if (val > maxCash) maxCash = val;
                if (val < minCash) minCash = val;
            });
        });

        const range = Math.max(1, maxCash - minCash);
        const width = 500;
        const height = 160;
        const padding = 25;

        const polylines = players.map(p => {
            const points = turnsList.map((t, idx) => {
                const val = playerTurnWealth[p.id]?.[t] ?? 0;
                const x = padding + (idx / Math.max(1, turnsList.length - 1)) * (width - 2 * padding);
                const y = height - padding - ((val - minCash) / range) * (height - 2 * padding);
                return `${x},${y}`;
            }).join(" ");

            return {
                player: p,
                points,
                color: playerColorMap[p.id] || "#38bdf8"
            };
        });

        return {
            width,
            height,
            padding,
            polylines,
            firstTurn: turnsList[0],
            lastTurn: turnsList[turnsList.length - 1]
        };
    }, [turnsList, playerTurnWealth, players, playerColorMap, boardId, history, serverUpdateCount]);

    // Memoized Statistics Table Aggregates
    const statisticsTotals = useMemo(() => {
        const cached = boardId ? resultsCache.get(boardId) : undefined;
        if (cached?.precomputed?.statisticsTotals && cached.history === history && (serverUpdateCount === undefined || cached.serverUpdateCount === serverUpdateCount)) {
            return cached.precomputed.statisticsTotals;
        }

        const spaceTotals: Record<SpaceType, number> = {} as Record<SpaceType, number>;
        ALL_SPACE_TYPES.forEach(sType => {
            spaceTotals[sType] = players.reduce(
                (acc, p) => acc + (playerStatistics.spaceLandings[p.id]?.[sType] || 0),
                0
            );
        });

        const totalTracks = players.reduce((acc, p) => acc + (playerStatistics.tracksBuilt[p.id] || 0), 0);
        const totalProps = players.reduce((acc, p) => acc + (playerStatistics.propertiesAcquired[p.id] || 0), 0);
        const totalSkipped = players.reduce((acc, p) => acc + (playerStatistics.timesSkipped[p.id] || 0), 0);
        const maxPeakCash = Math.max(0, ...players.map(p => playerStatistics.peakCash[p.id] || 0));

        return {
            spaceTotals,
            totalTracks,
            totalProps,
            totalSkipped,
            maxPeakCash
        };
    }, [players, playerStatistics, boardId, history, serverUpdateCount]);

    // Store precomputed results in cache
    useEffect(() => {
        if (boardId && history.length > 0) {
            resultsCache.set(boardId, {
                boardId,
                serverUpdateCount,
                history,
                precomputed: {
                    playerTurnWealth,
                    turnsList,
                    playerStatistics,
                    standingsList,
                    chartData,
                    statisticsTotals
                }
            });
        }
    }, [boardId, serverUpdateCount, history, playerTurnWealth, turnsList, playerStatistics, standingsList, chartData, statisticsTotals]);

    return (
        <div
            id="results-screen-backdrop"
            className="fixed inset-0 z-[100] flex flex-col bg-zinc-950/95 text-white animate-fade-in overflow-hidden"
            role="dialog"
            aria-modal="true"
        >
            {/* Header Section */}
            <header className="flex-none px-5 py-2.5 sm:px-6 sm:py-3 bg-zinc-950/80 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 shadow-xl">
                <div className="flex items-center gap-3">
                    <h1 className="text-xl sm:text-2xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-500">
                        Results
                    </h1>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-2">

                    <button
                        id="results-close-button"
                        onClick={onClose}
                        className={BTN_CLOSE}
                    >
                        ✕
                    </button>
                </div>
            </header>

            {/* Subheader / Tabs Bar */}
            <nav className="flex-none px-5 py-2 sm:px-6 sm:py-2 bg-zinc-900/60 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center space-x-1.5" role="tablist">
                    <button
                        id="tab-statistics"
                        role="tab"
                        aria-selected={activeTab === "statistics"}
                        onClick={() => setActiveTab("statistics")}
                        className={`${TAB_BTN} ${activeTab === "statistics" ? TAB_ACTIVE : TAB_INACTIVE}`}
                    >
                        Statistics
                    </button>

                    <button
                        id="tab-analytics"
                        role="tab"
                        aria-selected={activeTab === "analytics"}
                        onClick={() => setActiveTab("analytics")}
                        className={`${TAB_BTN} ${activeTab === "analytics" ? TAB_ACTIVE : TAB_INACTIVE}`}
                    >
                        Charts
                    </button>

                    <button
                        id="tab-timeline"
                        role="tab"
                        aria-selected={activeTab === "timeline"}
                        onClick={() => setActiveTab("timeline")}
                        className={`${TAB_BTN} ${activeTab === "timeline" ? TAB_ACTIVE : TAB_INACTIVE}`}
                    >
                        Replay
                    </button>

                    <button
                        id="tab-standings"
                        role="tab"
                        aria-selected={activeTab === "standings"}
                        onClick={() => setActiveTab("standings")}
                        className={`${TAB_BTN} ${activeTab === "standings" ? TAB_ACTIVE : TAB_INACTIVE}`}
                    >
                        Standings
                    </button>
                </div>
            </nav>

            {/* Error Banner */}
            {errorMessage && (
                <div className="flex-none px-6 py-2.5 bg-red-950/80 border-b border-red-800/50 text-red-200 text-sm flex items-center justify-between">
                    <span>{errorMessage}</span>
                </div>
            )}

            {/* Main Content Area */}
            <main className={`flex-1 min-h-0 ${activeTab === "timeline" ? "p-2.5 sm:p-3 overflow-hidden flex flex-col" : "overflow-y-auto p-6 space-y-6"}`}>
                {isLoading ? (
                    <div className="h-96 flex flex-col items-center justify-center text-zinc-400 space-y-3">
                        <div className="w-10 h-10 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
                    </div>
                ) : history.length === 0 ? (
                    <div className="h-72 flex flex-col items-center justify-center text-center p-6 bg-zinc-900/40 border border-dashed border-zinc-800 rounded-xl max-w-sm mx-auto">
                        <span className="text-4xl mb-2">🎲</span>
                        <h3 className="text-lg font-bold text-zinc-300 mb-4">No History</h3>
                        <button
                            id="empty-refresh-button"
                            onClick={() => loadHistory()}
                            className={`px-5 py-2 rounded-lg text-sm ${BTN_SECONDARY}`}
                        >
                            Refresh
                        </button>
                    </div>
                ) : (
                    <>
                        {/* TAB 1: REPLAY */}
                        {activeTab === "timeline" && (
                            <GameReplayViewer
                                players={players}
                                history={history}
                                finalGameState={gameState}
                            />
                        )}

                        {/* TAB 2: STANDINGS */}
                        {activeTab === "standings" && (
                            <section className="space-y-5" aria-label="Standings">
                                <div className={`${CARD_BASE} overflow-hidden shadow-xl`}>
                                    <div className={`${TABLE_ROW_GRID} bg-zinc-800/50 border-b border-zinc-700/40 text-sm font-bold text-zinc-400 uppercase`}>
                                        <div className="col-span-1 text-center">#</div>
                                        <div className="col-span-5">Player</div>
                                        <div className="col-span-3 text-right">Properties</div>
                                        <div className="col-span-3 text-right">Money</div>
                                    </div>

                                    {standingsList.map((item, idx) => (
                                        <div
                                            key={item.player.id}
                                            id={`standing-row-${idx}`}
                                            className={`${TABLE_ROW_GRID} border-b border-zinc-800 items-center ${idx === 0 ? "bg-amber-500/10" : ""}`}
                                        >
                                            <div className="col-span-1 text-center font-bold text-base">
                                                {idx === 0 ? "👑" : idx + 1}
                                            </div>
                                            <div className="col-span-5 flex items-center gap-2.5">
                                                <span
                                                    className="w-3.5 h-3.5 rounded-full"
                                                    style={{ backgroundColor: getPlayerColor(item.player.id) }}
                                                />
                                                <span className="text-base font-semibold text-zinc-100">
                                                    {item.player.name}
                                                </span>
                                            </div>
                                            <div className="col-span-3 text-right font-mono text-sm text-zinc-300">
                                                {item.propertiesCount}
                                            </div>
                                            <div className="col-span-3 text-right font-mono text-base font-bold text-emerald-400">
                                                ${item.money.toLocaleString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* TAB 3: CHARTS */}
                        {activeTab === "analytics" && (
                            <section className="space-y-4" aria-label="Charts">
                                <div className={`${CARD_BASE} p-5 shadow-xl`}>
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3 mb-4">
                                        <h3 className="text-base font-bold text-amber-300">
                                            Money
                                        </h3>

                                        <div className="flex flex-wrap items-center gap-3.5">
                                            {players.map(p => (
                                                <div key={p.id} className="flex items-center gap-2 text-sm">
                                                    <span
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: getPlayerColor(p.id) }}
                                                    />
                                                    <span className="text-zinc-200">{p.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {!chartData ? (
                                        <div className="h-60 flex items-center justify-center text-zinc-600 text-sm">
                                            -
                                        </div>
                                    ) : (
                                        <div className="w-full overflow-x-auto">
                                            <div className="min-w-[500px] h-60 relative flex flex-col justify-between p-3.5 bg-zinc-950/60 rounded-lg border border-zinc-800">
                                                <svg className="w-full h-full" viewBox={`0 0 ${chartData.width} ${chartData.height}`}>
                                                    <line x1={chartData.padding} y1={chartData.padding} x2={chartData.width - chartData.padding} y2={chartData.padding} stroke="#27272a" strokeDasharray="3 3" />
                                                    <line x1={chartData.padding} y1={chartData.height / 2} x2={chartData.width - chartData.padding} y2={chartData.height / 2} stroke="#27272a" strokeDasharray="3 3" />
                                                    <line x1={chartData.padding} y1={chartData.height - chartData.padding} x2={chartData.width - chartData.padding} y2={chartData.height - chartData.padding} stroke="#27272a" />

                                                    {chartData.polylines.map(({ player, points, color }) => (
                                                        <g key={player.id}>
                                                            <polyline
                                                                fill="none"
                                                                stroke={color}
                                                                strokeWidth="2.5"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                points={points}
                                                            >
                                                                <title>{player.name}</title>
                                                            </polyline>
                                                        </g>
                                                    ))}
                                                </svg>

                                                <div className="flex justify-between text-xs text-zinc-500 pt-1.5 border-t border-zinc-800">
                                                    <span>T{chartData.firstTurn}</span>
                                                    <span>T{chartData.lastTurn}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}

                        {/* TAB 4: STATISTICS */}
                        {activeTab === "statistics" && (
                            <section className="space-y-4" aria-label="Statistics">
                                <div id="statistics-table-container" className={`${CARD_BASE} p-5 shadow-xl overflow-x-auto`}>
                                    <table id="statistics-table" className="w-full text-left border-collapse min-w-[600px]">
                                        <thead>
                                            <tr className="border-b border-zinc-800 text-sm font-bold text-zinc-400 uppercase">
                                                <th className={TABLE_TH}></th>
                                                {players.map(p => (
                                                    <th key={p.id} className={`${TABLE_TH} text-center`}>
                                                        <div className="flex items-center justify-center gap-2">
                                                            <span
                                                                className="w-3 h-3 rounded-full flex-shrink-0"
                                                                style={{ backgroundColor: getPlayerColor(p.id) }}
                                                            />
                                                            <span className="text-zinc-200">{p.name}</span>
                                                        </div>
                                                    </th>
                                                ))}
                                                <th className={`${TABLE_TH} text-center text-zinc-500 font-semibold`}>Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-800/60 text-sm">
                                            {/* Spaces Landed On Header */}
                                            <tr className="bg-zinc-800/40">
                                                <td
                                                    colSpan={players.length + 2}
                                                    className={CATEGORY_CELL}
                                                >
                                                    Spaces Landed On
                                                </td>
                                            </tr>

                                            {ALL_SPACE_TYPES.map(sType => {
                                                const totalForSpace = statisticsTotals.spaceTotals[sType] || 0;
                                                const sName = SPACE_TYPE_LABELS[sType];
                                                const sColor = SPACE_TYPE_COLORS[sType];
                                                const rowId = `stat-row-${sName.toLowerCase().replace(/\s+/g, "-")}`;

                                                return (
                                                    <tr key={sType} id={rowId} className="hover:bg-zinc-800/30 transition-colors">
                                                        <td className={`${TABLE_TD} text-zinc-200`}>
                                                            <div className="flex items-center gap-2.5">
                                                                <span
                                                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                                    style={{ backgroundColor: sColor }}
                                                                />
                                                                <span>{sName}</span>
                                                            </div>
                                                        </td>
                                                        {players.map(p => {
                                                            const val = playerStatistics.spaceLandings[p.id]?.[sType] || 0;
                                                            return (
                                                                <td key={p.id} className={`${TABLE_TD} text-center font-mono text-zinc-300`}>
                                                                    {val}
                                                                </td>
                                                            );
                                                        })}
                                                        <td className={`${TABLE_TD} text-center font-mono font-bold text-zinc-400`}>
                                                            {totalForSpace}
                                                        </td>
                                                    </tr>
                                                );
                                            })}

                                            {/* Trading & Actions */}
                                            <tr className="bg-zinc-800/40">
                                                <td
                                                    colSpan={players.length + 2}
                                                    className={CATEGORY_CELL}
                                                >
                                                    Actions
                                                </td>
                                            </tr>

                                            {/* Tracks Built */}
                                            <tr id="stat-row-tracks-built" className="hover:bg-zinc-800/30 transition-colors">
                                                <td className={`${TABLE_TD} text-zinc-200`}>Tracks Laid</td>
                                                {players.map(p => (
                                                    <td key={p.id} className={`${TABLE_TD} text-center font-mono`}>
                                                        {playerStatistics.tracksBuilt[p.id] || 0}
                                                    </td>
                                                ))}
                                                <td className={`${TABLE_TD} text-center font-mono font-bold`}>
                                                    {statisticsTotals.totalTracks}
                                                </td>
                                            </tr>

                                            {/* Properties Acquired */}
                                            <tr id="stat-row-properties-acquired" className="hover:bg-zinc-800/30 transition-colors">
                                                <td className={`${TABLE_TD} text-zinc-200`}>Properties Acquired</td>
                                                {players.map(p => (
                                                    <td key={p.id} className={`${TABLE_TD} text-center font-mono text-zinc-300`}>
                                                        {playerStatistics.propertiesAcquired[p.id] || 0}
                                                    </td>
                                                ))}
                                                <td className={`${TABLE_TD} text-center font-mono font-bold text-zinc-400`}>
                                                    {statisticsTotals.totalProps}
                                                </td>
                                            </tr>

                                            {/* Turns Skipped */}
                                            <tr id="stat-row-times-skipped" className="hover:bg-zinc-800/30 transition-colors">
                                                <td className={`${TABLE_TD} text-zinc-200`}>Turns Skipped</td>
                                                {players.map(p => (
                                                    <td key={p.id} className={`${TABLE_TD} text-center font-mono`}>
                                                        {playerStatistics.timesSkipped[p.id] || 0}
                                                    </td>
                                                ))}
                                                <td className={`${TABLE_TD} text-center font-mono font-bold`}>
                                                    {statisticsTotals.totalSkipped}
                                                </td>
                                            </tr>

                                            {/* Peak Cash */}
                                            <tr id="stat-row-peak-cash" className="hover:bg-zinc-800/30 transition-colors">
                                                <td className={`${TABLE_TD} text-zinc-200`}>Peak Cash</td>
                                                {players.map(p => (
                                                    <td key={p.id} className={`${TABLE_TD} text-center font-mono text-emerald-400 font-semibold`}>
                                                        ${(playerStatistics.peakCash[p.id] || 0).toLocaleString()}
                                                    </td>
                                                ))}
                                                <td className={`${TABLE_TD} text-center font-mono font-bold text-emerald-300`}>
                                                    ${statisticsTotals.maxPeakCash.toLocaleString()}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}
                    </>
                )}
            </main>
        </div>
    );
});

// Memoized exported component that returns null immediately when closed
const ResultsScreen = memo(function ResultsScreen(props: ResultsScreenProps) {
    if (!props.isOpen) return null;
    return <ResultsScreenContent {...props} />;
});

export default ResultsScreen;
