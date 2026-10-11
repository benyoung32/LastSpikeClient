"use client";

import { motion, useAnimation, TargetAndTransition, Variants } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { useGameSounds } from "@/app/hooks/useGameSounds";

interface DiceRollAnimationProps {
    dice1: number;
    dice2: number;
    currentPlayerId?: string;
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
        <div className="w-16 h-16 bg-white rounded-xl shadow-[inset_0_0_12px_rgba(0,0,0,0.1),0_6px_12px_rgba(0,0,0,0.25)] border border-gray-200 flex flex-wrap p-2 justify-between content-between relative">
            {/* Gradient Overlay for shine */}
            <div className="absolute inset-0 bg-gradient-to-br from-white via-transparent to-black/10 rounded-xl pointer-events-none" />

            {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="w-1/3 h-1/3 flex items-center justify-center">
                    {activePips.includes(i) && (
                        <div className="w-2.5 h-2.5 bg-black rounded-full shadow-sm" />
                    )}
                </div>
            ))}
        </div>
    );
};

const MIN_ROLL_DURATION = 2000; // ms minimum rolling duration before reveal

export const DiceRollAnimation = ({
    dice1,
    dice2,
    currentPlayerId,
    isClientRolling = false,
    onRollResolved
}: DiceRollAnimationProps) => {
    const controls1 = useAnimation();
    const controls2 = useAnimation();
    const containerRef = useRef<HTMLDivElement>(null);
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
        }, 70);

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

            // Calculate starting position based on current player's info card
            let startX = 400;
            let startY = 0;

            if (containerRef.current && currentPlayerId) {
                const cardEl = document.getElementById(`player-panel-${currentPlayerId}`);
                if (cardEl) {
                    const containerRect = containerRef.current.getBoundingClientRect();
                    const cardRect = cardEl.getBoundingClientRect();

                    const containerCenterX = containerRect.left + containerRect.width / 2;
                    const containerCenterY = containerRect.top + containerRect.height / 2;

                    const cardCenterX = cardRect.left + cardRect.width / 2;
                    const cardCenterY = cardRect.top + cardRect.height / 2;

                    startX = cardCenterX - containerCenterX;
                    startY = cardCenterY - containerCenterY;
                }
            }

            const x1 = (Math.random() - 0.5) * 160;
            const y1 = (Math.random() - 0.5) * 160;
            const dice2Angle = Math.random() * 2 * Math.PI;
            const x2 = x1 + 90 * Math.sin(dice2Angle);
            const y2 = y1 + 90 * Math.cos(dice2Angle);

            controls1.set({ x: startX - 32, y: startY, rotate: Math.random() * 360, scale: 0.5, opacity: 0 });
            controls2.set({ x: startX + 32, y: startY, rotate: Math.random() * 360, scale: 0.5, opacity: 0 });

            controls1.start({
                x: x1,
                y: y1,
                rotate: Math.random() * 1080 + 720,
                scale: 1,
                opacity: 1,
                transition: { duration: 2.0, ease: [0.25, 0.8, 0.35, 1] }
            });
            controls2.start({
                x: x2,
                y: y2,
                rotate: Math.random() * 1080 + 720,
                scale: 1,
                opacity: 1,
                transition: { duration: 2.2, ease: [0.25, 0.8, 0.35, 1] }
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
                    controls1.start({ scale: [1, 1.2, 1], transition: { duration: 0.25 } }),
                    controls2.start({ scale: [1, 1.2, 1], transition: { duration: 0.25 } })
                ]);

                // Fade Out
                fadeTimerRef.current = setTimeout(async () => {
                    await Promise.all([
                        controls1.start({ opacity: 0, scale: 0.8, transition: { duration: 0.5 } }),
                        controls2.start({ opacity: 0, scale: 0.8, transition: { duration: 0.5 } })
                    ]);
                }, 1200);
            }, remaining);
        }

        return () => {
            if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
            if (resolveTimerRef.current) clearTimeout(resolveTimerRef.current);
        };
    }, [dice1, dice2, currentPlayerId, isClientRolling, controls1, controls2, addSound, onRollResolved]);

    return (
        <div ref={containerRef} className="fixed inset-0 flex items-center justify-center pointer-events-none z-50 overflow-hidden" style={{ willChange: "transform" }}>
            <motion.div animate={controls1} className="absolute" initial={{ opacity: 0 }} style={{ willChange: "transform, opacity" }}>
                <Die value={displayVal1} />
            </motion.div>
            <motion.div animate={controls2} className="absolute" initial={{ opacity: 0 }} style={{ willChange: "transform, opacity" }}>
                <Die value={displayVal2} />
            </motion.div>
        </div>
    );
};
