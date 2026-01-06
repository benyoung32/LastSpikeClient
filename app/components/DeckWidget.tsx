"use client";

import React from 'react';
import { Property } from '@/types';
import { PropertiesWidget } from './PropertiesWidget';

export interface DeckWidgetProps {
    properties: Property[];
    className?: string;
}

export const DeckWidget: React.FC<DeckWidgetProps> = ({ properties, className = "" }) => {
    const cardRef = React.useRef<HTMLDivElement>(null);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        cardRef.current.style.setProperty('--mouse-x', x.toString());
        cardRef.current.style.setProperty('--mouse-y', y.toString());
    };

    const handleMouseLeave = () => {
        if (!cardRef.current) return;
        cardRef.current.style.setProperty('--mouse-x', '0.5');
        cardRef.current.style.setProperty('--mouse-y', '0.5');
    };

    return (
        <PropertiesWidget
            properties={properties}
            className={className}
            disableTriggerEffects={true}
            emptyMessage="The deck is empty!"
        >
            {/* Deck Trigger (Face Down Stack) */}
            <div className={`relative w-32 h-44 cursor-pointer group`}>
                {/* Stack Effects (Cards underneath) */}
                <div className="absolute top-0 left-0 w-full h-full bg-[#c7b299] rounded-lg transform translate-x-2 translate-y-2 border border-[#8c7b6c]" />
                <div className="absolute top-0 left-0 w-full h-full bg-[#d6c0a5] rounded-lg transform translate-x-1 translate-y-1 border border-[#8c7b6c]" />

                {/* Top Card (Face Down) */}
                <div
                    ref={cardRef}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    className="absolute top-0 left-0 w-full h-full rounded-lg shadow-2xl flex flex-col items-center justify-center overflow-hidden mouse-effect-3d mouse-effect-spotlight transition-transform duration-200"
                    style={{ backgroundColor: '#e6dcc0', fontFamily: 'serif' }}
                >
                    {/* Decorative Border SVG */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        <rect x="6" y="6" width="116" height="164" rx="4" fill="none" stroke="#5c4d3c" strokeWidth="3" />
                        <rect x="10" y="10" width="108" height="156" rx="2" fill="none" stroke="#5c4d3c" strokeWidth="1" strokeDasharray="4 2" />

                        {/* Corner Decorations */}
                        <path d="M 12 12 L 24 12 L 12 24 Z" fill="#5c4d3c" />
                        <path d="M 116 12 L 104 12 L 116 24 Z" fill="#5c4d3c" />
                        <path d="M 12 164 L 24 164 L 12 152 Z" fill="#5c4d3c" />
                        <path d="M 116 164 L 104 164 L 116 152 Z" fill="#5c4d3c" />
                    </svg>

                    {/* Branding Text */}
                    <div className="relative z-10 flex flex-col items-center mb-6">
                        <span className="text-[#8c7356] text-[10px] tracking-[0.2em] uppercase font-bold mb-1">The</span>
                        <h1 className="text-[#3e3223] text-2xl font-bold tracking-widest uppercase text-center leading-none drop-shadow-sm">
                            Last<br />Spike
                        </h1>
                    </div>

                    {/* Center Decoration */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                        <div className="w-20 h-20 rounded-full border-4 border-[#3e3223] border-dashed" />
                    </div>
                </div>

                {/* Badge Overlay */}
                <div className="absolute -top-3 -right-3 w-8 h-8 bg-amber-700/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg border-2 border-[#e6dcc0] z-20 group-hover:-translate-y-1 transition-transform duration-200 pointer-events-none">
                    <span className="text-[#e6dcc0] font-bold text-sm">{properties.length}</span>
                </div>
            </div>
        </PropertiesWidget>
    );
};
