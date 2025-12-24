import { useState, useMemo, useRef, useCallback } from 'react';
import { useStartIndexing, useEmbeddingProviders } from '../../../hooks/use-indexing';
import { useBoundStore } from '@/store/bound-store';
import { toast } from '@/hooks/use-toast';
import type { EmbeddingProvider, VectorStoreProvider, EmbeddingModelInfo } from '@/types/rag';
import type { IndexingState } from '../types';
import { PINECONE_REQUIRED_DIMENSIONS } from '../types';

/**
 * Custom hook that manages all indexing state and logic.
 * Extracts state management from IndexingButton for better separation of concerns.
 */
export function useIndexingState(userId: string = 'default-user'): IndexingState {
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
    return providers.find(p => p.name === selectedProvider) ?? null;
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
  const handleProviderChange = useCallback((newProvider: string) => {
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
  }, [providers, setSelectedProvider, setCustomDimensions, syncModelForProvider, needsPinecone, setRagEmbeddingProvider, setRagEmbeddingModel, setRagEmbeddingDimensions]);

  // Handle model change with auto-switch logic
  const handleModelChange = useCallback((modelId: string) => {
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
  }, [availableModels, setSelectedModel, setCustomDimensions, needsPinecone, setRagEmbeddingModel, setRagEmbeddingDimensions]);

  // Handle custom dimension change
  const handleDimensionChange = useCallback((dims: number) => {
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
  }, [setCustomDimensions, needsPinecone, setRagEmbeddingDimensions]);

  // Check if the selected vector store(s) are already being indexed
  const getActiveVectorStores = useCallback(() => {
    return Object.values(activeJobs)
      .filter((job) => job.status?.status === 'running' || job.status?.status === 'pending')
      .map((job) => job.vectorStore);
  }, [activeJobs]);

  const activeVectorStores = getActiveVectorStores();

  // Disable if selected store is already indexing
  const isSelectedStoreIndexing = vectorStore === 'Both'
    ? activeVectorStores.includes('PostgreSQL') || activeVectorStores.includes('Pinecone')
    : activeVectorStores.includes(vectorStore);

  const isDisabled = isSelectedStoreIndexing || startIndexing.isPending || isRestoring || isLoadingProviders;

  // Check if vector store option should be disabled based on current embedding model
  const isVectorStoreDisabled = useCallback((store: string) => {
    if (isDisabled) return true;
    if ((store === 'Pinecone' || store === 'Both') && !isPineconeCompatible) return true;
    return false;
  }, [isDisabled, isPineconeCompatible]);

  const handleStartIndexing = useCallback(async () => {
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
  }, [
    needsPinecone,
    isPineconeCompatible,
    currentModelInfo,
    effectiveSelectedModel,
    effectiveDimensions,
    customDimensions,
    vectorStore,
    userId,
    effectiveProvider,
    startIndexing,
    startIndexingJob,
  ]);

  return {
    // Current selections
    vectorStore,
    selectedProvider,
    selectedModel,
    customDimensions,

    // Effective/computed values
    effectiveProvider,
    effectiveSelectedModel,
    effectiveDimensions,

    // Provider/Model data
    providers,
    currentProviderData,
    availableModels,
    currentModelInfo,

    // Status flags
    isLoadingProviders,
    isDisabled,
    isPineconeCompatible,
    needsPinecone,
    isSelectedStoreIndexing,
    isRestoring,
    activeVectorStores,

    // Event handlers
    setVectorStore,
    handleProviderChange,
    handleModelChange,
    handleDimensionChange,
    handleStartIndexing,
    isVectorStoreDisabled,

    // Mutation status
    isStartingIndexing: startIndexing.isPending,
  };
}
