"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, Player, Property } from '@/types';
import { AnimatedModalWidget } from './AnimatedModalWidget';
import { PropertyCard } from './PropertyCard';

interface PropertyPurchasePopupProps {
    gameState: GameState;
    players: Player[];
}

export const PropertyPurchasePopup: React.FC<PropertyPurchasePopupProps> = ({ gameState, players }) => {
    const [activeProperty, setActiveProperty] = useState<Property | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [startRect, setStartRect] = useState<DOMRect | null>(null);
    const [endRect, setEndRect] = useState<DOMRect | null>(null);

    const prevPropertiesRef = useRef<Property[] | null>(null);
    const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

    const triggerPopup = useCallback((prop: Property) => {
        // Measure Deck rect (Start)
        const deckElem = document.getElementById('deck-widget');
        const measuredDeckRect = deckElem ? deckElem.getBoundingClientRect() : null;
        const fallbackStartRect = measuredDeckRect || new DOMRect(
            window.innerWidth - 180,
            window.innerHeight - 220,
            128,
            176
        );

        // Measure Player Panel rect (End)
        const playerElem = document.getElementById(`player-panel-${prop.owner_PID}`);
        const measuredPlayerRect = playerElem ? playerElem.getBoundingClientRect() : null;

        setStartRect(fallbackStartRect);
        setEndRect(measuredPlayerRect || fallbackStartRect);
        setActiveProperty(prop);
        setIsOpen(true);
    }, []);

    // 1. Detect property purchases when gameState.properties total count increases
    useEffect(() => {
        if (!gameState || !gameState.properties) return;

        const currentProps = gameState.properties;
        const prevProps = prevPropertiesRef.current;

        if (prevProps !== null && currentProps.length > prevProps.length) {
            // Count occurrences in prev vs current to identify newly added properties
            const prevCounts = new Map<string, number>();
            prevProps.forEach(p => {
                const key = `${p.city}_${p.owner_PID}`;
                prevCounts.set(key, (prevCounts.get(key) || 0) + 1);
            });

            const newlyBought: Property[] = [];
            const currentCounts = new Map<string, number>();
            currentProps.forEach(p => {
                const key = `${p.city}_${p.owner_PID}`;
                const count = (currentCounts.get(key) || 0) + 1;
                currentCounts.set(key, count);
                if (count > (prevCounts.get(key) || 0)) {
                    newlyBought.push(p);
                }
            });

            if (newlyBought.length > 0) {
                // If several new properties are detected at once, display the latest one
                const latestProp = newlyBought[newlyBought.length - 1];
                triggerPopup(latestProp);
            }
        }

        prevPropertiesRef.current = currentProps;
    }, [gameState?.properties, triggerPopup]);

    useEffect(() => {
        if (!isOpen) return;

        autoCloseTimerRef.current = setTimeout(() => {
            handleDismiss();
        }, 2500);

        const handleGlobalClick = () => {
            handleDismiss();
        };

        window.addEventListener('click', handleGlobalClick, { capture: true, once: true });

        return () => {
            if (autoCloseTimerRef.current) {
                clearTimeout(autoCloseTimerRef.current);
            }
            window.removeEventListener('click', handleGlobalClick, { capture: true });
        };
    }, [isOpen]);

    const handleDismiss = () => {
        if (autoCloseTimerRef.current) {
            clearTimeout(autoCloseTimerRef.current);
            autoCloseTimerRef.current = null;
        }
        setIsOpen(false);
    };

    const handleModalAnimationClosed = () => {
        setActiveProperty(null);
    };

    if (!activeProperty) return null;

    return (
        <AnimatedModalWidget
            isOpen={isOpen}
            onClose={handleModalAnimationClosed}
            customStartRect={startRect}
            customEndRect={endRect}
            animationDurationMs={750}
            baseModalClassName="bg-transparent border-none shadow-none p-0 overflow-visible"
            animatingModalClassName="bg-transparent border-none shadow-none p-0 overflow-visible"
            modalClassName="w-auto h-auto flex items-center justify-center select-none cursor-pointer overflow-visible"
            hideDefaultCloseButton={true}
            modalContent={() => (
                <PropertyCard
                    property={activeProperty}
                    index={0}
                    totalInStack={1}
                />
            )}
        />
    );
};
