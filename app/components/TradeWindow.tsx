import { useState, useMemo, useEffect } from "react";
import { Player, GameState, Trade, Property, City, CITY_COLORS, PLAYER_COLORS } from "@/types";
import { PropertyCard } from "./PropertyCard";

interface TradeWindowProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (trade: Trade) => void;
    currentPlayerId: string;
    players: Player[];
    gameState: GameState;
}

export default function TradeWindow({ visible, onClose, onSubmit, currentPlayerId, players, gameState, pendingTrade, onAccept, onDeny }: TradeWindowProps & {
    pendingTrade?: Trade | null;
    onAccept?: () => void;
    onDeny?: () => void;
}) {
    const [selectedTargetPlayerId, setSelectedTargetPlayerId] = useState<string>("");
    const [offerMoney, setOfferMoney] = useState<number>(0);
    const [requestMoney, setRequestMoney] = useState<number>(0);
    const [selectedPropertyIndices, setSelectedPropertyIndices] = useState<Set<number>>(new Set());
    const [isCounterMode, setIsCounterMode] = useState(false);

    const [isMinimized, setIsMinimized] = useState(false);

    // Reset minimization when trade opens/changes
    useEffect(() => {
        if (visible) {
            setIsMinimized(false);
        }
    }, [visible, pendingTrade]);

    const otherPlayers = useMemo(() => players.filter(p => p.id !== currentPlayerId), [players, currentPlayerId]);
    const currentPlayer = gameState.players[currentPlayerId];

    // Helper to get player color
    const getPlayerColor = (playerId: string) => {
        const index = players.findIndex(p => p.id === playerId);
        if (index === -1) return "#ffffff";
        return PLAYER_COLORS[index % PLAYER_COLORS.length];
    };

    // Properties with indices
    const allPropertiesWithIndices = useMemo(() =>
        gameState.properties.map((p, i) => ({ property: p, index: i })),
        [gameState.properties]
    );

    // Initialize state from pending trade if present
    const isReceivingTrade = !!pendingTrade && !isCounterMode;

    // Reset state when opening/closing or changing target
    useMemo(() => {
        if (visible) {
            if (pendingTrade && pendingTrade.player2Id === currentPlayerId) {
                // Pre-fill for counter offer or display for receiving
                if (isCounterMode) {
                    setSelectedTargetPlayerId(pendingTrade.player1Id);
                    setOfferMoney(pendingTrade.player2Money);
                    setRequestMoney(pendingTrade.player1Money);

                    const newIndices = new Set<number>();
                    pendingTrade.properties.forEach(prop => {
                        // Find the index in the current game state
                        const idx = gameState.properties.findIndex(p => p.city === prop.city && p.owner_PID === prop.owner_PID);
                        if (idx !== -1) newIndices.add(idx);
                    });
                    setSelectedPropertyIndices(newIndices);

                } else {
                }

            } else if (!selectedTargetPlayerId && otherPlayers.length > 0 && !pendingTrade) {
                setSelectedTargetPlayerId(otherPlayers[0].id);
            }
        }
    }, [visible, pendingTrade, isCounterMode, otherPlayers, currentPlayerId, gameState.properties, selectedTargetPlayerId]);


    if (!visible) return null;
    if (!currentPlayer) return null;

    // --- MINIMIZED VIEW ---
    if (isMinimized) {
        let statusText = "Trade Window";
        let subText = "";

        if (isReceivingTrade && pendingTrade) {
            const senderName = players.find(p => p.id === pendingTrade.player1Id)?.name || "Unknown";
            if (pendingTrade.player2Id === currentPlayerId) {
                statusText = "Trade Offer Received";
                subText = `From ${senderName}`;
            } else {
                statusText = "Trade in Progress";
                subText = "Waiting...";
            }
        } else {
            statusText = isCounterMode ? "Counter Offer" : "Proposing Trade";
            if (selectedTargetPlayerId) {
                const targetName = players.find(p => p.id === selectedTargetPlayerId)?.name || "Unknown";
                subText = `With ${targetName}`;
            }
        }

        return (
            <div
                className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] cursor-pointer group"
                onClick={() => setIsMinimized(false)}
            >
                <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-5 flex items-center gap-5 min-w-[400px] group-hover:border-zinc-500 transition-colors">
                    <div className="bg-amber-500/10 p-3 rounded-lg">
                        <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-zinc-200">{statusText}</h3>
                        {subText && <p className="text-sm text-zinc-400">{subText}</p>}
                    </div>
                    <div className="p-2 text-zinc-400 group-hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                    </div>
                </div>
            </div>
        );
    }

    // --- RECEIVING TRADE VIEW ---
    // --- RECEIVING TRADE VIEW (or SPECTATING) ---
    if (isReceivingTrade && pendingTrade) {
        const senderName = players.find(p => p.id === pendingTrade.player1Id)?.name || "Unknown";
        const receiverName = players.find(p => p.id === pendingTrade.player2Id)?.name || "Unknown";

        const isRecipient = pendingTrade.player2Id === currentPlayerId;
        const isProposer = pendingTrade.player1Id === currentPlayerId;

        const offeredProperties = pendingTrade.properties.filter(p => p.owner_PID === pendingTrade.player1Id);
        const requestedProperties = pendingTrade.properties.filter(p => p.owner_PID === pendingTrade.player2Id);

        const senderColor = getPlayerColor(pendingTrade.player1Id);
        const receiverColor = getPlayerColor(pendingTrade.player2Id);

        return (
            <div
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                onClick={() => setIsMinimized(true)}
            >
                <div
                    className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-2xl flex flex-col shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-6 border-b border-zinc-800 flex justify-between items-start">
                        <div className="text-center flex-1">
                            <h2 className="text-2xl font-bold text-zinc-100">
                                {isRecipient ? "Trade Offer Received" : (isProposer ? "Trade Offer Sent" : "Trade in Progress")}
                            </h2>
                            {isRecipient ? (
                                <p className="text-zinc-400 mt-1">from <span style={{ color: senderColor }} className="font-bold">{senderName}</span></p>
                            ) : (
                                <p className="text-zinc-400 mt-1">
                                    <span style={{ color: senderColor }} className="font-bold">{senderName}</span>
                                    <span className="mx-2 text-zinc-600">to</span>
                                    <span style={{ color: receiverColor }} className="font-bold">{receiverName}</span>
                                </p>
                            )}
                        </div>
                        {/* Minimize Button */}
                        <button
                            onClick={() => setIsMinimized(true)}
                            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                            title="Minimize"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                        </button>
                    </div>

                    <div className="p-8 grid grid-cols-2 gap-8 relative">
                        {/* Arrow Icon in center */}
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-800 rounded-full p-2 border border-zinc-700 z-10">
                            <svg className="w-8 h-6 text-zinc-400" fill="none" viewBox="0 0 32 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5l-7 7l7 7M4 12h24M21 5l7 7l-7 7" />
                            </svg>
                        </div>
                        <div className="bg-zinc-950/50 p-6 rounded-xl border border-zinc-800 text-center">
                            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">
                                {isRecipient ? "You Get" : `${senderName} Gives`}
                            </h3>
                            <div className="space-y-4">
                                {pendingTrade.player1Money > 0 && (
                                    <div className="text-2xl font-bold text-green-400">${pendingTrade.player1Money.toLocaleString()}</div>
                                )}
                                <div className="flex flex-wrap gap-4 justify-center">
                                    {offeredProperties.map((p, i) => (
                                        <div key={i} className="relative w-[144px] h-[216px]">
                                            <div className="absolute top-0 left-0 transform scale-75 origin-top-left">
                                                <PropertyCard
                                                    property={p}
                                                    index={i}
                                                    totalInStack={offeredProperties.length}
                                                    interactive={true}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    {offeredProperties.length === 0 && pendingTrade.player1Money === 0 && (
                                        <div className="text-zinc-600 italic text-sm w-full">Nothing</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="bg-zinc-950/50 p-6 rounded-xl border border-zinc-800 text-center">
                            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">
                                {isRecipient ? "You Give" : `${receiverName} Gives`}
                            </h3>
                            <div className="space-y-4">
                                {pendingTrade.player2Money > 0 && (
                                    <div className="text-2xl font-bold text-green-400">${pendingTrade.player2Money.toLocaleString()}</div>
                                )}
                                <div className="flex flex-wrap gap-4 justify-center">
                                    {requestedProperties.map((p, i) => (
                                        <div key={i} className="relative w-[144px] h-[216px]">
                                            <div className="absolute top-0 left-0 transform scale-75 origin-top-left">
                                                <PropertyCard
                                                    property={p}
                                                    index={i}
                                                    totalInStack={requestedProperties.length}
                                                    interactive={true}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    {requestedProperties.length === 0 && pendingTrade.player2Money === 0 && (
                                        <div className="text-zinc-600 italic text-sm w-full">Nothing</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t border-zinc-800 flex justify-center">
                        {isRecipient ? (
                            <div className="grid grid-cols-3 gap-4 w-full">
                                <button
                                    onClick={onDeny}
                                    className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg font-bold transition-all"
                                >
                                    Deny
                                </button>
                                <button
                                    onClick={() => setIsCounterMode(true)}
                                    className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg font-bold transition-all"
                                >
                                    Counter Offer
                                </button>
                                <button
                                    onClick={onAccept}
                                    className="px-4 py-3 bg-green-500 hover:bg-green-400 text-black rounded-lg font-bold transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                                >
                                    Accept
                                </button>
                            </div>
                        ) : (
                            <div className="text-zinc-400 animate-pulse font-medium">
                                {isProposer
                                    ? `Waiting for ${receiverName} to respond...`
                                    : `Waiting for ${receiverName} to respond...`
                                }
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // --- PROPOSE / COUNTER VIEW ---

    const targetPlayer = gameState.players[selectedTargetPlayerId];

    // Properties logic
    const myProperties = allPropertiesWithIndices.filter(p => p.property.owner_PID === currentPlayerId);
    const theirProperties = selectedTargetPlayerId
        ? allPropertiesWithIndices.filter(p => p.property.owner_PID === selectedTargetPlayerId)
        : [];

    // Helper to toggle property selection
    const toggleProperty = (index: number) => {
        setSelectedPropertyIndices(current => {
            const next = new Set(current);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
    };

    const handleSubmit = () => {
        if (!selectedTargetPlayerId) return;

        // Gather all selected properties directly from the main list using indices
        const tradeProperties: Property[] = [];
        selectedPropertyIndices.forEach(index => {
            if (gameState.properties[index]) {
                tradeProperties.push(gameState.properties[index]);
            }
        });

        const tradePayload: Trade = {
            player1Id: currentPlayerId,
            player2Id: selectedTargetPlayerId,
            properties: tradeProperties,
            player1Money: offerMoney,
            player2Money: requestMoney
        };

        onSubmit(tradePayload);

        // Reset and close
        setOfferMoney(0);
        setRequestMoney(0);
        setSelectedPropertyIndices(new Set());
        setIsCounterMode(false);
        onClose();
    };

    const maxOfferMoney = currentPlayer.money || 0;
    const maxRequestMoney = targetPlayer?.money || 0;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setIsMinimized(true)}
        >
            <div
                className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-[95vw] max-h-[95vh] overflow-y-auto flex flex-col shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >

                {/* Header */}
                <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-zinc-100">
                        {isCounterMode ? "Counter Offer" : "Propose Trade"}
                    </h2>
                    <div className="flex items-center gap-2">
                        {/* Minimize Button */}
                        <button
                            onClick={() => setIsMinimized(true)}
                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                            title="Minimize"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                        </button>
                        {/* Close Button */}
                        <button onClick={() => { setIsCounterMode(false); onClose(); }} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-8">

                    {/* Target Player Selection */}
                    {!isCounterMode && (
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">Trade with:</label>
                            <div className="flex gap-4 overflow-x-auto pb-2">
                                {otherPlayers.map(p => {
                                    const isSelected = p.id === selectedTargetPlayerId;
                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => {
                                                setSelectedTargetPlayerId(p.id);
                                                setSelectedPropertyIndices(current => {
                                                    const next = new Set<number>();
                                                    // Keep my properties selected
                                                    current.forEach(idx => {
                                                        const prop = gameState.properties[idx];
                                                        if (prop && prop.owner_PID === currentPlayerId) {
                                                            next.add(idx);
                                                        }
                                                    });
                                                    return next;
                                                });
                                            }}
                                            className={`
                                            px-6 py-3 rounded-lg border text-sm font-bold tracking-wide transition-all min-w-[120px]
                                            ${isSelected
                                                    ? "bg-amber-500 text-black border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                                                    : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700"}
                                        `}
                                        >
                                            {p.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {isCounterMode && selectedTargetPlayerId && (
                        <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700 flex items-center gap-3">
                            <span className="text-zinc-400 text-sm">Countering offer from:</span>
                            <span className="text-white font-bold">{players.find(p => p.id === selectedTargetPlayerId)?.name}</span>
                        </div>
                    )}


                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                        {/* Left Column: My Offer (Money + Properties) */}
                        <div className="bg-zinc-950/50 p-6 rounded-xl border border-zinc-800">
                            <h3 className="text-lg font-bold text-amber-500 mb-6 flex items-center gap-2">
                                <span>Offer</span>
                                <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded">YOU</span>
                            </h3>

                            {/* Money Offer */}
                            <div className="mb-8">
                                <label className="flex justify-between text-sm text-zinc-400 mb-2">
                                    <span>Offer Money</span>
                                    <span className="text-zinc-500">Max: ${maxOfferMoney.toLocaleString()}</span>
                                </label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="range"
                                        min="0"
                                        max={maxOfferMoney}
                                        step="1000"
                                        value={offerMoney}
                                        onChange={(e) => setOfferMoney(Number(e.target.value))}
                                        className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                    />
                                    <input
                                        type="number"
                                        min="0"
                                        max={maxOfferMoney}
                                        value={offerMoney}
                                        onChange={(e) => setOfferMoney(Math.min(Number(e.target.value), maxOfferMoney))}
                                        className="w-24 bg-black border border-zinc-700 rounded px-2 py-1 text-right text-amber-500 focus:border-amber-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* My Properties */}
                            <div>
                                <label className="block text-sm text-zinc-400 mb-3">Offer Properties</label>
                                {myProperties.length === 0 ? (
                                    <div className="text-sm text-zinc-600 italic">No properties to offer</div>
                                ) : (
                                    <div className="flex flex-wrap gap-4 h-[500px] overflow-y-auto pr-2 content-start border border-zinc-900/50 rounded-lg p-2 bg-zinc-900/30">
                                        {myProperties.map(({ property, index }) => {
                                            const isSelected = selectedPropertyIndices.has(index);

                                            return (
                                                <div
                                                    key={index}
                                                    onClick={() => toggleProperty(index)}
                                                    className={`
                                                        relative transition-all cursor-pointer rounded-lg
                                                        ${isSelected
                                                            ? "ring-4 ring-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.5)] scale-95"
                                                            : "hover:scale-105 hover:z-10 opacity-90 hover:opacity-100"}
                                                    `}
                                                >
                                                    <div className="transform scale-75 origin-top-left w-[144px] h-[216px] bg-transparent">
                                                        <PropertyCard
                                                            property={property}
                                                            index={0}
                                                            totalInStack={1}
                                                            interactive={true}
                                                            className="shadow-none"
                                                        />
                                                    </div>
                                                    {/* Overlay to indicate selection clearly if needed, or rely on ring */}
                                                    {isSelected && (
                                                        <div className="absolute inset-0 bg-amber-500/10 pointer-events-none" />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Column: Their Offer (Requesting) */}
                        <div className="bg-zinc-950/50 p-6 rounded-xl border border-zinc-800">
                            <h3 className="text-lg font-bold text-blue-400 mb-6 flex items-center gap-2">
                                <span>Request</span>
                                {selectedTargetPlayerId && (
                                    <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded">
                                        {players.find(p => p.id === selectedTargetPlayerId)?.name}
                                    </span>
                                )}
                            </h3>

                            {/* Money Request */}
                            <div className="mb-8">
                                <label className="flex justify-between text-sm text-zinc-400 mb-2">
                                    <span>Request Money</span>
                                    <span className="text-zinc-500">Max: ${maxRequestMoney.toLocaleString()}</span>
                                </label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="range"
                                        min="0"
                                        max={maxRequestMoney}
                                        step="1000"
                                        value={requestMoney}
                                        onChange={(e) => setRequestMoney(Number(e.target.value))}
                                        className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                    <input
                                        type="number"
                                        min="0"
                                        max={maxRequestMoney}
                                        value={requestMoney}
                                        onChange={(e) => setRequestMoney(Math.min(Number(e.target.value), maxRequestMoney))}
                                        className="w-24 bg-black border border-zinc-700 rounded px-2 py-1 text-right text-blue-400 focus:border-blue-400 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Their Properties */}
                            <div>
                                <label className="block text-sm text-zinc-400 mb-3">Request Properties</label>
                                {theirProperties.length === 0 ? (
                                    <div className="text-sm text-zinc-600 italic">
                                        {selectedTargetPlayerId ? "They have no properties" : "Select a player first"}
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-4 h-[500px] overflow-y-auto pr-2 content-start border border-zinc-900/50 rounded-lg p-2 bg-zinc-900/30">
                                        {theirProperties.map(({ property, index }) => {
                                            const isSelected = selectedPropertyIndices.has(index);

                                            return (
                                                <div
                                                    key={index}
                                                    onClick={() => toggleProperty(index)}
                                                    className={`
                                                        relative transition-all cursor-pointer rounded-lg
                                                        ${isSelected
                                                            ? "ring-4 ring-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)] scale-95"
                                                            : "hover:scale-105 hover:z-10 opacity-90 hover:opacity-100"}
                                                    `}
                                                >
                                                    <div className="transform scale-75 origin-top-left w-[144px] h-[216px] bg-transparent">
                                                        <PropertyCard
                                                            property={property}
                                                            index={0}
                                                            totalInStack={1}
                                                            interactive={true}
                                                            className="shadow-none"
                                                        />
                                                    </div>
                                                    {isSelected && (
                                                        <div className="absolute inset-0 bg-blue-500/10 pointer-events-none" />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-zinc-800 flex justify-end gap-3">
                    <button
                        onClick={() => {
                            if (isCounterMode) {
                                setIsCounterMode(false);
                            } else {
                                onClose();
                            }
                        }}
                        className="px-6 py-2 rounded-lg text-zinc-400 hover:bg-zinc-800 transition-colors bg-transparent border-0"
                    >
                        {isCounterMode ? "Back" : "Cancel"}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedTargetPlayerId}
                        className={`
                            px-8 py-2 rounded-lg font-bold text-black transition-all
                            ${selectedTargetPlayerId
                                ? "bg-amber-500 hover:bg-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                                : "bg-zinc-700 text-zinc-500 cursor-not-allowed"}
                        `}
                    >
                        {isCounterMode ? "Submit Offer" : "Propose Trade"}
                    </button>
                </div>

            </div>
        </div>
    );
}
