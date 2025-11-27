import { useQuery } from '@tanstack/react-query';
import { aiApi } from '../api/ai-api';
import { AIHealthResponse } from '../types/ai-health';
import { useSettingsStore } from '../../../store/settings-store';

// Query keys - include ollama settings in key to refetch when they change
export const aiHealthKeys = {
  all: (ollamaBaseUrl?: string | null, useRemoteOllama?: boolean) => 
    ['ai', 'health', { ollamaBaseUrl, useRemoteOllama }] as const,
  provider: (provider: string, ollamaBaseUrl?: string | null, useRemoteOllama?: boolean) => 
    ['ai', 'health', provider, { ollamaBaseUrl, useRemoteOllama }] as const,
};

// Query: Get health status for all AI providers
export function useAIHealth() {
  const { ollamaRemoteUrl, useRemoteOllama } = useSettingsStore();
  
  return useQuery<AIHealthResponse>({
    queryKey: aiHealthKeys.all(ollamaRemoteUrl, useRemoteOllama),
    queryFn: () => aiApi.getHealth({
      ollamaBaseUrl: ollamaRemoteUrl,
      useRemoteOllama,
    }),
    refetchInterval: 300000, // Refetch every 5 minutes
    staleTime: 240000, // Consider data stale after 4 minutes
    refetchOnMount: true, // Refetch on component mount (page reload)
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });
}

// Query: Get health status for a specific provider
export function useProviderHealth(provider: string) {
  const { ollamaRemoteUrl, useRemoteOllama } = useSettingsStore();
  
  return useQuery({
    queryKey: aiHealthKeys.provider(provider, ollamaRemoteUrl, useRemoteOllama),
    queryFn: () => aiApi.getProviderHealth(provider, {
      ollamaBaseUrl: ollamaRemoteUrl,
      useRemoteOllama,
    }),
    enabled: !!provider,
    refetchInterval: 300000, // Refetch every 5 minutes
    staleTime: 240000, // Consider data stale after 4 minutes
    refetchOnMount: true, // Refetch on component mount (page reload)
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });
}

