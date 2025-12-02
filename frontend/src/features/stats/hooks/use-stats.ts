import { statsService } from '../../../services';
import { AIUsageStats } from '../../../types/stats';
import { QUERY_KEYS } from '../../../lib/constants';
import { useApiQuery } from '../../../hooks/use-api-query';

// Re-export query keys for backward compatibility
export const statsKeys = QUERY_KEYS.stats;

// Query: Get AI Usage Stats
export function useAIStats() {
    return useApiQuery<AIUsageStats>(
        QUERY_KEYS.stats.ai(),
        statsService.getAIStats
    );
}

