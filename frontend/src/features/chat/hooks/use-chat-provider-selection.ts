import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAIHealth } from '../../ai/hooks/use-ai-health';
import { useSettingsStore } from '../../../store/settings-store';
import { useAuthStore } from '../../../store/auth-store';
import { getDefaultModelForProvider } from '../../../utils/default-models';

export interface ProviderInfo {
  provider: string;
  isHealthy: boolean;
  availableModels: string[];
}

export interface ProviderSelectionState {
  selectedProvider: string;
  selectedModel: string;
  availableProviders: ProviderInfo[];
  availableModels: string[];
  isHealthLoading: boolean;
}

export interface ProviderSelectionActions {
  handleProviderChange: (provider: string) => void;
  handleModelChange: (model: string) => void;
  setProviderAndModel: (provider: string, model: string) => void;
}

/**
 * Manages provider and model selection with persistence to settings store.
 */
export function useChatProviderSelection(): ProviderSelectionState & ProviderSelectionActions {
  const { data: healthData, isLoading: isHealthLoading } = useAIHealth();
  const {
    chatProvider: savedChatProvider,
    chatModel: savedChatModel,
    setChatProvider,
    setChatModel,
    loadPreferencesFromBackend,
    syncPreferencesToBackend,
  } = useSettingsStore();
  const user = useAuthStore((state) => state.user);

  const [selectedProvider, setSelectedProvider] = useState<string>(savedChatProvider || '');
  const [selectedModel, setSelectedModel] = useState<string>(savedChatModel || '');

  // Load preferences from backend on mount
  useEffect(() => {
    if (user?.userId) {
      loadPreferencesFromBackend(user.userId);
    }
  }, [user?.userId, loadPreferencesFromBackend]);

  // Sync selected provider/model with settings store
  useEffect(() => {
    if (savedChatProvider && savedChatProvider !== selectedProvider) {
      setSelectedProvider(savedChatProvider);
    }
  }, [savedChatProvider]);

  useEffect(() => {
    if (savedChatModel && savedChatModel !== selectedModel) {
      setSelectedModel(savedChatModel);
    }
  }, [savedChatModel]);

  // Get available providers from health data
  const availableProviders = useMemo(() => (
    Array.isArray(healthData?.providers)
      ? healthData.providers
          .filter((p) => p && p.isHealthy)
          .map((p) => ({
            ...p,
            provider: typeof p.provider === 'string' ? p.provider : String(p.provider || ''),
            availableModels: Array.isArray(p.availableModels)
              ? p.availableModels.filter((m): m is string => typeof m === 'string')
              : [],
          }))
      : []
  ), [healthData?.providers]);

  // Get available models for selected provider
  const availableModels = useMemo(() =>
    availableProviders.find((p) => p.provider === selectedProvider)?.availableModels || [],
    [availableProviders, selectedProvider]
  );

  // Auto-select first provider and preferred default model (only if no saved preferences)
  useEffect(() => {
    if (availableProviders.length > 0 && !selectedProvider) {
      const firstProvider = availableProviders[0];
      const newProvider = firstProvider.provider;
      const availableModels = firstProvider.availableModels || [];
      const newModel = getDefaultModelForProvider(newProvider, availableModels);

      setSelectedProvider(newProvider);
      setSelectedModel(newModel);

      // Save to settings store (local only, no backend sync for auto-init)
      setChatProvider(newProvider);
      setChatModel(newModel);
    }
  }, [availableProviders, selectedProvider, setChatProvider, setChatModel]);

  // Update model when provider changes
  useEffect(() => {
    if (availableModels.length > 0 && !availableModels.includes(selectedModel)) {
      // Use preferred default model for the provider, fallback to first available
      const newModel = getDefaultModelForProvider(selectedProvider, availableModels);
      setSelectedModel(newModel);

      // Save to settings store (local only, no backend sync for auto-correction)
      setChatModel(newModel);
    }
  }, [selectedProvider, availableModels, selectedModel, setChatModel]);

  // Handle provider change with persistence
  const handleProviderChange = useCallback((provider: string) => {
    setSelectedProvider(provider);
    setChatProvider(provider);

    // Sync to backend
    if (user?.userId) {
      syncPreferencesToBackend(user.userId).catch(console.error);
    }
  }, [user?.userId, setChatProvider, syncPreferencesToBackend]);

  // Handle model change with persistence
  const handleModelChange = useCallback((model: string) => {
    setSelectedModel(model);
    setChatModel(model);

    // Sync to backend
    if (user?.userId) {
      syncPreferencesToBackend(user.userId).catch(console.error);
    }
  }, [user?.userId, setChatModel, syncPreferencesToBackend]);

  // Set both provider and model (used when selecting a conversation)
  const setProviderAndModel = useCallback((provider: string, model: string) => {
    setSelectedProvider(provider);
    setSelectedModel(model);
  }, []);

  return {
    // State
    selectedProvider,
    selectedModel,
    availableProviders,
    availableModels,
    isHealthLoading,
    // Actions
    handleProviderChange,
    handleModelChange,
    setProviderAndModel,
  };
}

