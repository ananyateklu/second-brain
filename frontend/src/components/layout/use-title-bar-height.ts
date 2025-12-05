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
