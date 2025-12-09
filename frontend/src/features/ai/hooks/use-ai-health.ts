import { useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { aiService } from '../../../services';
import { AIHealthResponse, AIProviderHealth } from '../../../types/ai';
import { useSettingsStore } from '../../../store/settings-store';
import { aiHealthKeys } from '../../../lib/query-keys';
import { useApiQuery, useConditionalQuery } from '../../../hooks/use-api-query';

// Re-export query keys for backward compatibility
export { aiHealthKeys };

// LocalStorage key for persisting AI health data
const AI_HEALTH_STORAGE_KEY = 'second-brain-ai-health-cache';
const AI_HEALTH_CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours

interface CachedHealthData {
  data: AIHealthResponse;
  timestamp: number;
  configKey: string; // To invalidate when Ollama settings change
}

// Get cached health data from localStorage
function getCachedHealthData(configKey: string): AIHealthResponse | null {
  try {
    const cached = localStorage.getItem(AI_HEALTH_STORAGE_KEY);
    if (!cached) return null;

    const parsed: CachedHealthData = JSON.parse(cached);

    // Check if cache is still valid (within 24 hours) and config hasn't changed
    const isExpired = Date.now() - parsed.timestamp > AI_HEALTH_CACHE_DURATION;
    const configChanged = parsed.configKey !== configKey;

    if (isExpired || configChanged) {
      localStorage.removeItem(AI_HEALTH_STORAGE_KEY);
      return null;
    }

    return parsed.data;
  } catch {
    localStorage.removeItem(AI_HEALTH_STORAGE_KEY);
    return null;
  }
}

// Save health data to localStorage
function setCachedHealthData(data: AIHealthResponse, configKey: string): void {
  try {
    const cacheEntry: CachedHealthData = {
      data,
      timestamp: Date.now(),
      configKey,
    };
    localStorage.setItem(AI_HEALTH_STORAGE_KEY, JSON.stringify(cacheEntry));
  } catch {
    // Ignore storage errors (e.g., quota exceeded)
  }
}

// Clear cached health data from localStorage
function clearCachedHealthData(): void {
  localStorage.removeItem(AI_HEALTH_STORAGE_KEY);
}

// Query: Get health status for all AI providers
// Uses aggressive caching with localStorage persistence - survives page reloads
// Only refetches when clicking the refresh button
export function useAIHealth() {
  const { ollamaRemoteUrl, useRemoteOllama } = useSettingsStore();
  const queryClient = useQueryClient();
  const queryKey = aiHealthKeys.health({ ollamaBaseUrl: ollamaRemoteUrl, useRemoteOllama });

  // Create a config key to invalidate cache when Ollama settings change
  const configKey = `${ollamaRemoteUrl || 'default'}-${useRemoteOllama}`;

  // Get initial data from localStorage cache
  const initialData = getCachedHealthData(configKey);

  const query = useApiQuery<AIHealthResponse>(
    queryKey,
    () => aiService.getHealth({
      ollamaBaseUrl: ollamaRemoteUrl,
      useRemoteOllama,
    }),
    {
      // Data is never stale - only manual refresh triggers refetch
      staleTime: Infinity,
      // Keep in cache for 24 hours
      gcTime: 1000 * 60 * 60 * 24,
      // No automatic background refetches - only manual refresh
      refetchInterval: false,
      // Don't refetch on mount if we have cached data from localStorage
      refetchOnMount: initialData === null,
      // Don't refetch on window focus
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect
      refetchOnReconnect: false,
      // Use localStorage cached data as initial data (survives page reloads)
      initialData: initialData ?? undefined,
    }
  );

  // Persist successful fetches to localStorage
  useEffect(() => {
    if (query.data && query.isSuccess && !query.isPlaceholderData) {
      setCachedHealthData(query.data, configKey);
    }
  }, [query.data, query.isSuccess, query.isPlaceholderData, configKey]);

  // Manual refresh function that clears all caches and forces a fresh fetch
  const refreshProviders = useCallback(async () => {
    // Clear localStorage cache
    clearCachedHealthData();
    // Remove from TanStack Query cache
    queryClient.removeQueries({ queryKey });
    // Refetch with fresh data
    await query.refetch();
  }, [queryClient, queryKey, query]);

  return {
    ...query,
    refreshProviders,
  };
}

// Query: Get health status for a specific provider
// Uses same caching strategy as useAIHealth - relies on that hook's localStorage cache
export function useProviderHealth(provider: string) {
  const { ollamaRemoteUrl, useRemoteOllama } = useSettingsStore();

  return useConditionalQuery<AIProviderHealth>(
    !!provider,
    aiHealthKeys.provider(provider, { ollamaBaseUrl: ollamaRemoteUrl, useRemoteOllama }),
    () => aiService.getProviderHealth(provider, {
      ollamaBaseUrl: ollamaRemoteUrl,
      useRemoteOllama,
    }),
    {
      // Data is never stale - only manual refresh triggers refetch
      staleTime: Infinity,
      // Keep in cache for 24 hours
      gcTime: 1000 * 60 * 60 * 24,
      // No automatic background refetches
      refetchInterval: false,
      // Refetch on mount only once (first time)
      refetchOnMount: true,
      // Don't refetch on window focus
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect
      refetchOnReconnect: false,
    }
  );
}

