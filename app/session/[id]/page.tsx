"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSession, getPlayer, startGame, getSessionPlayers, API_BASE_URL, getGameState, selectAction, offerTrade, respondToTrade } from "@/lib/api";
import { SessionData, Player, GameState, City, createEmptyGameState, ActionType, Route, PLAYER_COLORS, Trade } from "@/types";
import { VALID_CITY_PAIRS } from "@/lib/gameConstants";
import { useSignalR } from "@/app/context/SignalRContext";
import LobbyView from "@/app/components/LobbyView";
import GameBoard from "@/app/components/GameBoard";
import ActionBar from "@/app/components/ActionBar";
import { PlayerInfoPanel } from "@/app/components/PlayerInfoPanel";
import GameOverScreen from "@/app/components/GameOverScreen";
import TradeWindow from "@/app/components/TradeWindow";
import { useGameSounds } from "@/app/hooks/useGameSounds";

const INFO_PANEL_POSITIONS = [
    "bottom-4 left-[15vw] -translate-x-1/2", // Slot 0: User (Bottom Left)
    "bottom-4 right-[15vw] translate-x-1/2", // Slot 1: Bottom Right
    "top-4 right-[15vw] translate-x-1/2",     // Slot 2: Top Right
    "top-4 left-[15vw] -translate-x-1/2",      // Slot 3: Top Left
    "top-1/2 right-4 -translate-y-1/2 origin-right",      // Slot 4: Right Edge
    "top-1/2 left-4 -translate-y-1/2 origin-left"        // Slot 5: Left Edge
];


