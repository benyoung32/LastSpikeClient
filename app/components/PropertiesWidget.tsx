"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Property, City, CITY_COLORS } from '@/types';
import { PropertyCard } from './PropertyCard';

export interface PropertiesWidgetProps {
    properties: Property[];
    className?: string;
}

export const PropertiesWidget: React.FC<PropertiesWidgetProps> = ({ properties, className = "" }) => {
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
    const groupedProperties = properties.reduce((accumulate, prop) => {
        const cityKey = prop.city;
        if (!accumulate[cityKey]) accumulate[cityKey] = [];
        accumulate[cityKey].push(prop);
        return accumulate;
    }, {} as Record<City, Property[]>);

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

    return (
        <>
            {/* Minimized Trigger */}
            <div
                ref={triggerRef}
                className={`bg-slate-800/80 hover:bg-slate-700 relative rounded-lg cursor-pointer active:scale-95 transition-all duration-200 overflow-hidden border border-slate-700 ${className} ${isOpen ? 'opacity-0' : 'opacity-100'}`}
                onClick={handleOpen}
            >
                {/* ... trigger content ... */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="text-emerald-400 font-bold text-lg mb-1">Properties</div>
                    <div className="text-slate-300 text-sm">{properties.length} Owned</div>
                    {properties.length > 0 && (
                        <div className={`flex mt-2 mb-1 ${properties.length > 15 ? '-space-x-5' : properties.length > 8 ? '-space-x-4' : '-space-x-3'}`}>
                            {Object.entries(groupedProperties).map(([cityStr, props], i) => {
                                const city = parseInt(cityStr) as City;
                                return props.map((_, index) => (
                                    <div
                                        key={`${cityStr}-${index}`}
                                        className="w-6 h-8 rounded border border-gray-800"
                                        style={{ backgroundColor: CITY_COLORS[city] }}
                                    />
                                ));
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Expanded Modal (Portaled) */}
            {mounted && isOpen && createPortal(
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
                            ${isAnimating ? 'bg-slate-800/80 rounded-lg shadow-none' : 'bg-transparent border-none rounded-xl shadow-none'}
                        `}
                        style={getModalStyle()}
                    >

                        {/* Close Button */}
                        <button
                            onClick={handleClose}
                            className={`absolute top-4 right-4 text-gray-400 hover:text-white transition-opacity duration-200 z-20 p-2 ${animationState === 'open' ? 'opacity-100' : 'opacity-0'}`}
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

                        {/* Placeholder Content for Minimized State Fade */}
                        <div className={`font-cute absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-300 ${animationState === 'open' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                            <div className="text-emerald-400">Properties</div>
                            <div className="text-slate-300">{properties.length} Owned</div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};
