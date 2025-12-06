import { useState } from 'react';

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
    // Use lazy initialization to avoid setState in useEffect
    const [isTauriApp] = useState(() => isTauri());

    // Return 16px (reduced from 28px) for Tauri to allow tighter header integration
    // while still keeping content below the traffic lights
    return isTauriApp ? 16 : 0;
}
