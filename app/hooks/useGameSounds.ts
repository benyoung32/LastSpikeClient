import { useEffect, useRef, useCallback } from 'react';

export const useGameSounds = () => {
    const audioRef = useRef<Record<string, HTMLAudioElement>>({});


    useEffect(() => {
        // Initialize audio objects once
        if (Object.keys(audioRef.current).length === 0) {
            audioRef.current = {
                slide1: new Audio('/sounds/slide1.mp3'),
                slide2: new Audio('/sounds/slide2.mp3'),
                slide3: new Audio('/sounds/slide3.mp3'),
                slide4: new Audio('/sounds/slide4.mp3'),
                build: new Audio('/sounds/build.mp3'),
                riot: new Audio('/sounds/riot.mp3'),
                cash: new Audio('/sounds/cash.mp3'),
                bell: new Audio('/sounds/bell.mp3'),
                dice: new Audio('/sounds/dice.mp3'),
            };

            // Preload
            Object.values(audioRef.current).forEach(audio => {
                audio.load();
                audio.volume = 0.5; // Default volume
            });
        }
    }, []);

    const addSound = useCallback((soundKey: string) => {
        const audioOriginal = audioRef.current[soundKey];
        if (audioOriginal) {
            // Clone the node to allow overlapping playback of the same sound
            // or just simultaneous playback of different sounds without blocking.
            // Using cloneNode to support rapid-fire of the same sound without cutting off.
            const audio = audioOriginal.cloneNode() as HTMLAudioElement;
            audio.volume = audioOriginal.volume;

            audio.play().catch(e => {
                console.warn(`Failed to play sound ${soundKey}:`, e);
            });
        } else {
            console.warn(`Sound not found: ${soundKey}`);
        }
    }, []);

    const getSoundDuration = useCallback((soundKey: string) => {
        const audio = audioRef.current[soundKey];
        if (audio && !isNaN(audio.duration) && audio.duration > 0) {
            return audio.duration;
        }
        return 0.5; // Default fallback if metadata not loaded
    }, []);

    return { addSound, getSoundDuration };
};
