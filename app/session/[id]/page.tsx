"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSession, getPlayer, startGame, getSessionPlayers, API_BASE_URL, getGameState } from "@/lib/api";
import { SessionData, Player, GameState } from "@/types";
import { useSignalR } from "@/app/context/SignalRContext";
import LobbyView from "@/app/components/LobbyView";
import GameBoard from "@/app/components/GameBoard";

export default function SessionPage() {
    const params = useParams();
    const router = useRouter();
    const sessionId = params.id as string;
    const { connection } = useSignalR();

    const [session, setSession] = useState<SessionData | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [gameState, setGameState] = useState<GameState | null>(null);
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


    const fetchPlayerList = useCallback(async () => {
        try {
            const playerIds = await getSessionPlayers(sessionId);
            setPlayers(playerIds);
        } catch (err: any) {
            console.error("Failed to fetch player list:", err);
            setError("Failed to load player list.");
        }
    }, [sessionId]);

    const fetchGameState = useCallback(async () => {
        try {
            if (!session?.boardId) {
                console.log(session)
                console.error("No board ID found for session");
                return;
            }
            const data = await getGameState(session.boardId);
            console.log("Game state:", data);
            setGameState(data);
        } catch (err: any) {
            console.error("Failed to fetch game state:", err);
            // Don't set error here to avoid blocking the UI if just the game state fails
        }
    }, [sessionId]);

    const fetchSessionData = useCallback(async () => {
        try {
            const sessionData = await getSession(sessionId);
            setSession(sessionData);

            // Fetch player details
            if (sessionData.playerIds && sessionData.playerIds.length > 0) {
                // TODO: add get session player endpoint which can read from the sessionplayers junction table
                const playerPromises = sessionData.playerIds.map((id) => getPlayer(id));
                const playersData = await Promise.all(playerPromises);
                setPlayers(playersData);
            }

            // If game is started, fetch game state
            if (sessionData.startTime) {
                fetchGameState();
            }

        } catch (err: any) {
            console.error("Failed to fetch session:", err);
            if (isLoading) {
                setError("Failed to load session. It might not exist.");
            }
        } finally {
            setIsLoading(false);
        }
    }, [sessionId, isLoading]);

    // SignalR Connection
    useEffect(() => {
        if (!sessionId || !connection) return;

        // Fetch initial data
        fetchSessionData();
        fetchPlayerList();

        // Join the SignalR group for this session
        if (currentPlayerId) {
            connection.invoke("JoinSession", sessionId, currentPlayerId)
                .catch((err) => console.error("Error joining SignalR session group:", err));
        }

        const onPlayerJoined = () => {
            console.log("PlayerJoined event received");
            fetchPlayerList();
        };

        const onPlayerRemoved = () => {
            console.log("PlayerRemoved event received");
            fetchPlayerList();
        };

        const onGameStarted = () => {
            console.log("GameStarted event received");
            fetchSessionData();
            fetchGameState();
        };

        connection.on("PlayerJoined", onPlayerJoined);
        connection.on("PlayerRemoved", onPlayerRemoved);
        connection.on("GameStarted", onGameStarted);

        return () => {
            connection.off("PlayerJoined", onPlayerJoined);
            connection.off("PlayerRemoved", onPlayerRemoved);
            connection.off("GameStarted", onGameStarted);
        };
    }, [sessionId, connection, currentPlayerId, fetchSessionData, fetchPlayerList, fetchGameState]);

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

    const isHost = !!(session.playerIds && session.playerIds.length > 0 && session.playerIds[0] === currentPlayerId);
    const hasGameStarted = !!session.startTime;

    if (hasGameStarted) {
        return (
            <GameBoard
                session={session}
                players={players}
                currentPlayerId={currentPlayerId}
                gameState={gameState}
            />
        );
    }

    return (
        <LobbyView
            sessionId={sessionId}
            players={players}
            currentPlayerId={currentPlayerId}
            isHost={isHost}
            isStarting={isStarting}
            onStartGame={handleStartGame}
        />
    );
}
