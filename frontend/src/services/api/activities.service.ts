import api from './api';

export interface Activity {
    id: string;
    timestamp: string;
    actionType: string;
    itemType: string;
    itemId: string;
    itemTitle: string;
    description: string;
    metadata?: Record<string, unknown>;
}

export const activityService = {
    getActivities: () => api.get<Activity[]>('/api/activities'),
    createActivity: (activityData: Omit<Activity, 'id' | 'timestamp'>) =>
        api.post<Activity>('/api/activities', activityData),
}; 