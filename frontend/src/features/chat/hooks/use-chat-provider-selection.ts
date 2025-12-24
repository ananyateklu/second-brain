import { useEffect, useMemo, useCallback, useRef } from 'react';
import { useAIHealth } from '../../ai/hooks/use-ai-health';
import { useBoundStore } from '../../../store/bound-store';
import { getDefaultModelForProvider } from '../../../utils/default-models';
import type { AIModelInfo } from '../../../types/ai';

export interface ProviderInfo {
  provider: string;
  isHealthy: boolean;
  availableModels: string[];
  /** Detailed model information including context windows (from API) */
  models?: AIModelInfo[];
}

export interface ProviderSelectionState {
  selectedProvider: string;
  selectedModel: string;
  availableProviders: ProviderInfo[];
  availableModels: string[];
  isHealthLoading: boolean;
  /** Refresh providers by clearing cache and fetching fresh data */
  refreshProviders: () => Promise<void>;
  /** Whether providers are currently being refreshed */
  isRefreshing: boolean;
  /**
   * Context window for the currently selected model (from API health data).
   * Undefined if not available from API.
   */
  selectedModelContextWindow?: number;
}

export interface ProviderSelectionActions {
  handleProviderChange: (provider: string) => void;
  handleModelChange: (model: string) => void;
  setProviderAndModel: (provider: string, model: string) => void;
}

/**
 * Manages provider and model selection with persistence to settings store.
 * Uses Zustand store as single source of truth (no local state duplication).
 */
export function useChatProviderSelection(): ProviderSelectionState & ProviderSelectionActions {
  const { data: healthData, isLoading: isHealthLoading, isFetching, refreshProviders } = useAIHealth();

  // Read directly from Zustand store - this IS our state
  const selectedProvider = useBoundStore((state) => state.chatProvider) || '';
  const selectedModel = useBoundStore((state) => state.chatModel) || '';
  const setChatProvider = useBoundStore((state) => state.setChatProvider);
  const setChatModel = useBoundStore((state) => state.setChatModel);
  const loadPreferencesFromBackend = useBoundStore((state) => state.loadPreferencesFromBackend);
  const syncPreferencesToBackend = useBoundStore((state) => state.syncPreferencesToBackend);
  const user = useBoundStore((state) => state.user);

  // Load preferences from backend on mount
  useEffect(() => {
    if (user?.userId) {
      void loadPreferencesFromBackend(user.userId);
    }
  }, [user?.userId, loadPreferencesFromBackend]);

  // Get available providers from health data
  const availableProviders = useMemo((): ProviderInfo[] => (
    Array.isArray(healthData?.providers)
      ? healthData.providers
        .filter((p) => p?.isHealthy)
        .map((p) => ({
          provider: typeof p.provider === 'string' ? p.provider : String(p.provider || ''),
          isHealthy: p.isHealthy,
          availableModels: Array.isArray(p.availableModels)
            ? p.availableModels.filter((m): m is string => typeof m === 'string')
            : [],
          // Include detailed model info with context windows
          models: Array.isArray(p.models) ? p.models : undefined,
        }))
      : []
  ), [healthData]);

  // Get available models for selected provider
  const availableModels = useMemo(() =>
    availableProviders.find((p) => p.provider === selectedProvider)?.availableModels || [],
    [availableProviders, selectedProvider]
  );

  // Get context window for selected model from API health data
  const selectedModelContextWindow = useMemo(() => {
    const providerData = availableProviders.find((p) => p.provider === selectedProvider);
    if (!providerData?.models) return undefined;
    const modelInfo = providerData.models.find((m) => m.id === selectedModel);
    return modelInfo?.contextWindow;
  }, [availableProviders, selectedProvider, selectedModel]);

  // Auto-select first provider and preferred default model (only if no saved preferences)
  const hasAutoSelectedRef = useRef(false);
  useEffect(() => {
    if (availableProviders.length > 0 && !selectedProvider && !hasAutoSelectedRef.current) {
      hasAutoSelectedRef.current = true;
      const firstProvider = availableProviders[0];
      const newProvider = firstProvider.provider;
      const providerModels = firstProvider.availableModels || [];
      const newModel = getDefaultModelForProvider(newProvider, providerModels);

      // Update store directly (no backend sync for auto-init)
      setChatProvider(newProvider);
      setChatModel(newModel);
    }
  }, [availableProviders, selectedProvider, setChatProvider, setChatModel]);

  // Auto-correct model if it's invalid for the current provider
  // This handles: 1) provider change via dropdown, 2) invalid saved preferences
  // When loading a conversation via setProviderAndModel, the model will be valid, so no correction occurs
  useEffect(() => {
    // Only auto-correct when models are available and current model is invalid
    if (availableModels.length > 0 && selectedModel && !availableModels.includes(selectedModel)) {
      // Use preferred default model for the provider, fallback to first available
      const newModel = getDefaultModelForProvider(selectedProvider, availableModels);
      // Update store directly (no backend sync for auto-correction)
      setChatModel(newModel);
    }
  }, [selectedProvider, availableModels, selectedModel, setChatModel]);

  // Handle provider change with persistence
  const handleProviderChange = useCallback((provider: string) => {
    setChatProvider(provider);

    // Sync to backend
    if (user?.userId) {
      syncPreferencesToBackend(user.userId).catch(console.error);
    }
  }, [user, setChatProvider, syncPreferencesToBackend]);

  // Handle model change with persistence
  const handleModelChange = useCallback((model: string) => {
    setChatModel(model);

    // Sync to backend
    if (user?.userId) {
      syncPreferencesToBackend(user.userId).catch(console.error);
    }
  }, [user, setChatModel, syncPreferencesToBackend]);

  // Set both provider and model (used when selecting a conversation)
  const setProviderAndModel = useCallback((provider: string, model: string) => {
    // Update store directly
    // Don't sync to backend - this is just for displaying the conversation's model
    setChatProvider(provider);
    setChatModel(model);
  }, [setChatProvider, setChatModel]);

  return {
    // State (read from Zustand store)
    selectedProvider,
    selectedModel,
    availableProviders,
    availableModels,
    isHealthLoading,
    refreshProviders,
    isRefreshing: isFetching && !isHealthLoading, // Refreshing = fetching but not initial load
    // Context window from API (for accurate context tracking)
    selectedModelContextWindow,
    // Actions (update Zustand store directly)
    handleProviderChange,
    handleModelChange,
    setProviderAndModel,
  };
}
