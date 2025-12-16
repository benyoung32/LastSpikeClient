import { ActionType } from "@/types";

interface ActionBarProps {
    validActions: ActionType[];
    onActionSelect: (action: ActionType) => void;
    isVisible?: boolean;
}

const ACTION_LABELS: Record<number, string> = {
    [ActionType.Roll]: "Roll Dice",
    [ActionType.Ok]: "Ok",
    [ActionType.Pass]: "Pass",
    [ActionType.TradeOffer]: "Trade",
    [ActionType.Buy]: "Buy",
    [ActionType.AcceptTradeOffer]: "Accept Trade",
};

export default function ActionBar({ validActions, onActionSelect, isVisible = true }: ActionBarProps) {
    const visibleActions = validActions?.filter(action => ACTION_LABELS[action]) ?? [];

    if (!isVisible || visibleActions.length === 0) {
        return null;
    }

    return (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 bg-zinc-900/90 border border-zinc-700 rounded-full px-10 py-5 flex gap-6 shadow-2xl backdrop-blur-sm">
            {visibleActions.map((action) => (
                <button
                    key={action}
                    onClick={() => onActionSelect(action)}
                    className="
                        px-8 py-3 rounded-full font-bold uppercase tracking-wider text-base
                        bg-zinc-800 text-zinc-300 border border-zinc-600
                        hover:bg-amber-500 hover:text-black hover:border-amber-400 hover:scale-105 hover:shadow-[0_0_15px_rgba(245,158,11,0.5)]
                        active:scale-95
                        transition-all duration-200
                    "
                >
                    {ACTION_LABELS[action]}
                </button>
            ))}
        </div>
    );
}
