import { api } from '../../services/api';

export interface UserPreference {
    id: string;
    preferenceType: string;
    value: string;
    createdAt: string;
    updatedAt: string;
}

export interface SavePreferenceRequest {
    preferenceType: string;
    value: string;
}

export interface UpdatePreferenceRequest {
    value: string;
}

const preferencesService = {
    getAllPreferences: async (): Promise<UserPreference[]> => {
        const response = await api.get('/api/preferences');
        return response.data;
    },

    getPreferenceByType: async (preferenceType: string): Promise<UserPreference> => {
        try {
            const response = await api.get(`/api/preferences/${preferenceType}`);
            return response.data;
        } catch (error: unknown) {
            if (typeof error === 'object' && error !== null && 'response' in error &&
                typeof error.response === 'object' && error.response !== null &&
                'status' in error.response && error.response.status === 404) {
                throw new Error(`Preference not found: ${preferenceType}`);
            }
            throw error;
        }
    },

    savePreference: async (request: SavePreferenceRequest): Promise<UserPreference> => {
        const response = await api.post('/api/preferences', request);
        return response.data;
    },

    updatePreference: async (preferenceType: string, request: UpdatePreferenceRequest): Promise<UserPreference> => {
        const response = await api.put(`/api/preferences/${preferenceType}`, request);
        return response.data;
    },

    deletePreference: async (preferenceType: string): Promise<void> => {
        await api.delete(`/api/preferences/${preferenceType}`);
    }
};

export default preferencesService; 