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
            className="text-emerald-400 font-cute font-bold text-xl leading-none"
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
    color: string;
}

export const PlayerInfoPanel: React.FC<PlayerInfoPanelProps> = ({
    player,
    money,
    properties,
    screenPosition,
    isClient,
    color
}) => {
    return (
        <div
            className={`absolute flex flex-row items-center gap-2 px-5 py-2 bg-slate-900/90 backdrop-blur-md rounded-full border shadow-xl transition-all duration-300 ${screenPosition}`}
            style={{
                borderColor: color,
                boxShadow: `0 0 15px ${color}40`,
                minWidth: '400px'
            }}
        >
            {/* Left: Player Name */}
            <div className="flex flex-col overflow-hidden min-w-[100px] max-w-[140px]">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                    {isClient ? 'You' : 'Opponent'}
                </span>
                <span
                    className="font-bold text-lg truncate"
                    style={{ color: color }}
                    title={player.name}
                >
                    {player.name}
                </span>
            </div>

            {/* Center: Properties Widget */}
            <div className="w-48 relative h-16 flex items-center justify-center">
                <PropertiesWidget
                    properties={properties}
                    className="w-full h-full"
                    arcDirection={screenPosition.includes('top-4') ? 'down' : 'up'}
                />
            </div>

            {/* Right: Money */}
            <div className="text-right min-w-[100px]">
                <AnimatedMoney value={money} />
            </div>
        </div>
    );
};
