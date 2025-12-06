import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { isTauri } from '../lib/native-notifications';
import { waitForBackend, isBackendReady, waitForTauriReady } from '../lib/tauri-bridge';
import { setBackendReady } from '../lib/constants';
import { AppLoadingScreen } from './ui/AppLoadingScreen';
import { BackendReadyContext, type BackendReadyContextValue } from './backend-ready-context';

interface BackendReadyProviderProps {
    children: ReactNode;
}

/**
 * Provider that blocks rendering until the backend API is ready.
 * In Tauri mode, it uses the Tauri bridge to check backend status.
 * In web mode, it performs a direct health check.
 */
export function BackendReadyProvider({ children }: BackendReadyProviderProps) {
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [checkCount, setCheckCount] = useState(0);
    const [inTauriMode, setInTauriMode] = useState(false);

    const checkBackendHealth = useCallback(async (): Promise<boolean> => {
        try {
            // In Tauri mode, use the bridge (this is called as a fallback, normally we use waitForTauri first)
            if (isTauri()) {
                return await isBackendReady();
            }

            // In web mode, check health endpoint through Vite proxy
            const response = await fetch('/api/health', {
                method: 'GET',
                signal: AbortSignal.timeout(5000),
            });
            return response.ok;
        } catch {
            return false;
        }
    }, []);

    const waitForBackendReady = useCallback(async () => {
        setError(null);
        // Reset global backend ready state
        setBackendReady(false);

        // Wait for Tauri to be available (may take a moment after page load)
        const inTauri = await waitForTauriReady(2000);
        setInTauriMode(inTauri);

        // In Tauri mode, use the built-in wait function
        if (inTauri) {
            console.log('[BackendReadyProvider] Waiting for backend via Tauri bridge...');
            const ready = await waitForBackend(60000); // 60 second timeout

            if (ready) {
                console.log('[BackendReadyProvider] Backend is ready (Tauri)');
                setBackendReady(true); // Set global flag BEFORE updating React state
                setIsReady(true);
            } else {
                setError('Backend failed to start. Please check the logs or restart the app.');
            }
            return;
        }

        // In web/dev mode, poll the health endpoint
        console.log('[BackendReadyProvider] Polling backend health endpoint...');
        const maxAttempts = 30;
        const pollInterval = 1000;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            setCheckCount(attempt);

            const healthy = await checkBackendHealth();
            if (healthy) {
                console.log(`[BackendReadyProvider] Backend is ready after ${attempt} attempt(s)`);
                setBackendReady(true); // Set global flag BEFORE updating React state
                setIsReady(true);
                return;
            }

            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, pollInterval));
            }
        }

        setError('Could not connect to the backend. Please ensure the backend server is running.');
    }, [checkBackendHealth]);

    const isMountedRef = useRef(true);

    const retry = useCallback(() => {
        setIsReady(false);
        setError(null);
        setCheckCount(0);
        waitForBackendReady();
    }, [waitForBackendReady]);

    useEffect(() => {
        isMountedRef.current = true;

        // Start checking for backend readiness
        const initBackend = async () => {
            await waitForBackendReady();
        };

        initBackend();

        return () => {
            isMountedRef.current = false;
        };
    }, [waitForBackendReady]);

    const contextValue: BackendReadyContextValue = {
        isReady,
        error,
        retry,
    };

    // Determine the loading message based on state
    const getMessage = () => {
        if (checkCount > 0) {
            return `Connecting to backend... (attempt ${checkCount})`;
        }
        return 'Starting services...';
    };

    // Determine the sub-message for Tauri mode
    const getSubMessage = () => {
        if (inTauriMode && !error) {
            return 'Starting PostgreSQL and API server...';
        }
        return undefined;
    };

    if (isReady) {
        return (
            <BackendReadyContext.Provider value={contextValue}>
                {children}
            </BackendReadyContext.Provider>
        );
    }

    return (
        <BackendReadyContext.Provider value={contextValue}>
            <AppLoadingScreen
                message={getMessage()}
                subMessage={getSubMessage()}
                error={error}
                onRetry={retry}
            />
        </BackendReadyContext.Provider>
    );
}
