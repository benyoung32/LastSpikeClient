"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const ANIMATION_DURATION_MS = 350;

export interface AnimatedModalWidgetProps {
    triggerContent: React.ReactNode;
    modalContent: React.ReactNode | ((closeFunc: () => void) => React.ReactNode);
    className?: string; // Wrapper class
    triggerClassName?: string;
    modalClassName?: string;
    // Optional props for customizing colors if needed, though modalClassName is usually enough
    baseModalClassName?: string;
    animatingModalClassName?: string;
    hideDefaultCloseButton?: boolean;
}

export const AnimatedModalWidget: React.FC<AnimatedModalWidgetProps> = ({
    triggerContent,
    modalContent,
    className = "",
    triggerClassName = "",
    modalClassName = "",
    baseModalClassName = "bg-slate-800/50 border-none rounded-xl shadow-2xl",
    animatingModalClassName = "bg-slate-800/80 border border-slate-700 rounded-lg shadow-none",
    hideDefaultCloseButton = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [startRect, setStartRect] = useState<DOMRect | null>(null);
    const [openRect, setOpenRect] = useState<DOMRect | null>(null);
    const [animationState, setAnimationState] = useState<'closed' | 'measuring' | 'opening' | 'open' | 'closing'>('closed');
    const triggerRef = React.useRef<HTMLDivElement>(null);
    const modalRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleOpen = () => {
        if (triggerRef.current) {
            setStartRect(triggerRef.current.getBoundingClientRect());
            setIsOpen(true);
            setAnimationState('measuring');
        }
    };

    React.useLayoutEffect(() => {
        if (animationState === 'measuring') {
            if (modalRef.current) {
                setOpenRect(modalRef.current.getBoundingClientRect());
                setAnimationState('opening');
            }
        } else if (animationState === 'opening') {
            // Force a reflow to ensure the browser registers the initial zero-opacity scaled-down transform state
            if (modalRef.current) {
                // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                modalRef.current.offsetHeight;
            }
            requestAnimationFrame(() => {
                setAnimationState('open');
            });
        }
    }, [animationState]);

    const handleClose = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (triggerRef.current) {
            setStartRect(triggerRef.current.getBoundingClientRect());
        }
        if (modalRef.current) {
            setOpenRect(modalRef.current.getBoundingClientRect());
        }
        setAnimationState('closing');
        setTimeout(() => {
            setIsOpen(false);
            setAnimationState('closed');
        }, ANIMATION_DURATION_MS);
    };

    const getModalStyle = (): React.CSSProperties => {
        if (animationState === 'measuring') {
            return {
                opacity: 0,
                transition: 'none',
                transform: 'none',
                pointerEvents: 'none'
            };
        }

        if (animationState === 'opening' || animationState === 'closing') {
            if (!startRect || !openRect) return { opacity: 0 };

            const scaleX = startRect.width / openRect.width;
            const scaleY = startRect.height / openRect.height;

            const startCenterX = startRect.left + startRect.width / 2;
            const startCenterY = startRect.top + startRect.height / 2;

            const openCenterX = openRect.left + openRect.width / 2;
            const openCenterY = openRect.top + openRect.height / 2;

            const translateX = startCenterX - openCenterX;
            const translateY = startCenterY - openCenterY;

            return {
                transition: animationState === 'closing' ? `transform ${ANIMATION_DURATION_MS}ms cubic-bezier(0.16,1,0.3,1), opacity ${ANIMATION_DURATION_MS}ms ease` : 'none',
                transform: `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`,
                opacity: 0,
                transformOrigin: 'center',
                pointerEvents: 'none'
            };
        }

        if (animationState === 'open') {
            return {
                transition: `transform ${ANIMATION_DURATION_MS}ms cubic-bezier(0.16,1,0.3,1), opacity ${ANIMATION_DURATION_MS}ms ease`,
                transform: 'translate(0px, 0px) scale(1, 1)',
                opacity: 1,
                transformOrigin: 'center'
            };
        }

        return {};
    };

    const isTriggerHidden = isOpen && animationState !== 'closing';

    return (
        <div className={className}>
            {/* Minimized Trigger */}
            <div
                ref={triggerRef}
                className={`relative cursor-pointer transition-all duration-200 ${triggerClassName} ${isTriggerHidden ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                onClick={handleOpen}
            >
                {triggerContent}
            </div>

            {/* Expanded Modal (Portaled) */}
            {mounted && isOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none overflow-hidden p-4 sm:p-8">
                    {/* Backdrop */}
                    <div
                        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity pointer-events-auto ${animationState === 'open' ? 'opacity-100' : 'opacity-0'}`}
                        style={{ transitionDuration: `${ANIMATION_DURATION_MS}ms` }}
                        onClick={handleClose}
                    />

                    <div
                        ref={modalRef}
                        className={`relative overflow-hidden flex flex-col pointer-events-auto transition-all duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)]
                            ${animationState === 'opening' || animationState === 'closing' ? animatingModalClassName : baseModalClassName}
                            ${modalClassName}
                        `}
                        style={getModalStyle()}
                    >
                        {/* Close Button */}
                        {!hideDefaultCloseButton && (
                            <button
                                onClick={handleClose}
                                className={`absolute top-4 right-4 text-gray-400 hover:text-white transition-opacity duration-200 z-20 p-2 ${animationState === 'open' ? 'opacity-100' : 'opacity-0'} `}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}

                        {/* Content */}
                        <div
                            className={`flex-1 overflow-y-auto w-full h-full transition-opacity ${animationState === 'open' ? 'opacity-100' : 'opacity-0'} [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}
                            style={{ transitionDuration: animationState === 'open' ? `${ANIMATION_DURATION_MS}ms` : `${ANIMATION_DURATION_MS / 2}ms` }}
                        >
                            {typeof modalContent === 'function' ? modalContent(handleClose) : modalContent}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
