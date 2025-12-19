"use client";

// TODO: Add a leave session button. this button should return the user to the main menu, clear the session storage, and notify the server
// TODO: add a cancel session button. this button should delete the session, clear the session storage, and kick out other players
// TODO: the UI should be reworked. the playerlist should be on the left and the control panel on the right

import { Player } from "@/types";

interface LobbyViewProps {
    sessionId: string;
    players: Player[];
    currentPlayerId: string | null;
    isHost: boolean;
    isStarting: boolean;
    onStartGame: () => void;
}

export default function LobbyView({
    sessionId,
    players,
    currentPlayerId,
    isHost,
    isStarting,
    onStartGame
}: LobbyViewProps) {
    return (
        <main className="flex min-h-screen flex-col items-center bg-zinc-950 text-white p-6 md:p-12">
            <div className="w-full max-w-6xl space-y-8">

                {/* Header */}
                <div className="flex flex-col items-center space-y-2">
                    <div className="flex items-center space-x-2 text-zinc-400 bg-zinc-900/50 px-4 py-1 rounded-full border border-zinc-800">
                        <span className="text-sm select-none tracking-wider">Session ID:</span>
                        <span className="font-mono text-white select-all">{sessionId}</span>
                    </div>
                </div>

                {/* Main Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Game Status & Actions */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl flex flex-col justify-center min-h-[300px] space-y-8">
                            {/* Status Message */}
                            <div className="text-center space-y-4">
                                <div className="space-y-4">
                                    <h2 className="text-3xl font-medium text-white">
                                        {isHost ? "You are the Host" : "Waiting for the host to start..."}
                                    </h2>
                                    <p className="text-zinc-500 text-lg">
                                        Invite friends by sharing the URL or copying the Session ID.
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            {isHost && (
                                <div className="flex justify-center">
                                    <button
                                        onClick={onStartGame}
                                        disabled={isStarting || players.length < 2}
                                        className="px-12 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold text-xl rounded-xl shadow-lg shadow-green-900/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale"
                                    >
                                        {isStarting ? "Starting..." : "Start Game"}
                                    </button>
                                </div>
                            )}
                            {isHost && players.length < 2 && (
                                <p className="text-center text-amber-500/80 text-sm select-none">Waiting for at least one more player...</p>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Player List */}
                    <div className="lg:col-span-1">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl h-full flex flex-col">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-white select-none">Players</h3>
                                <span className="text-xs font-mono bg-zinc-800 text-zinc-400 px-2 py-1 rounded select-none">
                                    {players.length} / 6
                                </span>
                            </div>

                            <div className="space-y-3 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                                {players.map((player, index) => (
                                    <div
                                        key={player.id}
                                        className={`flex items-center space-x-3 p-3 rounded-xl border transition-all ${player.id === currentPlayerId
                                            ? "bg-amber-500/10 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                                            : "bg-zinc-950/50 border-zinc-800"
                                            }`}
                                    >
                                        <div
                                            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-inner ${index === 0 ? "bg-amber-500 text-black" : "bg-zinc-800 text-zinc-400"
                                                }`}
                                        >
                                            {`P${index + 1}`}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-medium truncate ${player.id === currentPlayerId ? "text-amber-400" : "text-zinc-200"}`}>
                                                {player.name || "Unknown Player"}
                                            </p>
                                            {player.id === currentPlayerId && (
                                                <p className="text-xs text-zinc-500">You</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {/* Empty slots placeholders (optional aesthetic choice) */}
                                {Array.from({ length: Math.max(0, 6 - players.length) }).map((_, i) => (
                                    <div key={`empty-${i}`} className="flex items-center space-x-3 p-3 rounded-xl border border-dashed border-zinc-800/50 bg-zinc-900/30 opacity-50">
                                        <div className="w-10 h-10 rounded-full bg-zinc-800/50"></div>
                                        <div className="h-4 w-24 bg-zinc-800/50 rounded animate-pulse"></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </main>
    );
}
