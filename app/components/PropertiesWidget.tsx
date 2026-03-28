"use client";

import React, { useState, useMemo } from 'react';
import { AnimatedModalWidget } from './AnimatedModalWidget';
import { Property, City, CITY_COLORS } from '@/types';
import { PropertyCard } from './PropertyCard';

export interface PropertiesWidgetProps {
    properties: Property[];
    className?: string;
    arcDirection?: 'up' | 'down';
    children?: React.ReactNode;
    emptyMessage?: string;
    disableTriggerEffects?: boolean;
}

export const PropertiesWidget: React.FC<PropertiesWidgetProps> = ({
    properties,
    className = "",
    arcDirection = 'up',
    children,
    emptyMessage = "No properties owned yet.",
    disableTriggerEffects = false
}) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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


    const isUp = arcDirection === 'up';

    return (
        <AnimatedModalWidget
            className={className}
            triggerClassName="relative rounded-lg"
            baseModalClassName="bg-slate-800/50 border-none rounded-xl shadow-2xl"
            animatingModalClassName="bg-slate-800/80 border border-slate-700 rounded-lg shadow-none"
            modalClassName="w-[80vw] h-[80vh]"
            triggerContent={
                children ? children : (
                    <>
                        {/* Minimized Content: Arc of Cards */}
                        <div className={`absolute inset-0 flex ${isUp ? 'items-end pb-2' : 'items-start pt-2'} justify-center pointer-events-none`}>
                            {layout && flatProperties.map((prop, index) => {
                                // Per-card position calc (cheap)
                                const angleDeg = layout.startAngle + index * layout.angleStep;
                                const angleRad = (angleDeg * Math.PI) / 180;

                                const x = layout.radius * Math.sin(angleRad);
                                const y = layout.radius * (1 - Math.cos(angleRad));

                                const isHovered = hoveredIndex === index;
                                const currentScale = isHovered ? layout.scale * 1.1 : layout.scale;
                                const zIndex = isHovered ? 100 : index;

                                const cardStyle: React.CSSProperties = {
                                    transform: `translate(${x}px, ${isUp ? y : -y + 140}px) rotate(${isUp ? angleDeg : -angleDeg + 180}deg) scale(${currentScale})`,
                                    zIndex: zIndex,
                                    left: '0px',
                                    right: '0px',
                                    margin: 'auto',
                                    width: '12rem', // w-48
                                    height: '18rem' // h-72
                                };

                                if (isUp) {
                                    cardStyle.bottom = '10px';
                                } else {
                                    cardStyle.top = '10px';
                                }

                                const shadowStyle = {
                                    // Scale is now handled in parent transform
                                    boxShadow: isUp
                                        ? '0 30px 40px -5px rgba(0, 0, 0, 0.7), 0 15px 20px -6px rgba(0, 0, 0, 0.7)'
                                        : '0 -30px 40px -5px rgba(0, 0, 0, 0.7), 0 -15px 20px -6px rgba(0, 0, 0, 0.7)'
                                };

                                return (
                                    <div
                                        key={`${prop.city}-${index}`}
                                        className={`absolute ${isUp ? 'origin-bottom' : 'origin-top'} transition-transform duration-300 ease-out pointer-events-auto`}
                                        style={cardStyle}
                                        onMouseEnter={() => setHoveredIndex(index)}
                                        onMouseLeave={() => setHoveredIndex(null)}
                                    >
                                        <div
                                            className={`${isUp ? 'origin-bottom' : 'origin-top'} transition-transform duration-300`}
                                            style={shadowStyle}
                                        >
                                            <PropertyCard
                                                property={prop}
                                                index={index}
                                                totalInStack={flatProperties.length}
                                                interactive={!disableTriggerEffects}
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
                    </>
                )
            }
            modalContent={
                <div className="flex flex-wrap gap-12 justify-center pb-10 pt-4 p-8">
                    {Object.entries(groupedProperties).map(([cityStr, props]) => {
                        const city = parseInt(cityStr) as City;
                        const stackHeight = 288 + (Math.max(0, props.length - 1) * 20); // 288px (h-72) + offsets

                        return (
                            <div
                                key={city}
                                className="relative w-48 mb-12 transform hover:scale-105 transition-transform duration-200"
                                style={{ height: `${stackHeight}px` }}
                            >
                                {props.map((prop, index) => (
                                    <div
                                        key={index}
                                        className="absolute top-0 left-0"
                                        style={{
                                            transform: `translateY(${index * 20}px)`,
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
                        <div className="text-gray-500 italic mt-10 text-xl font-cute">{emptyMessage}</div>
                    )}
                </div>
            }
        />
    );
};
