import React from 'react';
import { Player, Property } from '@/types';
import { PropertiesWidget } from './PropertiesWidget';
import { motion, animate, useAnimation } from "framer-motion";
import { useEffect, useRef } from 'react';

const AnimatedMoney = ({ value }: { value: number }) => {
    const nodeRef = useRef<HTMLSpanElement>(null);
    const prevValueRef = useRef(value);
    const controls = useAnimation();

    useEffect(() => {
        const node = nodeRef.current;
        if (!node) return;

        const prev = prevValueRef.current;

        // Initial set if needed, but we start with content
        if (prev === value) return;

        // Determine Flash Color
        // Green for up, Red for down
        const isIncrease = value > prev;
        const flashColor = isIncrease ? "#4ade80" : "#f87171"; // green-400 : red-400
        const baseColor = "#34d399"; // emerald-400

        // Animate Number
        const controlsNum = animate(prev, value, {
            duration: 1.5,
            ease: "easeOut",
            onUpdate: (latest) => {
                if (node) node.textContent = `$${Math.round(latest).toLocaleString()}`;
            }
        });

        // Animate Color
        controls.start({
            color: [flashColor, baseColor],
            transition: { duration: 1.5 }
        });

        prevValueRef.current = value;

        return () => controlsNum.stop();
    }, [value, controls]);

    return (
        <motion.div
            animate={controls}
            className="text-emerald-400 font-mono font-bold text-xl leading-none"
        >
            <span ref={nodeRef}>${value.toLocaleString()}</span>
        </motion.div>
    );
};

interface PlayerInfoPanelProps {
    player: Player;
    money: number;
    properties: Property[];
    screenPosition: string;
    isClient: boolean;
}

export const PlayerInfoPanel: React.FC<PlayerInfoPanelProps> = ({
    player,
    money,
    properties,
    screenPosition,
    isClient
}) => {
    return (
        <div className={`absolute flex flex-col gap-3 p-4 bg-slate-900/90 backdrop-blur-md rounded-xl border shadow-xl transition-all duration-300 w-64 ${isClient ? 'border-emerald-500/50 shadow-emerald-500/10' : 'border-slate-700'
            } ${screenPosition}`}>

            <div className="flex justify-between items-end border-b border-slate-700/50 pb-2">
                <div className="flex flex-col overflow-hidden">
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                        {isClient ? 'You' : ''}
                    </span>
                    <span className="font-bold text-lg text-white truncate" title={player.name}>
                        {player.name} {player.id}
                    </span>
                </div>
                <div className="text-right">
                    <AnimatedMoney value={money} />
                </div>
            </div>

            {/* Properties Widget Container */}
            {/* We force a specific height/width or let it fill. Currently passing w-full. 
                The widget implementation should be flexible now. */}
            <PropertiesWidget
                properties={properties}
                className="w-full h-24 bg-slate-800/50 hover:bg-slate-800"
            />
        </div>
    );
};
