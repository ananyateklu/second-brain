import { aiService } from '../../../services';
import { AIHealthResponse, AIProviderHealth } from '../../../types/ai';
import { useSettingsStore } from '../../../store/settings-store';
import { QUERY_KEYS } from '../../../lib/constants';
import { useApiQuery, useConditionalQuery } from '../../../hooks/use-api-query';

// Re-export query keys for backward compatibility
export const aiHealthKeys = QUERY_KEYS.aiHealth;

// Query: Get health status for all AI providers
export function useAIHealth() {
  const { ollamaRemoteUrl, useRemoteOllama } = useSettingsStore();

  return useApiQuery<AIHealthResponse>(
    QUERY_KEYS.aiHealth.health(ollamaRemoteUrl, useRemoteOllama),
    () => aiService.getHealth({
      ollamaBaseUrl: ollamaRemoteUrl,
      useRemoteOllama,
    }),
    {
      refetchInterval: 300000, // Refetch every 5 minutes
      staleTime: 240000, // Consider data stale after 4 minutes
      refetchOnMount: true, // Refetch on component mount (page reload)
      refetchOnWindowFocus: true, // Refetch when user returns to tab
    }
  );
}

// Query: Get health status for a specific provider
export function useProviderHealth(provider: string) {
  const { ollamaRemoteUrl, useRemoteOllama } = useSettingsStore();

  return useConditionalQuery<AIProviderHealth>(
    !!provider,
    QUERY_KEYS.aiHealth.provider(provider, ollamaRemoteUrl, useRemoteOllama),
    () => aiService.getProviderHealth(provider, {
      ollamaBaseUrl: ollamaRemoteUrl,
      useRemoteOllama,
    }),
    {
      refetchInterval: 300000, // Refetch every 5 minutes
      staleTime: 240000, // Consider data stale after 4 minutes
      refetchOnMount: true, // Refetch on component mount (page reload)
      refetchOnWindowFocus: true, // Refetch when user returns to tab
    }
  );
}

