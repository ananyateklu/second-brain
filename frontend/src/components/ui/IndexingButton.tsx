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
  const [vectorStore, setVectorStore] = useState<string>('PostgreSQL');
  const [selectedProvider, setSelectedProvider] = useState<string>('OpenAI');
  const [selectedModel, setSelectedModel] = useState<string>('');

  // Track when provider or model was last changed by user interaction
  const lastProviderChangeRef = useRef<string>('');

  const startIndexing = useStartIndexing();
  const { data: providers, isLoading: isLoadingProviders } = useEmbeddingProviders();

  // Global indexing state from store - supports multiple jobs
  const {
    activeJobs,
    isRestoring,
    startIndexingJob,
  } = useBoundStore();

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
  }, []);

  // Check if current model is compatible with Pinecone
  const isPineconeCompatible = currentModelInfo?.supportsPinecone ?? false;
  const needsPinecone = vectorStore === 'Pinecone' || vectorStore === 'Both';

  // Handle provider change with auto-switch logic (in event handler, not effect)
  const handleProviderChange = (newProvider: string) => {
    const newProviderData = providers?.find(p => p.name === newProvider);
    if (!newProviderData) return;

    setSelectedProvider(newProvider);
    lastProviderChangeRef.current = newProvider;

    // Sync model selection for the new provider
    syncModelForProvider(newProvider, newProviderData.availableModels);

    // Get default model for this provider
    const defaultModel = newProviderData.availableModels.find(m => m.isDefault) ?? newProviderData.availableModels[0];

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

    // Auto-switch to PostgreSQL when selecting a non-Pinecone-compatible model
    if (needsPinecone && !model.supportsPinecone) {
      setVectorStore('PostgreSQL');
      toast.info(
        'Vector Store Changed',
        `${model.displayName} (${model.dimensions} dims) is not compatible with Pinecone. Switched to PostgreSQL.`
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
        `${currentModelInfo?.displayName ?? effectiveSelectedModel} (${currentModelInfo?.dimensions ?? '?'} dims) cannot be used with Pinecone. Please select PostgreSQL or choose a ${PINECONE_REQUIRED_DIMENSIONS}-dimension model.`
      );
      setVectorStore('PostgreSQL');
      return;
    }

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
                {currentModelInfo.displayName} ({currentModelInfo.dimensions} dims) → PostgreSQL only
              </p>
            )}
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
          <>Start Indexing {currentModelInfo ? `(${currentModelInfo.displayName})` : ''}</>
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
