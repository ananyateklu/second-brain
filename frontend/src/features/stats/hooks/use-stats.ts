import { useQuery } from '@tanstack/react-query';
import { statsService } from '../../../services';
import { QUERY_KEYS } from '../../../lib/constants';

// Re-export query keys for backward compatibility
export const statsKeys = QUERY_KEYS.stats;

// Query: Get AI Usage Stats
export function useAIStats() {
    return useQuery({
        queryKey: QUERY_KEYS.stats.ai(),
        queryFn: statsService.getAIStats,
    });
}

