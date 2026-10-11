"use client";

import { motion, useAnimation, TargetAndTransition, Variants } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { useGameSounds } from "@/app/hooks/useGameSounds";

interface DiceRollAnimationProps {
    dice1: number;
    dice2: number;
    isClientRolling?: boolean;
    onRollResolved?: () => void;
}

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

const MIN_ROLL_DURATION = 600; // ms minimum rolling duration before reveal

export const DiceRollAnimation = ({ dice1, dice2, isClientRolling = false, onRollResolved }: DiceRollAnimationProps) => {
    const controls1 = useAnimation();
    const controls2 = useAnimation();
    const { addSound } = useGameSounds();
    const [displayVal1, setDisplayVal1] = useState(1);
    const [displayVal2, setDisplayVal2] = useState(1);
    const [isRolling, setIsRolling] = useState(false);

    const prevDiceRef = useRef<{ d1: number; d2: number }>({ d1: 0, d2: 0 });
    const rollStartTimeRef = useRef<number | null>(null);
    const resolvedRef = useRef<boolean>(false);

    const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const resolveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // 1. Value Scrambling Effect
    useEffect(() => {
        if (!isRolling) return;

        const interval = setInterval(() => {
            setDisplayVal1(Math.floor(Math.random() * 6) + 1);
            setDisplayVal2(Math.floor(Math.random() * 6) + 1);
        }, 80);

        return () => clearInterval(interval);
    }, [isRolling]);

    // 2. Control Roll Lifecycle
    useEffect(() => {
        const hasDice = dice1 !== 0 && dice2 !== 0;
        const isInitialLoad = prevDiceRef.current.d1 === 0 && prevDiceRef.current.d2 === 0;
        const diceChanged = hasDice && (dice1 !== prevDiceRef.current.d1 || dice2 !== prevDiceRef.current.d2);

        if (hasDice) {
            prevDiceRef.current = { d1: dice1, d2: dice2 };
        }

        // Hide if no dice and client not rolling
        if (!isClientRolling && !hasDice) {
            controls1.set({ opacity: 0 });
            controls2.set({ opacity: 0 });
            return;
        }

        // Hide on initial page load if client is not rolling
        if (isInitialLoad && !isClientRolling) {
            controls1.set({ opacity: 0 });
            controls2.set({ opacity: 0 });
            return;
        }

        // Start roll if client requested OR server pushed new dice values
        const shouldRoll = isClientRolling || diceChanged;

        if (shouldRoll && rollStartTimeRef.current === null) {
            if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
            if (resolveTimerRef.current) clearTimeout(resolveTimerRef.current);

            resolvedRef.current = false;
            rollStartTimeRef.current = Date.now();
            setIsRolling(true);

            addSound('dice');

            const x1 = (Math.random() - 0.5) * 300;
            const y1 = (Math.random() - 0.5) * 300;
            const dice2Angle = Math.random() * 2 * Math.PI;
            const x2 = x1 + 100 * Math.sin(dice2Angle);
            const y2 = y1 + 100 * Math.cos(dice2Angle);

            controls1.set({ x: 400, y: (Math.random() - 0.5) * 300, rotate: Math.random() * 360, scale: 1, opacity: 0 });
            controls2.set({ x: 400, y: (Math.random() - 0.5) * 300, rotate: Math.random() * 360, scale: 1, opacity: 0 });

            controls1.start({
                x: x1,
                y: y1,
                rotate: Math.random() * 720 + 360,
                scale: 1,
                opacity: 1,
                transition: { duration: 0.35, type: "spring", damping: 15, stiffness: 40 }
            });
            controls2.start({
                x: x2,
                y: y2,
                rotate: Math.random() * 720 + 360,
                scale: 1,
                opacity: 1,
                transition: { duration: 0.5, type: "spring", damping: 15, stiffness: 40 }
            });
        }

        // Resolve roll when target dice values arrive & minimum duration elapsed
        if (hasDice && rollStartTimeRef.current !== null && !resolvedRef.current) {
            const elapsed = Date.now() - rollStartTimeRef.current;
            const remaining = Math.max(0, MIN_ROLL_DURATION - elapsed);

            if (resolveTimerRef.current) clearTimeout(resolveTimerRef.current);

            resolveTimerRef.current = setTimeout(async () => {
                resolvedRef.current = true;
                rollStartTimeRef.current = null;
                setIsRolling(false);
                setDisplayVal1(dice1);
                setDisplayVal2(dice2);

                if (onRollResolved) {
                    onRollResolved();
                }

                // Shake / Bounce
                await Promise.all([
                    controls1.start({ scale: [1, 1.1, 1], transition: { duration: 0.2 } }),
                    controls2.start({ scale: [1, 1.1, 1], transition: { duration: 0.2 } })
                ]);

                // Fade Out
                fadeTimerRef.current = setTimeout(async () => {
                    await Promise.all([
                        controls1.start({ opacity: 0, scale: 0.9, transition: { duration: 0.5 } }),
                        controls2.start({ opacity: 0, scale: 0.9, transition: { duration: 0.5 } })
                    ]);
                }, 1000);
            }, remaining);
        }

        return () => {
            if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
            if (resolveTimerRef.current) clearTimeout(resolveTimerRef.current);
        };
    }, [dice1, dice2, isClientRolling, controls1, controls2, addSound, onRollResolved]);

    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 overflow-hidden">
            <motion.div animate={controls1} className="absolute" initial={{ opacity: 0 }}>
                <Die value={displayVal1} />
            </motion.div>
            <motion.div animate={controls2} className="absolute" initial={{ opacity: 0 }}>
                <Die value={displayVal2} />
            </motion.div>
        </div>
    );
};
