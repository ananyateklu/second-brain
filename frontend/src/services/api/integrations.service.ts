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

    /**
     * Fetch a single TickTick task by project ID and task ID.
     */
    async getTickTickTask(projectId: string, taskId: string): Promise<TickTickTask> {
        try {
            const endpoint = `/api/integrations/ticktick/tasks/${projectId}/${taskId}`;
            const response = await api.get<TickTickTask>(endpoint);
            return response.data;
        } catch (error) {
            console.error(`Error fetching TickTick task ${taskId} from project ${projectId}:`, error);
            throw error;
        }
    },

    /**
     * Update a TickTick task
     * @param taskId The ID of the task to update
     * @param task The task data to update
     */
    async updateTickTickTask(taskId: string, task: Partial<TickTickTask> & { id: string; projectId: string }): Promise<TickTickTask> {
        try {
            const response = await api.post<TickTickTask>(`/api/integrations/ticktick/tasks/${taskId}`, task);
            return response.data;
        } catch (error) {
            console.error(`Error updating TickTick task ${taskId}:`, error);
            throw error;
        }
    },

    /**
     * Complete a TickTick task
     * @param projectId The project ID containing the task
     * @param taskId The ID of the task to complete
     */
    async completeTickTickTask(projectId: string, taskId: string): Promise<boolean> {
        try {
            await api.post(`/api/integrations/ticktick/tasks/${projectId}/${taskId}/complete`);
            return true;
        } catch (error) {
            console.error(`Error completing TickTick task ${taskId}:`, error);
            throw error;
        }
    },

    /**
     * Delete a TickTick task
     * @param projectId The project ID containing the task
     * @param taskId The ID of the task to delete
     */
    async deleteTickTickTask(projectId: string, taskId: string): Promise<boolean> {
        try {
            await api.delete(`/api/integrations/ticktick/tasks/${projectId}/${taskId}`);
            return true;
        } catch (error) {
            console.error(`Error deleting TickTick task ${taskId}:`, error);
            throw error;
        }
    },

    // Add functions for other integrations or integration actions here later
    // e.g., getTickTickProjects(), createTickTickTask(), etc.
}; 