import { useEffect, useState } from 'react';

/**
 * Check if we're running in Tauri
 */
const isTauri = (): boolean => {
    return '__TAURI_INTERNALS__' in window;
};

/**
 * Hook to get the title bar height for proper content spacing
 */
export function useTitleBarHeight(): number {
    const [isTauriApp, setIsTauriApp] = useState(false);

    useEffect(() => {
        setIsTauriApp(isTauri());
    }, []);

    // Return 28px (macOS standard) for Tauri, 0 for web
    return isTauriApp ? 28 : 0;
}

/**
 * TitleBar component that provides a draggable region for macOS window controls
 * This creates a seamless title bar that blends with the app's design
 */
export function TitleBar() {
    const [isTauriApp, setIsTauriApp] = useState(false);

    useEffect(() => {
        setIsTauriApp(isTauri());
    }, []);

    // Don't render anything if not in Tauri
    if (!isTauriApp) {
        return null;
    }

    return (
        <div
            className="title-bar fixed top-0 left-0 right-0 z-[9999] h-7"
            data-tauri-drag-region
            style={{
                WebkitAppRegion: 'drag',
                // Transparent background to let the app content show through
                background: 'transparent',
            } as React.CSSProperties}
        >
            {/* Inset padding for traffic light buttons - macOS specific */}
            <div
                className="traffic-light-spacer absolute left-0 top-0 h-full pointer-events-none"
                style={{
                    // Traffic lights are approximately 78px wide with standard macOS spacing
                    width: '78px',
                    // This area is non-draggable to allow interaction with native buttons
                    WebkitAppRegion: 'no-drag',
                } as React.CSSProperties}
            />

            {/* Optional: Add subtle gradient for better visual integration */}
            <div
                className="absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-300"
                style={{
                    background: 'linear-gradient(to bottom, var(--surface-card) 0%, transparent 100%)',
                }}
            />
        </div>
    );
}

