import { useQuery } from '@tanstack/react-query';
import { statsApi } from '../api/stats-api';

// Query keys
export const statsKeys = {
    ai: ['stats', 'ai'] as const,
};

// Query: Get AI Usage Stats
export function useAIStats() {
    return useQuery({
        queryKey: statsKeys.ai,
        queryFn: statsApi.getAIStats,
    });
}

