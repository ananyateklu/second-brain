import { Skeleton } from '@/components/ui';
import type { IndexingButtonProps } from './types';
import { useIndexingState } from './hooks/use-indexing-state';
import { VectorStoreSelector } from './VectorStoreSelector';
import { EmbeddingProviderSelector } from './EmbeddingProviderSelector';
import { EmbeddingModelSelector } from './EmbeddingModelSelector';
import { DimensionSlider } from './DimensionSlider';
import { StartIndexingButton } from './StartIndexingButton';

/**
 * Loading skeleton for the indexing button while providers are being fetched.
 */
function IndexingButtonSkeleton() {
  return (
    <div className="flex gap-6">
      <div className="flex-1 space-y-3">
        <div className="flex gap-4">
          <div className="flex-1">
            <Skeleton className="h-3 w-20 mb-2" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
          <div className="flex-1">
            <Skeleton className="h-3 w-28 mb-2" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        </div>
        <div>
          <Skeleton className="h-3 w-24 mb-2" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-28" />
          </div>
        </div>
      </div>
      <div className="flex items-end">
        <Skeleton className="h-10 w-40" />
      </div>
    </div>
  );
}

/**
 * Main IndexingButton component that orchestrates vector store indexing.
 * Allows users to select vector store, embedding provider, model, and dimensions.
 *
 * @example
 * <IndexingButton userId="user-123" />
 */
export function IndexingButton({ userId = 'default-user' }: IndexingButtonProps) {
  const state = useIndexingState(userId);

  // Show loading skeleton while fetching providers
  if (state.isLoadingProviders) {
    return <IndexingButtonSkeleton />;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
      {/* Left side - Configuration options */}
      <div className="flex-1 space-y-3">
        {/* Vector Store & Embedding Provider Selection Row */}
        <div className="flex flex-col sm:flex-row gap-4">
          <VectorStoreSelector
            vectorStore={state.vectorStore}
            setVectorStore={state.setVectorStore}
            isDisabled={state.isDisabled}
            isVectorStoreDisabled={state.isVectorStoreDisabled}
            isPineconeCompatible={state.isPineconeCompatible}
            currentModelInfo={state.currentModelInfo}
            effectiveSelectedModel={state.effectiveSelectedModel}
            effectiveDimensions={state.effectiveDimensions}
          />

          <EmbeddingProviderSelector
            providers={state.providers}
            effectiveProvider={state.effectiveProvider}
            handleProviderChange={state.handleProviderChange}
            isDisabled={state.isDisabled}
          />
        </div>

        {/* Model Selection */}
        <EmbeddingModelSelector
          availableModels={state.availableModels}
          effectiveSelectedModel={state.effectiveSelectedModel}
          handleModelChange={state.handleModelChange}
          isDisabled={state.isDisabled}
          needsPinecone={state.needsPinecone}
          isPineconeCompatible={state.isPineconeCompatible}
          currentModelInfo={state.currentModelInfo}
          effectiveDimensions={state.effectiveDimensions}
        />

        {/* Dimension Slider (only for models that support custom dimensions) */}
        <DimensionSlider
          currentModelInfo={state.currentModelInfo}
          customDimensions={state.customDimensions}
          effectiveDimensions={state.effectiveDimensions}
          handleDimensionChange={state.handleDimensionChange}
          isDisabled={state.isDisabled}
        />
      </div>

      {/* Right side - Start Button */}
      <div className="flex flex-col justify-end lg:min-w-[180px]">
        <StartIndexingButton
          isDisabled={state.isDisabled}
          isRestoring={state.isRestoring}
          isStartingIndexing={state.isStartingIndexing}
          isSelectedStoreIndexing={state.isSelectedStoreIndexing}
          vectorStore={state.vectorStore}
          currentModelInfo={state.currentModelInfo}
          effectiveDimensions={state.effectiveDimensions}
          handleStartIndexing={state.handleStartIndexing}
        />

        {/* Active indexing hint */}
        {state.activeVectorStores.length > 0 && (
          <p className="text-[10px] text-center mt-2 text-[var(--text-muted)]">
            {state.activeVectorStores.join(' & ')} in progress
          </p>
        )}
      </div>
    </div>
  );
}
