import { useState, useMemo, useRef, useCallback } from 'react';
import { useStartIndexing, useEmbeddingProviders } from '../../features/rag/hooks/use-indexing';
import { useBoundStore } from '../../store/bound-store';
import { toast } from '../../hooks/use-toast';
import type { EmbeddingProvider, VectorStoreProvider, EmbeddingModelInfo } from '../../types/rag';

interface IndexingButtonProps {
  userId?: string;
}

// Pinecone requires exactly 1536 dimensions
const PINECONE_REQUIRED_DIMENSIONS = 1536;

export function IndexingButton({ userId = 'default-user' }: IndexingButtonProps) {
  // Global indexing state from store - supports multiple jobs
  const {
    activeJobs,
    isRestoring,
    startIndexingJob,
    // Saved embedding preferences
    ragEmbeddingProvider,
    ragEmbeddingModel,
    ragEmbeddingDimensions,
    setRagEmbeddingProvider,
    setRagEmbeddingModel,
    setRagEmbeddingDimensions,
  } = useBoundStore();

  const startIndexing = useStartIndexing();
  const { data: providers, isLoading: isLoadingProviders } = useEmbeddingProviders();

  const [vectorStore, setVectorStore] = useState<string>('PostgreSQL');
  // Track user overrides - null means use saved preference
  const [providerOverride, setProviderOverride] = useState<string | null>(null);
  const [modelOverride, setModelOverride] = useState<string | null>(null);
  const [dimensionsOverride, setDimensionsOverride] = useState<number | null>(null);

  // Compute effective values from saved preferences or user overrides
  const selectedProvider = useMemo(() => {
    if (providerOverride !== null) return providerOverride;
    if (!providers || providers.length === 0) return 'OpenAI';
    if (ragEmbeddingProvider) {
      const savedProvider = providers.find(p => p.name === ragEmbeddingProvider && p.isEnabled);
      if (savedProvider) return ragEmbeddingProvider;
    }
    return 'OpenAI';
  }, [providerOverride, providers, ragEmbeddingProvider]);

  const selectedModel = useMemo(() => {
    if (modelOverride !== null) return modelOverride;
    if (!providers || providers.length === 0) return '';
    if (ragEmbeddingProvider && ragEmbeddingModel) {
      const savedProvider = providers.find(p => p.name === ragEmbeddingProvider && p.isEnabled);
      if (savedProvider) {
        const savedModel = savedProvider.availableModels.find(m => m.modelId === ragEmbeddingModel);
        if (savedModel) return ragEmbeddingModel;
      }
    }
    return '';
  }, [modelOverride, providers, ragEmbeddingProvider, ragEmbeddingModel]);

  const customDimensions = useMemo(() => {
    if (dimensionsOverride !== null) return dimensionsOverride;
    if (!providers || providers.length === 0) return null;
    if (ragEmbeddingProvider && ragEmbeddingModel && ragEmbeddingDimensions !== null) {
      const savedProvider = providers.find(p => p.name === ragEmbeddingProvider && p.isEnabled);
      if (savedProvider) {
        const savedModel = savedProvider.availableModels.find(m => m.modelId === ragEmbeddingModel);
        if (savedModel?.supportsCustomDimensions) return ragEmbeddingDimensions;
      }
    }
    return null;
  }, [dimensionsOverride, providers, ragEmbeddingProvider, ragEmbeddingModel, ragEmbeddingDimensions]);

  // Wrapper functions to update state via overrides
  const setSelectedProvider = useCallback((value: string) => setProviderOverride(value), []);
  const setSelectedModel = useCallback((value: string) => setModelOverride(value), []);
  const setCustomDimensions = useCallback((value: number | null) => setDimensionsOverride(value), []);

  // Track when provider was last changed by user interaction
  const lastProviderChangeRef = useRef<string>('');

  // Get current provider info from API data
  const currentProviderData = useMemo(() => {
    if (!providers) return null;
    return providers.find(p => p.name === selectedProvider);
  }, [providers, selectedProvider]);

  // Get available models for current provider
  const availableModels = useMemo(() => {
    return currentProviderData?.availableModels ?? [];
  }, [currentProviderData]);

  // Compute the effective selected model - auto-select default if needed
  const effectiveSelectedModel = useMemo(() => {
    // If user selected a model and it's valid, use it
    if (selectedModel && availableModels.some(m => m.modelId === selectedModel)) {
      return selectedModel;
    }
    // Otherwise, select the default model
    if (availableModels.length > 0) {
      const defaultModel = availableModels.find(m => m.isDefault) ?? availableModels[0];
      return defaultModel.modelId;
    }
    return '';
  }, [selectedModel, availableModels]);

  // Get current selected model info
  const currentModelInfo = useMemo(() => {
    if (!effectiveSelectedModel || !availableModels.length) return null;
    const found = availableModels.find(m => m.modelId === effectiveSelectedModel);
    return found ?? null;
  }, [effectiveSelectedModel, availableModels]);

  // Compute the effective provider - handle initial load
  const effectiveProvider = useMemo(() => {
    if (providers && providers.length > 0) {
      // If selected provider exists and is enabled, use it
      if (providers.some(p => p.name === selectedProvider && p.isEnabled)) {
        return selectedProvider;
      }
      // Otherwise, default to OpenAI or first available
      const openAI = providers.find(p => p.name === 'OpenAI' && p.isEnabled);
      if (openAI) return 'OpenAI';
      const firstEnabled = providers.find(p => p.isEnabled);
      if (firstEnabled) return firstEnabled.name;
    }
    return selectedProvider;
  }, [providers, selectedProvider]);

  // Sync selectedModel when provider changes (in event handler, not effect)
  const syncModelForProvider = useCallback((_providerName: string, models: EmbeddingModelInfo[]) => {
    if (models.length > 0) {
      const defaultModel = models.find(m => m.isDefault) ?? models[0];
      setSelectedModel(defaultModel.modelId);
    }
  }, [setSelectedModel]);

  // Get effective dimensions (custom or default from model)
  const effectiveDimensions = useMemo(() => {
    if (currentModelInfo?.supportsCustomDimensions && customDimensions !== null) {
      return customDimensions;
    }
    return currentModelInfo?.dimensions ?? 0;
  }, [currentModelInfo, customDimensions]);

  // Check if current model is compatible with Pinecone (considering custom dimensions)
  const isPineconeCompatible = useMemo(() => {
    if (!currentModelInfo) return false;
    // If model supports custom dimensions and user selected 1536, it's compatible
    if (currentModelInfo.supportsCustomDimensions && customDimensions === PINECONE_REQUIRED_DIMENSIONS) {
      return true;
    }
    return currentModelInfo.supportsPinecone;
  }, [currentModelInfo, customDimensions]);

  const needsPinecone = vectorStore === 'Pinecone' || vectorStore === 'Both';

  // Handle provider change with auto-switch logic (in event handler, not effect)
  const handleProviderChange = (newProvider: string) => {
    const newProviderData = providers?.find(p => p.name === newProvider);
    if (!newProviderData) return;

    setSelectedProvider(newProvider);
    lastProviderChangeRef.current = newProvider;

    // Reset dimensions override when provider changes
    setCustomDimensions(null);

    // Sync model selection for the new provider
    syncModelForProvider(newProvider, newProviderData.availableModels);

    // Get default model for this provider
    const defaultModel = newProviderData.availableModels.find(m => m.isDefault) ?? newProviderData.availableModels[0];

    // Save provider preference to store (will sync to backend)
    void setRagEmbeddingProvider(newProvider);
    // Save the default model for this provider
    if (defaultModel) {
      void setRagEmbeddingModel(defaultModel.modelId);
      // Reset dimensions when provider changes
      void setRagEmbeddingDimensions(null);
    }

    // Auto-switch to PostgreSQL when selecting a non-Pinecone-compatible model
    if (needsPinecone && defaultModel && !defaultModel.supportsPinecone) {
      setVectorStore('PostgreSQL');
      toast.info(
        'Vector Store Changed',
        `${defaultModel.displayName} (${defaultModel.dimensions} dims) is not compatible with Pinecone. Switched to PostgreSQL.`
      );
    }
  };

  // Handle model change with auto-switch logic
  const handleModelChange = (modelId: string) => {
    const model = availableModels.find(m => m.modelId === modelId);
    if (!model) return;

    setSelectedModel(modelId);
    // Reset custom dimensions when model changes
    setCustomDimensions(null);

    // Save model preference to store (will sync to backend)
    void setRagEmbeddingModel(modelId);
    // Reset dimensions when model changes
    void setRagEmbeddingDimensions(null);

    // Auto-switch to PostgreSQL when selecting a non-Pinecone-compatible model
    if (needsPinecone && !model.supportsPinecone) {
      setVectorStore('PostgreSQL');
      toast.info(
        'Vector Store Changed',
        `${model.displayName} (${model.dimensions} dims) is not compatible with Pinecone. Switched to PostgreSQL.`
      );
    }
  };

  // Handle custom dimension change
  const handleDimensionChange = (dims: number) => {
    setCustomDimensions(dims);

    // Save dimensions preference to store (will sync to backend)
    void setRagEmbeddingDimensions(dims);

    // Auto-switch vector store if dimensions affect Pinecone compatibility
    if (needsPinecone && dims !== PINECONE_REQUIRED_DIMENSIONS) {
      setVectorStore('PostgreSQL');
      toast.info(
        'Vector Store Changed',
        `${dims} dimensions is not compatible with Pinecone (requires ${PINECONE_REQUIRED_DIMENSIONS}). Switched to PostgreSQL.`
      );
    }
  };

  // Check if the selected vector store(s) are already being indexed
  const getActiveVectorStores = () => {
    return Object.values(activeJobs)
      .filter((job) => job.status?.status === 'running' || job.status?.status === 'pending')
      .map((job) => job.vectorStore);
  };

  const activeVectorStores = getActiveVectorStores();

  // Disable if selected store is already indexing
  const isSelectedStoreIndexing = vectorStore === 'Both'
    ? activeVectorStores.includes('PostgreSQL') || activeVectorStores.includes('Pinecone')
    : activeVectorStores.includes(vectorStore);

  const isDisabled = isSelectedStoreIndexing || startIndexing.isPending || isRestoring || isLoadingProviders;

  // Check if vector store option should be disabled based on current embedding model
  const isVectorStoreDisabled = (store: string) => {
    if (isDisabled) return true;
    if ((store === 'Pinecone' || store === 'Both') && !isPineconeCompatible) return true;
    return false;
  };

  const handleStartIndexing = async () => {
    // Safety check: Ensure model is compatible with selected vector store
    if (needsPinecone && !isPineconeCompatible) {
      toast.error(
        'Incompatible Selection',
        `${currentModelInfo?.displayName ?? effectiveSelectedModel} (${effectiveDimensions} dims) cannot be used with Pinecone. Please select PostgreSQL or choose a ${PINECONE_REQUIRED_DIMENSIONS}-dimension model.`
      );
      setVectorStore('PostgreSQL');
      return;
    }

    // Only pass custom dimensions if the model supports it and user has set a value
    const dimsToSend = currentModelInfo?.supportsCustomDimensions && customDimensions !== null
      ? customDimensions
      : undefined;

    try {
      if (vectorStore === 'Both') {
        // Start two separate jobs for PostgreSQL and Pinecone
        const stores = ['PostgreSQL', 'Pinecone'] as const;

        // Start both jobs in parallel
        const results = await Promise.allSettled(
          stores.map(async (store) => {
            const job = await startIndexing.mutateAsync({
              userId,
              embeddingProvider: effectiveProvider as EmbeddingProvider,
              vectorStoreProvider: store as VectorStoreProvider,
              embeddingModel: effectiveSelectedModel,
              customDimensions: dimsToSend,
            });
            // Start tracking each job separately in global store
            startIndexingJob(job, store, effectiveProvider as EmbeddingProvider, userId);
            return { store, job };
          })
        );

        // Check for any failures
        const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
        if (failures.length > 0) {
          const failedStores = failures.length === 2 ? 'both stores' : 'one store';
          toast.error('Partial Failure', `Failed to start indexing for ${failedStores}`);
        }
      } else {
        // Single store indexing
        const job = await startIndexing.mutateAsync({
          userId,
          embeddingProvider: effectiveProvider as EmbeddingProvider,
          vectorStoreProvider: vectorStore as VectorStoreProvider,
          embeddingModel: effectiveSelectedModel,
          customDimensions: dimsToSend,
        });

        // Start tracking in global store (this will show the notification)
        startIndexingJob(job, vectorStore, effectiveProvider as EmbeddingProvider, userId);
      }
    } catch (error) {
      toast.error(
        'Error',
        error instanceof Error ? error.message : 'Failed to start indexing'
      );
    }
  };

  // Loading state while fetching providers
  if (isLoadingProviders) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
          <div className="flex gap-2">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
          </div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
          <div className="flex gap-2">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-6 items-start">
          {/* Vector Store Selection */}
          <div className="flex-1 min-w-[200px]">
            <label
              className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-1.5 block"
              style={{ color: isDisabled ? 'var(--text-muted)' : 'var(--text-secondary)' }}
            >
              Vector Store
            </label>
            <div className="flex flex-wrap gap-2">
              {['PostgreSQL', 'Pinecone', 'Both'].map((store) => {
                const isActive = vectorStore === store;
                const storeDisabled = isVectorStoreDisabled(store);
                const showPineconeWarning = (store === 'Pinecone' || store === 'Both') && !isPineconeCompatible;

                return (
                  <div key={store} className="relative">
                    <button
                      type="button"
                      onClick={() => { if (!storeDisabled) setVectorStore(store); }}
                      disabled={storeDisabled}
                      title={showPineconeWarning ? `${currentModelInfo?.displayName ?? effectiveSelectedModel} (${currentModelInfo?.dimensions ?? '?'} dims) doesn't support Pinecone (requires ${PINECONE_REQUIRED_DIMENSIONS} dimensions)` : undefined}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-brand-500)] disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: isActive ? 'var(--color-brand-600)' : showPineconeWarning ? 'var(--surface-base)' : 'var(--surface-elevated)',
                        borderColor: isActive ? 'var(--color-brand-600)' : showPineconeWarning ? 'var(--border)' : 'var(--border)',
                        color: isActive ? 'var(--color-brand-50)' : showPineconeWarning ? 'var(--text-muted)' : 'var(--text-primary)',
                        boxShadow: isActive && !storeDisabled
                          ? '0 10px 22px color-mix(in srgb, var(--color-brand-900) 30%, transparent)'
                          : '0 1px 3px color-mix(in srgb, var(--color-brand-950) 12%, transparent)',
                        transform: isActive && !storeDisabled ? 'translateY(-1px)' : 'translateY(0)',
                        opacity: storeDisabled ? 0.5 : 1,
                        textDecoration: showPineconeWarning ? 'line-through' : 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive && !storeDisabled) {
                          e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-brand-600) 12%, var(--surface-elevated))';
                          e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--color-brand-600) 60%, var(--border))';
                          e.currentTarget.style.boxShadow = '0 4px 12px color-mix(in srgb, var(--color-brand-900) 18%, transparent)';
                          e.currentTarget.style.transform = 'translateY(-0.5px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive && !storeDisabled) {
                          e.currentTarget.style.backgroundColor = 'var(--surface-elevated)';
                          e.currentTarget.style.borderColor = 'var(--border)';
                          e.currentTarget.style.boxShadow = '0 1px 3px color-mix(in srgb, var(--color-brand-950) 12%, transparent)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }
                      }}
                    >
                      <span className="flex items-center gap-1.5">
                        {showPineconeWarning && (
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6V4a1 1 0 00-1-1h-2a1 1 0 00-1 1v5m4 0h-4" />
                          </svg>
                        )}
                        {store}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Embedding Provider Selection */}
          <div className="flex-1 min-w-[200px]">
            <label
              className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-1.5 block"
              style={{ color: isDisabled ? 'var(--text-muted)' : 'var(--text-secondary)' }}
            >
              Embedding Provider
            </label>
            <div className="flex flex-wrap gap-2">
              {providers?.filter(p => p.isEnabled).map((provider) => {
                const isActive = effectiveProvider === provider.name;
                // Check if this provider has any Pinecone-compatible models
                const hasCompatibleModels = provider.availableModels.some(m => m.supportsPinecone);

                return (
                  <button
                    type="button"
                    key={provider.name}
                    onClick={() => { if (!isDisabled) handleProviderChange(provider.name); }}
                    disabled={isDisabled}
                    title={`${provider.name}: ${provider.availableModels.length} model(s) available`}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-brand-500)] disabled:cursor-not-allowed disabled:opacity-60"
                    style={{
                      backgroundColor: isActive ? 'var(--color-brand-600)' : 'var(--surface-elevated)',
                      borderColor: isActive ? 'var(--color-brand-600)' : 'var(--border)',
                      color: isActive ? 'var(--color-brand-50)' : 'var(--text-primary)',
                      boxShadow: isActive && !isDisabled
                        ? '0 10px 22px color-mix(in srgb, var(--color-brand-900) 30%, transparent)'
                        : '0 1px 3px color-mix(in srgb, var(--color-brand-950) 12%, transparent)',
                      transform: isActive && !isDisabled ? 'translateY(-1px)' : 'translateY(0)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive && !isDisabled) {
                        e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-brand-600) 12%, var(--surface-elevated))';
                        e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--color-brand-600) 60%, var(--border))';
                        e.currentTarget.style.boxShadow = '0 4px 12px color-mix(in srgb, var(--color-brand-900) 18%, transparent)';
                        e.currentTarget.style.transform = 'translateY(-0.5px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive && !isDisabled) {
                        e.currentTarget.style.backgroundColor = 'var(--surface-elevated)';
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.boxShadow = '0 1px 3px color-mix(in srgb, var(--color-brand-950) 12%, transparent)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    <span className="flex items-center gap-1.5">
                      {provider.name}
                      {hasCompatibleModels ? (
                        <span
                          className="text-[9px] px-1 py-0.5 rounded-lg"
                          style={{
                            backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'color-mix(in srgb, var(--color-success) 15%, transparent)',
                            color: isActive ? 'var(--color-brand-50)' : 'var(--color-success)',
                          }}
                          title="Has Pinecone-compatible models"
                        >
                          P+PG
                        </span>
                      ) : (
                        <span
                          className="text-[9px] px-1 py-0.5 rounded-lg"
                          style={{
                            backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'color-mix(in srgb, var(--text-warning) 15%, transparent)',
                            color: isActive ? 'var(--color-brand-50)' : 'var(--text-warning)',
                          }}
                          title="PostgreSQL only"
                        >
                          PG
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Model Selection */}
        {availableModels.length > 0 && (
          <div>
            <label
              className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-1.5 block"
              style={{ color: isDisabled ? 'var(--text-muted)' : 'var(--text-secondary)' }}
            >
              Embedding Model
            </label>
            <div className="flex flex-wrap gap-2">
              {availableModels.map((model) => {
                const isActive = effectiveSelectedModel === model.modelId;
                const modelDisabled = isDisabled || (needsPinecone && !model.supportsPinecone);

                return (
                  <button
                    type="button"
                    key={model.modelId}
                    onClick={() => { if (!modelDisabled) handleModelChange(model.modelId); }}
                    disabled={modelDisabled}
                    title={model.description || `${model.displayName}: ${model.dimensions} dimensions`}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-brand-500)] disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: isActive ? 'var(--color-brand-600)' : 'var(--surface-elevated)',
                      borderColor: isActive ? 'var(--color-brand-600)' : 'var(--border)',
                      color: isActive ? 'var(--color-brand-50)' : 'var(--text-primary)',
                      boxShadow: isActive && !modelDisabled
                        ? '0 10px 22px color-mix(in srgb, var(--color-brand-900) 30%, transparent)'
                        : '0 1px 3px color-mix(in srgb, var(--color-brand-950) 12%, transparent)',
                      transform: isActive && !modelDisabled ? 'translateY(-1px)' : 'translateY(0)',
                      opacity: modelDisabled && !isDisabled ? 0.5 : modelDisabled ? 0.6 : 1,
                      textDecoration: needsPinecone && !model.supportsPinecone ? 'line-through' : 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive && !modelDisabled) {
                        e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-brand-600) 12%, var(--surface-elevated))';
                        e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--color-brand-600) 60%, var(--border))';
                        e.currentTarget.style.boxShadow = '0 4px 12px color-mix(in srgb, var(--color-brand-900) 18%, transparent)';
                        e.currentTarget.style.transform = 'translateY(-0.5px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive && !modelDisabled) {
                        e.currentTarget.style.backgroundColor = 'var(--surface-elevated)';
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.boxShadow = '0 1px 3px color-mix(in srgb, var(--color-brand-950) 12%, transparent)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="truncate max-w-[120px]">{model.displayName}</span>
                      <span
                        className="text-[10px] opacity-70 shrink-0"
                        style={{ fontWeight: 400 }}
                      >
                        {model.dimensions}d
                      </span>
                      {model.supportsPinecone ? (
                        <span
                          className="text-[9px] px-1 py-0.5 rounded shrink-0"
                          style={{
                            backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'color-mix(in srgb, var(--color-success) 15%, transparent)',
                            color: isActive ? 'var(--color-brand-50)' : 'var(--color-success)',
                          }}
                          title="Pinecone compatible"
                        >
                          P
                        </span>
                      ) : (
                        <span
                          className="text-[9px] px-1 py-0.5 rounded shrink-0"
                          style={{
                            backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'color-mix(in srgb, var(--text-warning) 15%, transparent)',
                            color: isActive ? 'var(--color-brand-50)' : 'var(--text-warning)',
                          }}
                          title="PostgreSQL only"
                        >
                          PG
                        </span>
                      )}
                      {model.isDefault && (
                        <span
                          className="text-[9px] px-1 py-0.5 rounded shrink-0"
                          style={{
                            backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'color-mix(in srgb, var(--color-brand-500) 15%, transparent)',
                            color: isActive ? 'var(--color-brand-50)' : 'var(--color-brand-500)',
                          }}
                        >
                          ★
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            {/* Dimension compatibility hint */}
            {!isPineconeCompatible && currentModelInfo && (
              <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-warning, #f59e0b)' }}>
                {currentModelInfo.displayName} ({effectiveDimensions} dims) → PostgreSQL only
              </p>
            )}
          </div>
        )}

        {/* Custom Dimensions Slider - only for models that support it */}
        {currentModelInfo?.supportsCustomDimensions && currentModelInfo.minDimensions && currentModelInfo.maxDimensions && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <label
                className="text-[11px] font-semibold uppercase tracking-[0.2em]"
                style={{ color: isDisabled ? 'var(--text-muted)' : 'var(--text-secondary)' }}
              >
                Output Dimensions
              </label>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-mono px-2 py-0.5 rounded-lg"
                  style={{
                    backgroundColor: effectiveDimensions === PINECONE_REQUIRED_DIMENSIONS
                      ? 'color-mix(in srgb, var(--color-success) 15%, transparent)'
                      : 'var(--surface-elevated)',
                    color: effectiveDimensions === PINECONE_REQUIRED_DIMENSIONS
                      ? 'var(--color-success)'
                      : 'var(--text-primary)',
                    border: '1px solid',
                    borderColor: effectiveDimensions === PINECONE_REQUIRED_DIMENSIONS
                      ? 'var(--color-success)'
                      : 'var(--border)',
                  }}
                >
                  {effectiveDimensions}d
                </span>
                {effectiveDimensions === PINECONE_REQUIRED_DIMENSIONS && (
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded-lg"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--color-success) 15%, transparent)',
                      color: 'var(--color-success)',
                    }}
                  >
                    Pinecone OK
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] opacity-60" style={{ minWidth: '32px' }}>
                {currentModelInfo.minDimensions}
              </span>
              <input
                type="range"
                min={currentModelInfo.minDimensions}
                max={currentModelInfo.maxDimensions}
                step={256}
                value={customDimensions ?? currentModelInfo.dimensions}
                onChange={(e) => handleDimensionChange(parseInt(e.target.value, 10))}
                disabled={isDisabled}
                className="flex-1 h-2 rounded-full appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background: `linear-gradient(to right, var(--color-brand-500) 0%, var(--color-brand-500) ${((customDimensions ?? currentModelInfo.dimensions) - currentModelInfo.minDimensions) / (currentModelInfo.maxDimensions - currentModelInfo.minDimensions) * 100}%, var(--border) ${((customDimensions ?? currentModelInfo.dimensions) - currentModelInfo.minDimensions) / (currentModelInfo.maxDimensions - currentModelInfo.minDimensions) * 100}%, var(--border) 100%)`,
                }}
              />
              <span className="text-[10px] opacity-60" style={{ minWidth: '32px', textAlign: 'right' }}>
                {currentModelInfo.maxDimensions}
              </span>
            </div>
            <div className="relative h-6 mt-1">
              {/* Min - always at 0% */}
              <button
                type="button"
                onClick={() => handleDimensionChange(currentModelInfo.minDimensions ?? 0)}
                disabled={isDisabled}
                className="absolute text-[9px] px-1.5 py-0.5 rounded opacity-60 hover:opacity-100 transition-opacity disabled:opacity-30"
                style={{
                  color: 'var(--text-secondary)',
                  left: '0%',
                  transform: 'translateX(0%)',
                }}
              >
                Min
              </button>
              {/* 1024 - positioned at correct percentage */}
              <button
                type="button"
                onClick={() => handleDimensionChange(1024)}
                disabled={isDisabled}
                className="absolute text-[9px] px-1.5 py-0.5 rounded opacity-60 hover:opacity-100 transition-opacity disabled:opacity-30"
                style={{
                  color: 'var(--text-secondary)',
                  left: `${((1024 - currentModelInfo.minDimensions) / (currentModelInfo.maxDimensions - currentModelInfo.minDimensions)) * 100}%`,
                  transform: 'translateX(-50%)',
                }}
              >
                1024
              </button>
              {/* 1536 - positioned at correct percentage */}
              <button
                type="button"
                onClick={() => handleDimensionChange(PINECONE_REQUIRED_DIMENSIONS)}
                disabled={isDisabled}
                className="absolute text-[9px] px-1.5 py-0.5 rounded hover:opacity-100 transition-opacity disabled:opacity-30"
                style={{
                  color: 'var(--color-success)',
                  backgroundColor: 'color-mix(in srgb, var(--color-success) 10%, transparent)',
                  left: `${((PINECONE_REQUIRED_DIMENSIONS - currentModelInfo.minDimensions) / (currentModelInfo.maxDimensions - currentModelInfo.minDimensions)) * 100}%`,
                  transform: 'translateX(-50%)',
                }}
              >
                1536
              </button>
              {/* Max - always at 100% */}
              <button
                type="button"
                onClick={() => handleDimensionChange(currentModelInfo.maxDimensions ?? 0)}
                disabled={isDisabled}
                className="absolute text-[9px] px-1.5 py-0.5 rounded opacity-60 hover:opacity-100 transition-opacity disabled:opacity-30"
                style={{
                  color: 'var(--text-secondary)',
                  right: '0%',
                  transform: 'translateX(0%)',
                }}
              >
                Max
              </button>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={() => { void handleStartIndexing(); }}
        disabled={isDisabled}
        className="w-full px-4 py-2 rounded-xl transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={{
          backgroundColor: isDisabled ? 'var(--border)' : 'var(--btn-primary-bg)',
          color: isDisabled ? 'var(--text-secondary)' : 'var(--btn-primary-text)',
          border: '1px solid',
          borderColor: isDisabled ? 'var(--border)' : 'var(--btn-primary-border)',
        }}
      >
        {isRestoring ? (
          <>
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Checking...
          </>
        ) : startIndexing.isPending ? (
          <>
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Starting...
          </>
        ) : isSelectedStoreIndexing ? (
          <>
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {vectorStore} Indexing...
          </>
        ) : (
          <>Start Indexing {currentModelInfo ? `(${currentModelInfo.displayName}${currentModelInfo.supportsCustomDimensions ? ` @ ${effectiveDimensions}d` : ''})` : ''}</>
        )}
      </button>

      {/* Small hint when indexing */}
      {activeVectorStores.length > 0 && (
        <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
          {activeVectorStores.join(' & ')} indexing in progress
        </p>
      )}
    </div>
  );
}
