"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Property, City, CITY_COLORS } from '@/types';
import { PropertyCard } from './PropertyCard';

export interface PropertiesWidgetProps {
    properties: Property[];
    className?: string;
    arcDirection?: 'up' | 'down';
}

export const PropertiesWidget: React.FC<PropertiesWidgetProps> = ({ properties, className = "", arcDirection = 'up' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [startRect, setStartRect] = useState<DOMRect | null>(null);
    const [animationState, setAnimationState] = useState<'closed' | 'opening' | 'open' | 'closing'>('closed');
    const triggerRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleOpen = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setStartRect(rect);
            setIsOpen(true);
            setAnimationState('opening');

            // Force layout reflow before starting animation
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setAnimationState('open');
                });
            });
        }
    };

    const handleClose = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        // Update rect in case the user scrolled or the element moved
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setStartRect(rect);
        }
        setAnimationState('closing');
        setTimeout(() => {
            setIsOpen(false);
            setAnimationState('closed');
        }, 20);
    };

    // Group properties
    const groupedProperties = useMemo(() => properties.reduce((accumulate, prop) => {
        const cityKey = prop.city;
        if (!accumulate[cityKey]) accumulate[cityKey] = [];
        accumulate[cityKey].push(prop);
        return accumulate;
    }, {} as Record<City, Property[]>), [properties]);

    // Pre-calculate arc layout to avoid O(N) calculations in render loop
    const { flatProperties, layout } = useMemo(() => {
        const flat = Object.values(groupedProperties).flat();
        const total = flat.length;

        if (total === 0) return { flatProperties: flat, layout: null };

        // Constants
        const radius = 300;
        const saturationPoint = 15;
        const maxScale = 0.5;
        const minScale = 0.25;

        // Layout
        const maxFanAngle = total > 1 ? Math.min(40, total * 3) : 0;
        const angleStep = total > 1 ? maxFanAngle / (total - 1) : 0;
        const startAngle = -maxFanAngle / 2;

        const scale = total <= 1
            ? maxScale
            : Math.max(minScale, maxScale - ((total - 1) * ((maxScale - minScale) / (saturationPoint - 1))));

        return {
            flatProperties: flat,
            layout: {
                radius,
                angleStep,
                startAngle,
                scale
            }
        };
    }, [groupedProperties]);

    if (!properties) return null;

    // Helper to get styles based on animation state
    const getModalStyle = () => {
        if (animationState === 'opening' || animationState === 'closing') {
            if (!startRect) return {};
            return {
                top: startRect.top,
                left: startRect.left,
                width: startRect.width,
                height: startRect.height,
                transform: 'none'
            } as React.CSSProperties;
        }
        return {
            top: '10vh',
            left: '10vw',
            width: '80vw',
            height: '80vh',
            transform: 'none'
        } as React.CSSProperties;
    };

    const isAnimating = animationState === 'opening' || animationState === 'closing';
    const isUp = arcDirection === 'up';

    return (
        <>
            {/* Minimized Trigger */}
            <div
                ref={triggerRef}
                className={`relative rounded-lg cursor-pointer active:scale-95 transition-all duration-200 ${className} ${isOpen ? 'opacity-0' : 'opacity-100'}`}
                onClick={handleOpen}
            >
                {/* ... trigger content ... */}
                {/* Minimized Content: Arc of Cards */}
                <div className={`absolute inset-0 flex ${isUp ? 'items-end pb-2' : 'items-start pt-2'} justify-center pointer-events-none`}>
                    {layout && flatProperties.map((prop, index) => {
                        // Per-card position calc (cheap)
                        const angleDeg = layout.startAngle + index * layout.angleStep;
                        const angleRad = (angleDeg * Math.PI) / 180;

                        const x = layout.radius * Math.sin(angleRad);
                        const y = layout.radius * (1 - Math.cos(angleRad));

                        const cardStyle: React.CSSProperties = {
                            transform: `translate(${x}px, ${isUp ? y : -y + 140}px) rotate(${isUp ? angleDeg : -angleDeg + 180}deg)`,
                            zIndex: index,
                            left: '0px',
                            right: '0px',
                            margin: 'auto',
                            width: 'fit-content'
                        };

                        if (isUp) {
                            cardStyle.bottom = '10px';
                        } else {
                            cardStyle.top = '10px';
                        }

                        // Shadow calculation uses the pre-calculated scale but style object is created here
                        const shadowStyle = {
                            transform: `scale(${layout.scale})`,
                            boxShadow: isUp
                                ? '0 30px 40px -5px rgba(0, 0, 0, 0.7), 0 15px 20px -6px rgba(0, 0, 0, 0.7)'
                                : '0 -30px 40px -5px rgba(0, 0, 0, 0.7), 0 -15px 20px -6px rgba(0, 0, 0, 0.7)'
                        };

                        return (
                            <div
                                key={`${prop.city}-${index}`}
                                className={`absolute ${isUp ? 'origin-bottom' : 'origin-top'} transition-transform duration-300 ease-out`}
                                style={cardStyle}
                            >
                                <div
                                    className={`${isUp ? 'origin-bottom' : 'origin-top'} transition-transform duration-300`}
                                    style={shadowStyle}
                                >
                                    <PropertyCard
                                        property={prop}
                                        index={index}
                                        totalInStack={flatProperties.length}
                                    />
                                </div>
                            </div>
                        );
                    })}


                    {properties.length === 0 && (
                        <div className="text-slate-500 font-cute text-sm mb-4 opacity-50">
                            No properties
                        </div>
                    )}
                </div>
            </div >

            {/* Expanded Modal (Portaled) */}
            {
                mounted && isOpen && createPortal(
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none overflow-hidden">
                        {/* Backdrop */}
                        <div
                            className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto ${animationState === 'open' ? 'opacity-100' : 'opacity-0'}`}
                            onClick={handleClose}
                        />

                        {/* Morphing Container */}
                        <div
                            // Synchronize styles with trigger for seamless transition
                            className={`fixed border border-slate-700 overflow-hidden flex flex-col pointer-events-auto transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] 
                            ${isAnimating ? 'bg-slate-800/80 rounded-lg shadow-none' : 'bg-slate-800/50 border-none rounded-xl shadow-none'}
                        `}
                            style={getModalStyle()}
                        >

                            {/* Close Button */}
                            <button
                                onClick={handleClose}
                                className={`absolute top-4 right-4 text-gray-400 hover:text-white transition-opacity duration-200 z-20 p-2 ${animationState === 'open' ? 'opacity-100' : 'opacity-0'} `}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>

                            {/* Content */}
                            <div className={`flex-1 overflow-y-auto p-8 transition-opacity duration-300 delay-100 ${animationState === 'open' ? 'opacity-100' : 'opacity-0'}`}>
                                <div className="flex flex-wrap gap-12 justify-center pb-10 pt-4">
                                    {Object.entries(groupedProperties).map(([cityStr, props]) => {
                                        const city = parseInt(cityStr) as City;
                                        return (
                                            <div key={city} className="relative w-48 h-64 mb-12 transform hover:scale-105 transition-transform duration-200">
                                                {props.map((prop, index) => (
                                                    <div
                                                        key={index}
                                                        className="absolute top-0 left-0"
                                                        style={{
                                                            transform: `translateY(${index * 35}px)`,
                                                            zIndex: index
                                                        }}
                                                    >
                                                        <PropertyCard property={prop} index={index} totalInStack={props.length} />
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })}

                                    {properties.length === 0 && (
                                        <div className="text-gray-500 italic mt-10 text-xl font-cute">No properties owned yet.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }
        </>
    );
};
