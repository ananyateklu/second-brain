import api from './api';
import { TickTickTask } from '../../types/integrations';
import axios, { AxiosError } from 'axios';

export interface TickTickStatus {
    isConnected: boolean;
    expiresAt?: string;
}

export const integrationsService = {
    /**
     * Checks if the current user has connected their TickTick account
     * @param previousState Optional previous connection state to maintain during network issues
     */
    async getTickTickStatus(previousState?: boolean): Promise<TickTickStatus> {
        try {
            const response = await api.get<TickTickStatus>('/api/integrations/ticktick/status');
            return response.data;
        } catch (error) {
            console.error("Error checking TickTick status:", error);

            // If we have a previous state and this is likely a network error, maintain the previous state
            if (previousState !== undefined && axios.isAxiosError(error)) {
                const axiosError = error as AxiosError;
                if (axiosError.response?.status === 503 || !axiosError.response) {
                    return { isConnected: previousState };
                }
            }

            return { isConnected: false };
        }
    },

    /**
     * Fetches tasks from the user's connected TickTick account via the backend.
     * Requires the user to be authenticated and have connected TickTick.
     */
    async getTickTickTasks(projectId?: string): Promise<TickTickTask[]> {
        try {
            const endpoint = projectId ? `/api/integrations/ticktick/tasks?projectId=${projectId}` : '/api/integrations/ticktick/tasks';
            const response = await api.get<TickTickTask[]>(endpoint);
            return response.data;
        } catch (error: unknown) {
            console.error("Error fetching TickTick tasks:", error);

            if (axios.isAxiosError(error)) {
                const axiosError = error as AxiosError;
                if (axiosError.response?.status === 404) {
                    console.warn("TickTick integration not found or credentials missing.");
                    return [];
                } else if (axiosError.response?.status === 401) {
                    console.warn("TickTick token expired. Needs refresh or reconnect.");
                    return [];
                }
            } else if (error instanceof Error) {
                console.error("Non-HTTP Error fetching TickTick tasks:", error.message);
            }

            throw error;
        }
    },

    /**
     * Fetch TickTick projects available for the connected user.
     */
    async getTickTickProjects(): Promise<{ id: string; name: string; color?: string; }[]> {
        try {
            const response = await api.get('/api/integrations/ticktick/projects');
            return response.data;
        } catch (error) {
            console.error('Error fetching TickTick projects:', error);
            throw error;
        }
    },

    /**
     * Disconnects the TickTick integration
     * @returns A promise that resolves to the success status
     */
    async disconnectTickTick(): Promise<boolean> {
        try {
            await api.delete('/api/integrations/ticktick');
            // Update localStorage to reflect disconnection
            localStorage.setItem('ticktick_connected', 'false');
            return true;
        } catch (error) {
            console.error("Error disconnecting TickTick:", error);
            throw error;
        }
    },

    async exchangeTickTickCode(code: string): Promise<boolean> {
        try {
            await api.post('/api/integrations/ticktick/exchange-code', { code });
            // On success, update localStorage flag to true
            localStorage.setItem('ticktick_connected', 'true');
            return true;
        } catch (error) {
            console.error("Error exchanging TickTick code:", error);
            throw error;
        }
    },

    // Add functions for other integrations or integration actions here later
    // e.g., getTickTickProjects(), createTickTickTask(), etc.
}; 