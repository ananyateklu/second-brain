import type { EmbeddingModelInfo, EmbeddingProviderResponse } from '@/types/rag';

/**
 * Pinecone requires exactly 1536 dimensions
 */
export const PINECONE_REQUIRED_DIMENSIONS = 1536;

/**
 * Props for the main IndexingButton component
 */
export interface IndexingButtonProps {
  userId?: string;
}

/**
 * Shared state interface for indexing components
 */
export interface IndexingState {
  // Current selections
  vectorStore: string;
  selectedProvider: string;
  selectedModel: string;
  customDimensions: number | null;

  // Effective/computed values
  effectiveProvider: string;
  effectiveSelectedModel: string;
  effectiveDimensions: number;

  // Provider/Model data
  providers: EmbeddingProviderResponse[] | undefined;
  currentProviderData: EmbeddingProviderResponse | null;
  availableModels: EmbeddingModelInfo[];
  currentModelInfo: EmbeddingModelInfo | null;

  // Status flags
  isLoadingProviders: boolean;
  isDisabled: boolean;
  isPineconeCompatible: boolean;
  needsPinecone: boolean;
  isSelectedStoreIndexing: boolean;
  isRestoring: boolean;
  activeVectorStores: string[];

  // Event handlers
  setVectorStore: (store: string) => void;
  handleProviderChange: (provider: string) => void;
  handleModelChange: (modelId: string) => void;
  handleDimensionChange: (dims: number) => void;
  handleStartIndexing: () => Promise<void>;
  isVectorStoreDisabled: (store: string) => boolean;

  // Mutation status
  isStartingIndexing: boolean;
}

/**
 * Props for selector components
 */
export interface SelectorProps {
  isDisabled: boolean;
}

/**
 * Props for VectorStoreSelector
 */
export interface VectorStoreSelectorProps extends SelectorProps {
  vectorStore: string;
  setVectorStore: (store: string) => void;
  isVectorStoreDisabled: (store: string) => boolean;
  isPineconeCompatible: boolean;
  currentModelInfo: EmbeddingModelInfo | null;
  effectiveSelectedModel: string;
  effectiveDimensions: number;
}

/**
 * Props for EmbeddingProviderSelector
 */
export interface EmbeddingProviderSelectorProps extends SelectorProps {
  providers: EmbeddingProviderResponse[] | undefined;
  effectiveProvider: string;
  handleProviderChange: (provider: string) => void;
}

/**
 * Props for EmbeddingModelSelector
 */
export interface EmbeddingModelSelectorProps extends SelectorProps {
  availableModels: EmbeddingModelInfo[];
  effectiveSelectedModel: string;
  handleModelChange: (modelId: string) => void;
  needsPinecone: boolean;
  isPineconeCompatible: boolean;
  currentModelInfo: EmbeddingModelInfo | null;
  effectiveDimensions: number;
}

/**
 * Props for DimensionSlider
 */
export interface DimensionSliderProps extends SelectorProps {
  currentModelInfo: EmbeddingModelInfo | null;
  customDimensions: number | null;
  effectiveDimensions: number;
  handleDimensionChange: (dims: number) => void;
}

/**
 * Props for StartIndexingButton
 */
export interface StartIndexingButtonProps {
  isDisabled: boolean;
  isRestoring: boolean;
  isStartingIndexing: boolean;
  isSelectedStoreIndexing: boolean;
  vectorStore: string;
  currentModelInfo: EmbeddingModelInfo | null;
  effectiveDimensions: number;
  handleStartIndexing: () => Promise<void>;
}
