import { apiClient } from '../../../lib/api-client';
import { AIUsageStats } from '../types';

export const statsApi = {
    getAIStats: () => apiClient.get<AIUsageStats>('/stats/ai'),
};

