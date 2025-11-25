import { useQuery } from '@tanstack/react-query';
import { aiApi } from '../api/ai-api';
import { AIHealthResponse } from '../types/ai-health';

// Query keys
export const aiHealthKeys = {
  all: ['ai', 'health'] as const,
  provider: (provider: string) => ['ai', 'health', provider] as const,
};

// Query: Get health status for all AI providers
export function useAIHealth() {
  return useQuery<AIHealthResponse>({
    queryKey: aiHealthKeys.all,
    queryFn: aiApi.getHealth,
    refetchInterval: 300000, // Refetch every 5 minutes
    staleTime: 240000, // Consider data stale after 4 minutes
    refetchOnMount: true, // Refetch on component mount (page reload)
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });
}

// Query: Get health status for a specific provider
export function useProviderHealth(provider: string) {
  return useQuery({
    queryKey: aiHealthKeys.provider(provider),
    queryFn: () => aiApi.getProviderHealth(provider),
    enabled: !!provider,
    refetchInterval: 300000, // Refetch every 5 minutes
    staleTime: 240000, // Consider data stale after 4 minutes
    refetchOnMount: true, // Refetch on component mount (page reload)
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });
}

