import React from 'react';
import { Property, City, CITY_VALUES, CITY_COLORS } from '@/types';

interface PropertyCardProps {
    property: Property;
    index: number;
    totalInStack: number;
    className?: string;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ property, index, totalInStack }) => {
    const color = CITY_COLORS[property.city];
    const cityValues = CITY_VALUES[property.city];
    const cityName = City[property.city];

    // Indices 1-5 represent the payouts
    const payouts = cityValues.slice(1, 6);

    return (
        <div
            className={`w-48 h-72 select-none bg-cream-100 rounded-lg shadow-xl relative overflow-hidden transition-transform ${index === totalInStack - 1 ? 'hover:scale-105' : ''}`}
            style={{
                backgroundColor: '#FFFDF5', // Creamy paper background
                fontFamily: 'serif'
            }}
        >
            {/* Main Content Container with Border Padding */}
            <div className="absolute inset-2 flex flex-col items-center">

                {/* Header Section */}
                <div className="w-full h-12 relative flex items-center justify-center mb-2">
                    {/* SVG Header Background */}
                    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                        {/* Top decorative bar */}
                        <path d="M0,0 H176 V40 H0 Z" fill="none" />

                        {/* Rounded pill shape for city name */}
                        <path
                            d="M10,20 Q10,5 25,5 H151 Q166,5 166,20 Q166,35 151,35 H25 Q10,35 10,20 Z"
                            fill={color}
                            stroke={color}
                            strokeWidth="2"
                        />
                        {/* Decorative lines above/below pill */}
                        <line x1="10" y1="2" x2="166" y2="2" stroke={color} strokeWidth="2" />
                        <line x1="10" y1="38" x2="166" y2="38" stroke={color} strokeWidth="2" />
                    </svg>

                    {/* City Name Text */}
                    <span
                        className="text-white select-none font-bold text-lg tracking-wide uppercase drop-shadow-md -translate-y-1"
                        style={{ textShadow: '2px 2px 2px rgba(0,0,0,0.3)' }}
                    >
                        {cityName}
                    </span>
                </div>

                {/* Body Section with Decorative Border */}
                <div className="flex-1 w-full relative p-3 flex flex-col items-center">
                    {/* SVG Border for Body */}
                    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                        <rect
                            x="2" y="2"
                            width="98%" height="98%"
                            fill="none"
                            stroke={color}
                            strokeWidth="10"
                            strokeOpacity="0.3"
                        />
                        <rect
                            x="5" y="5"
                            width="calc(100% - 10px)" height="calc(100% - 10px)"
                            fill="none"
                            stroke={color}
                            strokeWidth="2"
                            strokeDasharray="4 2"
                        />
                        {/* Inner fill background for stats to sit on */}
                        <rect
                            x="10" y="10"
                            width="calc(100% - 20px)" height="calc(100% - 20px)"
                            fill="#FFF8E1"
                            stroke="none"
                        />
                    </svg>

                    {/* Content inside the border */}
                    <div className="relative z-10 flex flex-col items-center w-full h-full pt-2">
                        <h3 className="text-xl font-bold text-gray-800 italic mb-3 font-serif">LAND DEED</h3>

                        <div className="w-full px-4 space-y-1">
                            {payouts.map((val, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm font-medium text-gray-700">
                                    <span className="w-6 text-right">{idx + 1}.</span>
                                    <span className="tracking-widest">${val.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
