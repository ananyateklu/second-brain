import { statsService } from '../../../services';
import { AIUsageStats } from '../../../types/stats';
import { statsKeys } from '../../../lib/query-keys';
import { useApiQuery } from '../../../hooks/use-api-query';

// Re-export query keys for backward compatibility
export { statsKeys };

// Query: Get AI Usage Stats
export function useAIStats() {
    return useApiQuery<AIUsageStats>(
        statsKeys.ai(),
        () => statsService.getAIStats()
    );
}