export default function SessionPage() {
    const params = useParams();
    const router = useRouter();
    const sessionId = params.id as string;
    const { connection } = useSignalR();

    const [session, setSession] = useState<SessionData | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [gameState, setGameState] = useState<GameState>(createEmptyGameState());
    const [clientPlayerId, setClientPlayerId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isStarting, setIsStarting] = useState(false);
    const [validActions, setValidActions] = useState<ActionType[]>([]);
    const [selectableRoutes, setSelectableRoutes] = useState<Route[]>([]);
    const [isTradeWindowOpen, setIsTradeWindowOpen] = useState(false);
    const [isProcessingAction, setIsProcessingAction] = useState(false);
    const [gameOverAnimationPlaying, setGameOverAnimationPlaying] = useState(false);
    const [gameOverScreenVisible, setGameOverScreenVisible] = useState(false);
    const { addSound } = useGameSounds();

    // Use a ref to access the latest session in callbacks/effects without triggering re-runs
    const sessionRef = useRef(session);
    useEffect(() => {
        sessionRef.current = session;
    }, [session]);

    // Load current player ID from local storage
    useEffect(() => {
        const storedId = sessionStorage.getItem("playerId");
        if (!storedId) {
            router.push(`/?joinSession=${sessionId}`);
            return;
        }
        setClientPlayerId(storedId);
    }, [router]);


    const fetchPlayerList = useCallback(async () => {
        try {
            const playerIds = await getSessionPlayers(sessionId);
            console.log("Player list:", playerIds);
            setPlayers(playerIds);
        } catch (err: any) {
            console.error("Failed to fetch player list:", err);
            setError("Failed to load player list.");
        }
    }, [sessionId]);

    // Use a ref to access the latest gameState in callbacks/effects without triggering re-runs
    const gameStateRef = useRef(gameState);
    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    const fetchGameState = useCallback(async (boardId?: string) => {
        try {
            const bid = boardId || sessionRef.current?.boardId;
            if (!bid) return;

            const data = await getGameState(bid);
            console.log("Game state:", data);

            const currentValidActions = (data.currentPlayerId === clientPlayerId ? data.validActions : []).map(a => Number(a)) as ActionType[];
            const nextSelectableRoutes = getValidRoutes(data, currentValidActions);

            setValidActions([]);
            setSelectableRoutes([]);

            const currentGameState = gameStateRef.current;
            let maxDelay = 0;
            let hasPositionChange = false;

            const currentDice1 = currentGameState?.dice1 || 0;
            const currentDice2 = currentGameState?.dice2 || 0;

            if (data.dice1 !== 0 && (data.dice1 !== currentDice1 || data.dice2 !== currentDice2)) {
                // Update only dice first
                setGameState(prev => ({
                    ...prev,
                    dice1: data.dice1,
                    dice2: data.dice2
                }));
                // Wait for animation
                await new Promise(resolve => setTimeout(resolve, 3000));
            }

            // Check for position changes
            if (currentGameState && currentGameState.players && Object.keys(currentGameState.players).length > 0) {
                Object.keys(data.players).forEach(pId => {
                    const oldP = currentGameState.players[pId];
                    const newP = data.players[pId];

                    if (oldP && newP && oldP.boardPosition !== newP.boardPosition) {
                        hasPositionChange = true;
                        // Calculate steps for delay (Circular board of 20 spaces)
                        // This logic matches GameBoard movement calculation
                        const diff = (newP.boardPosition - oldP.boardPosition + 20) % 20;
                        // Each step is max 0.5s. Adding small buffer.
                        const duration = diff * 0.4 * 1000;
                        if (duration > maxDelay) maxDelay = duration;
                    }
                });
            }

            if (hasPositionChange) {
                // 1. Update ONLY positions first
                const intermediateState = {
                    ...currentGameState,
                    players: { ...data.players },
                    dice1: data.dice1,
                    dice2: data.dice2
                };
                setGameState(intermediateState);

                // 2. Wait for animation, then update the rest
                // Adding 100ms buffer
                setTimeout(() => {
                    setGameState(data);
                    setValidActions(currentValidActions);
                    setSelectableRoutes(nextSelectableRoutes);
                }, maxDelay);

            } else {
                setGameState(data);
                setValidActions(currentValidActions);
                setSelectableRoutes(nextSelectableRoutes);
            }
        } catch (err: any) {
            console.error("Failed to fetch game state:", err);
        }
    }, [clientPlayerId]);

    // // Effect for turn start sound
    // useEffect(() => {
    //     if (!gameState || !clientPlayerId) return;
    // }, [gameState, clientPlayerId]);

    // Store previous turn info to detect EDGES
    const prevTurnInfo = useRef<{ playerId: string; phase: number } | null>(null);

    useEffect(() => {
        if (!gameState || !clientPlayerId) return;

        const currentTurnInfo = {
            playerId: gameState.currentPlayerId,
            phase: gameState.turnPhase
        };

        const isMyTurn = gameState.currentPlayerId === clientPlayerId;
        const isStartPhase = gameState.turnPhase === 0; // TurnPhase.Start

        // Check if we just transitioned INTO "My Turn Start Phase"
        const wasNotMyTurnStart = !prevTurnInfo.current ||
            prevTurnInfo.current.playerId !== clientPlayerId ||
            prevTurnInfo.current.phase !== 0;

        if (isMyTurn && isStartPhase && wasNotMyTurnStart) {
            addSound('bell');
        }

        prevTurnInfo.current = currentTurnInfo;
    }, [gameState, clientPlayerId, addSound]);

    // Game Over Animation Effect
    useEffect(() => {
        if (gameState.isGameOver) {
            setGameOverAnimationPlaying(true);
            const timer = setTimeout(() => {
                setGameOverAnimationPlaying(false);
                setGameOverScreenVisible(true);
            }, 10000); // 10 seconds
            return () => clearTimeout(timer);
        }
    }, [gameState.isGameOver]);



    const getOrderedPlayers = useCallback(() => {
        if (!players || players.length === 0 || !clientPlayerId) return [];
        const myIndex = players.findIndex(p => p.id === clientPlayerId);
        if (myIndex === -1) return players;
        return [...players.slice(myIndex), ...players.slice(0, myIndex)];
    }, [players, clientPlayerId]);

    const fetchSessionData = useCallback(async (shouldHandleLoadingState = false) => {
        try {
            const sessionData = await getSession(sessionId);
            setSession(sessionData);

            console.log('fetching session data', sessionData)
            // Fetch player details
            if (sessionData.playerIds && sessionData.playerIds.length > 0) {
                // TODO: add get session player endpoint which can read from the sessionplayers junction table
                const playerPromises = sessionData.playerIds.map((id) => getPlayer(id));
                const playersData = await Promise.all(playerPromises);
                setPlayers(playersData);
            }

            // If game is started, fetch game state
            if (sessionData.startTime && sessionData.boardId) {
                // Pass the boardId explicitly so we don't rely on the potentially stale (or soon to be updated) session state
                fetchGameState(sessionData.boardId);
            }

        } catch (err: any) {
            console.error("Failed to fetch session:", err);
            if (shouldHandleLoadingState) {
                setError("Failed to load session. It might not exist.");
            }
        } finally {
            if (shouldHandleLoadingState) {
                setIsLoading(false);
            }
        }
    }, [sessionId, fetchGameState]);

    // SignalR Connection
    // Initial Data Fetch
    useEffect(() => {
        if (!sessionId) return;
        fetchSessionData(true);
        fetchPlayerList();
    }, [sessionId, fetchSessionData, fetchPlayerList]);

    // SignalR Connection
    useEffect(() => {
        if (!sessionId || !connection) return;

        // Join the SignalR group for this session
        if (clientPlayerId) {
            connection.invoke("JoinSession", sessionId, clientPlayerId)
                .catch((err) => console.error("Error joining SignalR session group:", err));
        }

        const onPlayerJoined = () => {
            console.log("PlayerJoined event received");
            // Add a small delay to allow the backend to update its read model/database
            setTimeout(() => {
                fetchPlayerList();
            }, 300);
        };

        const onPlayerRemoved = () => {
            console.log("PlayerRemoved event received");
            // Add a small delay to allow the backend to update its read model/database
            setTimeout(() => {
                fetchPlayerList();
            }, 300);
        };

        const onGameStarted = () => {
            console.log("GameStarted event received");
            setTimeout(() => {
                fetchSessionData(false);
            }, 300);
        };

        const onGameBoardUpdated = () => {
            fetchGameState();
            console.log("GameBoardUpdated event received");
        }

        connection.on("PlayerJoined", onPlayerJoined);
        connection.on("PlayerRemoved", onPlayerRemoved);
        connection.on("GameStarted", onGameStarted);
        connection.on("GameBoardUpdated", onGameBoardUpdated);
        return () => {
            connection.off("PlayerJoined", onPlayerJoined);
            connection.off("PlayerRemoved", onPlayerRemoved);
            connection.off("GameStarted", onGameStarted);
            connection.off("GameBoardUpdated", onGameBoardUpdated);
        };
    }, [sessionId, connection, clientPlayerId, fetchPlayerList, fetchSessionData]);

    const handleStartGame = async () => {
        if (!clientPlayerId) return;
        setIsStarting(true);
        try {
            await startGame(sessionId, clientPlayerId);
            // Refresh immediately
            fetchSessionData();
        } catch (err: any) {
            console.error(err);
            alert("Failed to start game: " + err.message);
        } finally {
            setIsStarting(false);
        }
    };

    const getRebellionTargets = (state: GameState): Route[] => {
        console.log(state.routes);
        return state.routes.filter(route => route.numTracks > 1 && route.numTracks < 4);
    }

    const getBuildableRoutes = (state: GameState): Route[] => {
        return VALID_CITY_PAIRS.map(cityPair => {
            // Compare by value since object references will differ
            const existingRoute = state.routes.find(route =>
                route.cityPair.city1 === cityPair.city1 && route.cityPair.city2 === cityPair.city2
            );

            return existingRoute ? (existingRoute.numTracks < 4 ? existingRoute : null) : { cityPair, numTracks: 0 };
        }).filter((route): route is Route => route !== null);
    }

    const getValidRoutes = (state: GameState, actions: ActionType[]) => {
        if (actions.includes(ActionType.Rebellion)) {
            console.log("targets", getRebellionTargets(state));
            return getRebellionTargets(state);
        }
        if (actions.includes(ActionType.PlaceTrack)) {
            return getBuildableRoutes(state);
        }
        // console.log(actions);
        return [];
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

    const isHost = !!(session.playerIds && session.playerIds.length > 0 && session.playerIds[0] === clientPlayerId);
    const hasGameStarted = !!session.startTime;

    // Show Game Over Screen ONLY if visible (after animation)
    if (gameOverScreenVisible) {
        return (
            <GameOverScreen
                players={players}
                playerStates={gameState.players}
                onReturnHome={() => router.push("/")}
            />
        );
    }

    if (hasGameStarted) {
        return (
            <>
                <GameBoard
                    session={session}
                    players={players}
                    currentPlayerId={clientPlayerId}
                    gameState={gameState}
                    onRouteSelect={(async (route: Route) => {
                        console.log("Selected Route:", route.cityPair);
                        if (!session || !clientPlayerId) return;
                        await selectAction(session.boardId, clientPlayerId, gameState.validActions[0], route.cityPair);
                    })}
                    validRoutes={selectableRoutes}
                    highlightWinningPath={gameOverAnimationPlaying}
                />

                {(() => {
                    // Determine which set of positions to use based on player count
                    let currentPositions = INFO_PANEL_POSITIONS;
                    if (players.length <= 4) {
                        currentPositions = INFO_PANEL_POSITIONS.slice(0, 4);
                    } else if (players.length > 4) {
                        // Reorder for 5 players: Counter-clockwise from Bottom Left
                        // 0: BL, 1: BR, 4: Right Edge, 2: TR, 3: TL
                        currentPositions = [
                            INFO_PANEL_POSITIONS[0],
                            INFO_PANEL_POSITIONS[1],
                            INFO_PANEL_POSITIONS[4],
                            INFO_PANEL_POSITIONS[2],
                            INFO_PANEL_POSITIONS[3],
                            INFO_PANEL_POSITIONS[5],
                        ];
                    }

                    return getOrderedPlayers().map((p, index) => {
                        if (index >= currentPositions.length) return null;

                        const pState = gameState.players[p.id];
                        if (!pState) return null;

                        const playerProperties = gameState.properties.filter(prop => prop.owner_PID === p.id);

                        return (
                            <PlayerInfoPanel
                                key={p.id}
                                player={p}
                                money={pState.money}
                                properties={playerProperties}
                                screenPosition={currentPositions[index]}
                                isClient={p.id === clientPlayerId}
                                color={players.findIndex(pl => pl.id === p.id) !== -1 ? PLAYER_COLORS[players.findIndex(pl => pl.id === p.id) % PLAYER_COLORS.length] : "#ffffff"}
                            />
                        );
                    });
                })()}

                <ActionBar
                    validActions={validActions}
                    waitingMessage={
                        gameState.currentPlayerId !== clientPlayerId && !gameState.pendingTrade && !gameState.isGameOver
                            ? `Waiting for ${players.find(p => p.id === gameState.currentPlayerId)?.name || 'Opponent'}...`
                            : undefined
                    }
                    isVisible={!gameState.pendingTrade && !isProcessingAction}
                    onActionSelect={(async (action: ActionType) => {
                        if (Number(action) === ActionType.TradeOffer) {
                            setIsTradeWindowOpen(true);
                            return;
                        }

                        setValidActions([]);
                        setIsProcessingAction(true);
                        try {
                            if (Number(action) === ActionType.AcceptTradeOffer) {
                                if (!session || !clientPlayerId) return;
                                await respondToTrade(session.boardId, clientPlayerId, true);
                            } else {
                                if (!session || !connection || !clientPlayerId) return;
                                await selectAction(session.boardId, clientPlayerId, action);
                            }
                        } catch (err) {
                            console.error("Error processing action:", err);
                        } finally {
                            setIsProcessingAction(false);
                        }
                    })}
                />

                {clientPlayerId && (
                    <TradeWindow
                        visible={isTradeWindowOpen || (!!gameState.pendingTrade && gameState.pendingTrade.player2Id === clientPlayerId)}
                        onClose={() => setIsTradeWindowOpen(false)}
                        onSubmit={async (trade) => {
                            if (!session || !clientPlayerId) return;
                            console.log("Submitting trade:", trade);
                            try {
                                await offerTrade(session.boardId, trade);
                                setIsTradeWindowOpen(false);
                            } catch (err) {
                                console.error("Failed to submit trade:", err);
                            }
                        }}
                        currentPlayerId={clientPlayerId}
                        players={players}
                        gameState={gameState}
                        pendingTrade={gameState.pendingTrade}
                        onAccept={async () => {
                            console.log("Accepting trade");
                            if (!session || !clientPlayerId) return;
                            try {
                                await respondToTrade(session.boardId, clientPlayerId, true);
                                setIsTradeWindowOpen(false); // Ensure local state is closed too
                            } catch (err) {
                                console.error("Failed to accept trade", err);
                            }
                        }}
                        onDeny={async () => {
                            console.log("Denying trade");
                            if (!session || !clientPlayerId) return;
                            try {
                                await respondToTrade(session.boardId, clientPlayerId, false);
                                setIsTradeWindowOpen(false);
                            } catch (err) {
                                console.error("Failed to deny trade", err);
                            }
                        }}
                    />
                )}
            </>
        );
    }

    // Check for game over state and render the screen if true


    return (
        <LobbyView
            sessionId={sessionId}
            players={players}
            currentPlayerId={clientPlayerId}
            isHost={isHost}
            isStarting={isStarting}
            onStartGame={handleStartGame}
        />
    );
}
