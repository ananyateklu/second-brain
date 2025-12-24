/**
 * Indexing Components
 *
 * This module exports components for managing vector store indexing,
 * including provider selection, model selection, and dimension configuration.
 */

// Main component
export { IndexingButton } from './IndexingButton';

// Sub-components
export { VectorStoreSelector } from './VectorStoreSelector';
export { EmbeddingProviderSelector } from './EmbeddingProviderSelector';
export { EmbeddingModelSelector } from './EmbeddingModelSelector';
export { DimensionSlider } from './DimensionSlider';
export { StartIndexingButton } from './StartIndexingButton';

// Hook
export { useIndexingState } from './hooks/use-indexing-state';

// Types
export type {
  IndexingButtonProps,
  IndexingState,
  SelectorProps,
  VectorStoreSelectorProps,
  EmbeddingProviderSelectorProps,
  EmbeddingModelSelectorProps,
  DimensionSliderProps,
  StartIndexingButtonProps,
} from './types';

export { PINECONE_REQUIRED_DIMENSIONS } from './types';
