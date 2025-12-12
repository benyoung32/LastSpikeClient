import { ActionType } from "@/types";

interface ActionBarProps {
    validActions: ActionType[];
    onActionSelect: (action: ActionType) => void;
}

const ACTION_LABELS: Record<number, string> = {
    [ActionType.Move]: "Roll Dice",
    [ActionType.Accept]: "Accept",
    [ActionType.Pass]: "Pass",
    [ActionType.Trade]: "Trade",
    // Rebellion and PlaceTrack are handelled inside the gameboard component
};

export default function ActionBar({ validActions, onActionSelect }: ActionBarProps) {
    if (!validActions || validActions.length === 0) {
        return null;
    }

    const displayedActions = validActions.filter(
        (action) =>
            action !== ActionType.Rebellion &&
            action !== ActionType.PlaceTrack
    );

    if (displayedActions.length === 0) {
        return null;
    }

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-zinc-900/90 border border-zinc-700 rounded-full px-6 py-3 flex gap-4 shadow-2xl backdrop-blur-sm">
            {displayedActions.map((action) => (
                <button
                    key={action}
                    onClick={() => onActionSelect(action)}
                    className="
                        px-6 py-2 rounded-full font-bold uppercase tracking-wider text-sm
                        bg-zinc-800 text-zinc-300 border border-zinc-600
                        hover:bg-amber-500 hover:text-black hover:border-amber-400 hover:scale-105 hover:shadow-[0_0_15px_rgba(245,158,11,0.5)]
                        active:scale-95
                        transition-all duration-200
                    "
                >
                    {ACTION_LABELS[action] || ActionType[action]}
                </button>
            ))}
        </div>
    );
}
