"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSession, getPlayer, startGame } from "@/lib/api";
import { SessionData, Player } from "@/types";

export default function SessionPage() {
    const params = useParams();
    const router = useRouter();
    const sessionId = params.id as string;

    const [session, setSession] = useState<SessionData | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isStarting, setIsStarting] = useState(false);

    // Load current player ID from local storage
    useEffect(() => {
        const storedId = localStorage.getItem("playerId");
        if (!storedId) {
            router.push("/");
            return;
        }
        setCurrentPlayerId(storedId);
    }, [router]);

    const fetchSessionData = useCallback(async () => {
        try {
            const sessionData = await getSession(sessionId);
            setSession(sessionData);

            // Fetch player details
            if (sessionData.playerIds && sessionData.playerIds.length > 0) {
                const playerPromises = sessionData.playerIds.map((id) => getPlayer(id));
                const playersData = await Promise.all(playerPromises);
                setPlayers(playersData);
            }

            // // Check if game has started (startTime is set)
            // if (sessionData.startTime) {
            //     // Redirect to game board or show game UI (for now just log or stay here)
            //     // The prompt says "The host should see a start game button, while other players see a waiting for host to start."
            //     // It doesn't explicitly say what happens AFTER start, but usually it goes to the game.
            //     // For this task, we just need the lobby.
            // }

        } catch (err: any) {
            console.error("Failed to fetch session:", err);
            // Don't set error on polling failure to avoid flickering, unless it's the first load
            if (isLoading) {
                setError("Failed to load session. It might not exist.");
            }
        } finally {
            setIsLoading(false);
        }
    }, [sessionId, isLoading]);

    // // Initial load and polling
    // useEffect(() => {
    //     if (!sessionId) return;

    //     fetchSessionData();

    //     const intervalId = setInterval(fetchSessionData, 2000); // Poll every 2 seconds

    //     return () => clearInterval(intervalId);
    // }, [sessionId, fetchSessionData]);

    const handleStartGame = async () => {
        if (!currentPlayerId) return;
        setIsStarting(true);
        try {
            await startGame(sessionId, currentPlayerId);
            // Refresh immediately
            fetchSessionData();
        } catch (err: any) {
            console.error(err);
            alert("Failed to start game: " + err.message);
        } finally {
            setIsStarting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black text-white">
                <div className="animate-pulse text-xl text-zinc-400">Loading Lobby...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black text-white">
                <div className="text-red-400">{error}</div>
                <button onClick={() => router.push("/")} className="ml-4 underline text-zinc-400">Go Home</button>
            </div>
        );
    }

    if (!session) return null;

    const isHost = session.playerIds && session.playerIds.length > 0 && session.playerIds[0] === currentPlayerId;
    const hasGameStarted = !!session.startTime;

    return (
        <main className="flex min-h-screen flex-col items-center bg-zinc-950 text-white p-8">
            <div className="w-full max-w-2xl space-y-8">

                {/* Header */}
                <div className="flex flex-col items-center space-y-2">
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-600">
                        Lobby
                    </h1>
                    <div className="flex items-center space-x-2 text-zinc-400 bg-zinc-900/50 px-4 py-1 rounded-full border border-zinc-800">
                        <span className="text-sm uppercase tracking-wider">Session ID:</span>
                        <span className="font-mono text-white">{sessionId}</span>
                    </div>
                </div>

                {/* Main Content */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl space-y-8">

                    {/* Status Message */}
                    <div className="text-center space-y-4">
                        {hasGameStarted ? (
                            <div className="text-green-400 text-xl font-semibold animate-pulse">
                                Game has started!
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <h2 className="text-xl font-medium text-white">
                                    {isHost ? "You are the Host" : "Waiting for host to start..."}
                                </h2>
                                <p className="text-zinc-500 text-sm">
                                    {players.length} player{players.length !== 1 ? "s" : ""} connected
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Player List */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider ml-1">Players</h3>
                        <div className="grid gap-3">
                            {players.map((player, index) => (
                                <div
                                    key={player.id}
                                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${player.id === currentPlayerId
                                        ? "bg-amber-500/10 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                                        : "bg-zinc-950/50 border-zinc-800"
                                        }`}
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${index === 0 ? "bg-amber-500 text-black" : "bg-zinc-800 text-zinc-400"
                                            }`}>
                                            {index === 0 ? "H" : index + 1}
                                        </div>
                                        <span className={`font-medium ${player.id === currentPlayerId ? "text-amber-400" : "text-zinc-300"}`}>
                                            {player.name || "Unknown Player"}
                                        </span>
                                    </div>
                                    {player.id === currentPlayerId && (
                                        <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full">You</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    {!hasGameStarted && isHost && (
                        <div className="pt-4">
                            <button
                                onClick={handleStartGame}
                                disabled={isStarting}
                                className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold text-lg rounded-xl shadow-lg shadow-green-900/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isStarting ? "Starting..." : "Start Game"}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
