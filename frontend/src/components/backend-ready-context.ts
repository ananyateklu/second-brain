import { createContext } from 'react';

export interface BackendReadyContextValue {
    isReady: boolean;
    error: string | null;
    retry: () => void;
}

export const BackendReadyContext = createContext<BackendReadyContextValue>({
    isReady: false,
    error: null,
    retry: () => { },
});

