"use client";

import { motion, useAnimation, TargetAndTransition, Variants } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { useGameSounds } from "@/app/hooks/useGameSounds";

interface DiceRollAnimationProps {
    dice1: number;
    dice2: number;
}

const pipVariants = {
    hidden: { opacity: 0, scale: 0 },
    visible: { opacity: 1, scale: 1 }
};

// Standard Dice Pip Layouts
const PIPS: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8]
};

const Die = ({ value }: { value: number }) => {
    // 3x3 grid for pips
    // 0 1 2
    // 3 4 5
    // 6 7 8

    // We render 9 possible pip positions, and show only those active for the current value
    const activePips = PIPS[value] || [];

    return (
        <div className="w-12 h-12 bg-white rounded-lg shadow-[inset_0_0_10px_rgba(0,0,0,0.1),0_4px_8px_rgba(0,0,0,0.2)] border border-gray-200 flex flex-wrap p-1.5 justify-between content-between relative">
            {/* Gradient Overlay for shine */}
            <div className="absolute inset-0 bg-gradient-to-br from-white via-transparent to-black/10 rounded-lg pointer-events-none" />

            {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="w-1/3 h-1/3 flex items-center justify-center">
                    {activePips.includes(i) && (
                        <div className="w-2 h-2 bg-black rounded-full shadow-sm" />
                    )}
                </div>
            ))}
        </div>
    );
};

export const DiceRollAnimation = ({ dice1, dice2 }: DiceRollAnimationProps) => {
    const controls1 = useAnimation();
    const controls2 = useAnimation();
    const { addSound } = useGameSounds();
    const [visible, setVisible] = useState(false);
    const [displayVal1, setDisplayVal1] = useState(1);
    const [displayVal2, setDisplayVal2] = useState(1);

    // Track previous valid roll to detect changes
    const prevDiceRef = useRef<{ d1: number, d2: number }>({ d1: 0, d2: 0 });
    const [isRolling, setIsRolling] = useState(false);

    // 1. Trigger Animation Effect
    useEffect(() => {
        if (dice1 === 0 && dice2 === 0) {
            setVisible(false);
            return;
        }

        // Note: Logic for "is this a new roll" is handled by the parent component delaying the state update.
        // We simply animate whenever we receive valid non-zero dice values that are different from before (useEffect deps).
        controls1.set({ x: 400, y: (Math.random() - 0.5) * 300, rotate: Math.random() * 360, scale: 1, opacity: 0 });
        controls2.set({ x: 400, y: (Math.random() - 0.5) * 300, rotate: Math.random() * 360, scale: 1, opacity: 0 });

        setVisible(true);
        setIsRolling(true);
        prevDiceRef.current = { d1: dice1, d2: dice2 }; // No longer needed for logic, keeping if we want to track for other reasons? No.

        const rollDice = async () => {
            addSound('dice');
            // ... animation logic ...
            // Reset State
            controls1.set({ x: 400, y: (Math.random() - 0.5) * 300, rotate: Math.random() * 360, scale: 1, opacity: 0 });
            controls2.set({ x: 400, y: (Math.random() - 0.5) * 300, rotate: Math.random() * 360, scale: 1, opacity: 0 });

            var x1 = (Math.random() - 0.5) * 300;
            var y1 = (Math.random() - 0.5) * 300;
            var dice2Angle = Math.random() * 2 * Math.PI
            var x2 = x1 + 100 * Math.sin(dice2Angle);
            var y2 = y1 + 100 * Math.cos(dice2Angle);

            await Promise.all([
                controls1.start({
                    x: x1,
                    y: y1,
                    rotate: Math.random() * 720 + 360,
                    scale: 1,
                    opacity: 1,
                    transition: { duration: 0.75, type: "spring", damping: 15, stiffness: 40 }
                }),
                controls2.start({
                    x: x2,
                    y: y2,
                    rotate: Math.random() * 720 + 360,
                    scale: 1,
                    opacity: 1,
                    transition: { duration: 0.75, type: "spring", damping: 15, stiffness: 40 }
                })
            ]);

            // Animation Done -> Stop Rolling Values
            setIsRolling(false);
            setDisplayVal1(dice1);
            setDisplayVal2(dice2);

            // Shake
            await Promise.all([
                controls1.start({ scale: [1, 1.1, 1], transition: { duration: 0.2 } }),
                controls2.start({ scale: [1, 1.1, 1], transition: { duration: 0.2 } })
            ]);

            // Fade Out
            setTimeout(async () => {
                await Promise.all([
                    controls1.start({ opacity: 0, scale: 0.9, transition: { duration: 0.5 } }),
                    controls2.start({ opacity: 0, scale: 0.9, transition: { duration: 0.5 } })
                ]);
            }, 2500);
        };

        rollDice();
    }, [dice1, dice2, controls1, controls2]);

    // 2. Value Scrambling Effect (Robust Loop)
    useEffect(() => {
        if (!isRolling) return;

        const interval = setInterval(() => {
            setDisplayVal1(Math.floor(Math.random() * 6) + 1);
            setDisplayVal2(Math.floor(Math.random() * 6) + 1);
        }, 120);

        return () => clearInterval(interval);
    }, [isRolling]);

    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 overflow-hidden">
            {/* Container needed to provide context for absolute positioning if we wanted relative moves, 
                 but we are centering in screen. */}
            <motion.div animate={controls1} className="absolute" initial={{ opacity: 0 }}>
                <Die value={displayVal1} />
            </motion.div>
            <motion.div animate={controls2} className="absolute" initial={{ opacity: 0 }}>
                <Die value={displayVal2} />
            </motion.div>
        </div>
    );
};
