import { statsService } from '../../../services';
import { AIUsageStats, ToolCallAnalytics, ToolActionStats, ToolErrorStats } from '../../../types/stats';
import { statsKeys, ToolAnalyticsFilters } from '../../../lib/query-keys';
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

// Query: Get Tool Call Analytics (PostgreSQL 18 JSON_TABLE)
export function useToolCallAnalytics(filters?: ToolAnalyticsFilters) {
    return useApiQuery<ToolCallAnalytics>(
        statsKeys.tools(filters),
        () => statsService.getToolCallAnalytics({
            daysBack: filters?.daysBack,
            startDate: filters?.startDate,
            endDate: filters?.endDate,
        })
    );
}

// Query: Get Tool Action Breakdown
export function useToolActionBreakdown(daysBack?: number, toolName?: string) {
    return useApiQuery<ToolActionStats[]>(
        statsKeys.toolActions({ daysBack, toolName }),
        () => statsService.getToolActionBreakdown(daysBack, toolName)
    );
}

// Query: Get Top Tool Errors
export function useTopToolErrors(topN?: number, daysBack?: number) {
    return useApiQuery<ToolErrorStats[]>(
        statsKeys.toolErrors(topN, daysBack),
        () => statsService.getTopToolErrors(topN, daysBack)
    );
}

