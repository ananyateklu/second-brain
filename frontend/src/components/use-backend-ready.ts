import { useContext } from 'react';
import { BackendReadyContext } from './backend-ready-context';

export const useBackendReady = () => useContext(BackendReadyContext);

