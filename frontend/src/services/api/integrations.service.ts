import api from './api';
import { TickTickTask } from '../../types/integrations';
import axios, { AxiosError } from 'axios';

export interface TickTickStatus {
    isConnected: boolean;
    expiresAt?: string;
}

export interface SyncConfig {
    resolutionStrategy: string;
    includeTags: boolean;
    projectId: string;
}

export interface SyncResult {
    success: boolean;
    created: number;
    updated: number;
    deleted: number;
    errors: number;
    message?: string;
    lastSynced: string;
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
     * Fetches tasks or notes from the user's connected TickTick account via the backend.
     * Requires the user to be authenticated and have connected TickTick.
     * @param projectId Optional project ID to filter tasks by project
     * @returns A list of TickTick tasks or notes depending on the project type
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
     * @param kind Optional filter for project kind (e.g., "TASK", "NOTE")
     * @returns A list of TickTick projects, optionally filtered by kind
     */
    async getTickTickProjects(kind?: string): Promise<{ id: string; name: string; color?: string; kind?: string; }[]> {
        try {
            const endpoint = kind ? `/api/integrations/ticktick/projects?kind=${kind}` : '/api/integrations/ticktick/projects';
            const response = await api.get(endpoint);
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
     * Fetch a single TickTick task or note by project ID and item ID.
     */
    async getTickTickTask(projectId: string, taskId: string): Promise<TickTickTask> {
        try {
            const endpoint = `/api/integrations/ticktick/tasks/${projectId}/${taskId}`;
            const response = await api.get<TickTickTask>(endpoint);
            return response.data;
        } catch (error) {
            console.error(`Error fetching TickTick item ${taskId} from project ${projectId}:`, error);
            throw error;
        }
    },

    /**
     * Update a TickTick task or note
     * @param taskId The ID of the item to update
     * @param task The item data to update
     */
    async updateTickTickTask(taskId: string, task: Partial<TickTickTask> & { id: string; projectId: string }): Promise<TickTickTask> {
        try {
            const response = await api.post<TickTickTask>(`/api/integrations/ticktick/tasks/${taskId}`, task);
            return response.data;
        } catch (error) {
            console.error(`Error updating TickTick item ${taskId}:`, error);
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
     * Delete a TickTick task or note
     * @param projectId The project ID containing the item
     * @param taskId The ID of the item to delete
     */
    async deleteTickTickTask(projectId: string, taskId: string): Promise<boolean> {
        try {
            await api.delete(`/api/integrations/ticktick/tasks/${projectId}/${taskId}`);
            return true;
        } catch (error) {
            console.error(`Error deleting TickTick item ${taskId}:`, error);
            throw error;
        }
    },

    /**
     * Create a new TickTick task or note
     * @param projectId The project ID to create the item in
     * @param task The item data to create
     */
    async createTickTickTask(projectId: string, task: Partial<TickTickTask>): Promise<TickTickTask> {
        try {
            const response = await api.post<TickTickTask>(`/api/integrations/ticktick/projects/${projectId}/tasks`, task);
            return response.data;
        } catch (error) {
            console.error(`Error creating TickTick item:`, error);
            throw error;
        }
    },

    /**
     * Synchronize tasks between Second Brain and TickTick
     * @param config Synchronization configuration (direction is ignored, always syncs from TickTick)
     */
    async syncTickTickTasks(config: Omit<SyncConfig, 'direction'>): Promise<SyncResult> {
        try {
            // Backend now handles direction implicitly as 'from-ticktick'
            const response = await api.post<SyncResult>('/api/integrations/ticktick/sync', config);
            return response.data;
        } catch (error) {
            console.error('Error syncing TickTick tasks:', error);

            if (axios.isAxiosError(error)) {
                const axiosError = error as AxiosError<{ message: string }>;
                if (axiosError.response?.data?.message) {
                    throw new Error(axiosError.response.data.message);
                }
            }

            throw new Error('Failed to synchronize tasks with TickTick');
        }
    },

    /**
     * Get sync status and statistics
     */
    async getTickTickSyncStatus(projectId?: string): Promise<{
        lastSynced: string | null;
        taskCount: { local: number; tickTick: number; mapped: number };
    }> {
        try {
            // Construct endpoint with projectId if provided
            const endpoint = projectId
                ? `/api/integrations/ticktick/sync/status?projectId=${projectId}`
                : '/api/integrations/ticktick/sync/status';

            const response = await api.get<{
                lastSynced: string | null;
                taskCount: { local: number; tickTick: number; mapped: number };
            }>(endpoint);

            return response.data;
        } catch (error) {
            console.error('Error getting TickTick sync status:', error);
            throw error;
        }
    },

    /**
     * Get all task mappings between local and TickTick tasks
     */
    async getTaskMappings(): Promise<Array<{
        localTaskId: string;
        tickTickTaskId: string;
        lastSynced: string;
    }>> {
        try {
            const response = await api.get<Array<{
                localTaskId: string;
                tickTickTaskId: string;
                lastSynced: string;
            }>>('/api/integrations/ticktick/task-mappings');

            return response.data;
        } catch (error) {
            console.error('Error getting task mappings:', error);
            throw error;
        }
    },

    /**
     * Reset all sync data
     */
    async resetSyncData(): Promise<boolean> {
        try {
            await api.post('/api/integrations/ticktick/sync/reset');
            return true;
        } catch (error) {
            console.error('Error resetting sync data:', error);
            throw error;
        }
    },

    // Helper method to get a task's title - preserved for utility purposes
    async getTaskTitle(projectId: string, taskId: string): Promise<string> {
        try {
            const task = await this.getTickTickTask(projectId, taskId);
            return task.title;
        } catch (error) {
            console.error(`Error getting TickTick task title:`, error);
            return 'Unknown Task';
        }
    }
}; 