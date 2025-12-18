import React from 'react';
import { Player, PlayerState } from '@/types';
import { useRouter } from 'next/navigation';

interface GameOverScreenProps {
    players: Player[];
    playerStates: Record<string, PlayerState>;
    onReturnHome: () => void;
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({ players, playerStates, onReturnHome }) => {
    // 1. Combine player info with their state (money)
    const rankedPlayers = players.map(player => {
        const state = playerStates[player.id];
        return {
            ...player,
            money: state ? state.money : 0,
        };
    });

    // 2. Sort by money descending
    rankedPlayers.sort((a, b) => b.money - a.money);

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 text-white animate-slow-fade-in">
            <h1 className="text-6xl font-black mb-12 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600">
                GAME OVER
            </h1>

            <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden shadow-2xl mb-12">
                <div className="grid grid-cols-12 gap-4 p-4 bg-zinc-800 border-b border-zinc-700 font-bold text-zinc-400 uppercase tracking-wider text-sm">
                    <div className="col-span-2 text-center">Rank</div>
                    <div className="col-span-7">Player</div>
                    <div className="col-span-3 text-right">Money</div>
                </div>

                {rankedPlayers.map((player, index) => (
                    <div
                        key={player.id}
                        className={`grid grid-cols-12 gap-4 p-4 border-b border-zinc-800 items-center transition-colors
                            ${index === 0 ? 'bg-amber-900/20 text-amber-200' : 'hover:bg-zinc-800/50'}
                        `}
                    >
                        <div className="col-span-2 text-center text-2xl font-bold font-cute text-zinc-500">
                            {index === 0 ? '👑' : `#${index + 1}`}
                        </div>
                        <div className="col-span-7 flex items-center">
                            <span className={`text-xl ${index === 0 ? 'font-bold' : ''}`}>
                                {player.name}
                            </span>
                            {index === 0 && (
                                <span className="ml-3 text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                                    WINNER
                                </span>
                            )}
                        </div>
                        <div className="col-span-3 text-right font-cute text-xl text-green-400">
                            ${player.money.toLocaleString()}
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={onReturnHome}
                className="px-8 py-3 bg-zinc-100 text-black text-lg font-bold rounded hover:bg-white hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]"
            >
                Return to Home
            </button>
        </div>
    );
};

export default GameOverScreen;
