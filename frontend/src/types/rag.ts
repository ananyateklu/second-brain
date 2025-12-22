/**
 * RAG (Retrieval Augmented Generation) Types
 * Types for indexing, embeddings, and vector store operations
 */

/**
 * Vector store provider options
 */
export type VectorStoreProvider = 'PostgreSQL' | 'Pinecone';

/**
 * Embedding provider options
 */
export type EmbeddingProvider = 'OpenAI' | 'Gemini' | 'Ollama' | 'Cohere';

/**
 * Embedding model information
 */
export interface EmbeddingModelInfo {
  modelId: string;
  displayName: string;
  dimensions: number;
  supportsPinecone: boolean;
  description?: string;
  isDefault: boolean;
  /** Whether this model supports custom output dimensions */
  supportsCustomDimensions?: boolean;
  /** Minimum allowed dimensions (only set if supportsCustomDimensions is true) */
  minDimensions?: number;
  /** Maximum allowed dimensions (only set if supportsCustomDimensions is true) */
  maxDimensions?: number;
}

/**
 * Embedding provider with available models from API
 */
export interface EmbeddingProviderResponse {
  name: string;
  isEnabled: boolean;
  currentModel: string;
  currentDimensions: number;
  availableModels: EmbeddingModelInfo[];
}

/**
 * Embedding provider dimension information (legacy, for backward compatibility)
 */
export interface EmbeddingProviderInfo {
  name: EmbeddingProvider;
  dimensions: number;
  supportsPinecone: boolean;
}

/**
 * Known embedding provider configurations (legacy fallback)
 *
 * Note: Pinecone requires 1536 dimensions. Only OpenAI text-embedding-3-small
 * natively outputs 1536 dimensions. Gemini text-embedding-004 outputs 768 dims
 * and cannot be expanded to 1536 (outputDimensionality only supports truncation).
 * Cohere embed-v4.0 supports 256-4096 dimensions (default 1024).
 */
export const EMBEDDING_PROVIDERS: Record<EmbeddingProvider, EmbeddingProviderInfo> = {
  OpenAI: { name: 'OpenAI', dimensions: 1536, supportsPinecone: true },
  Gemini: { name: 'Gemini', dimensions: 768, supportsPinecone: false },
  Ollama: { name: 'Ollama', dimensions: 768, supportsPinecone: false },
  Cohere: { name: 'Cohere', dimensions: 1024, supportsPinecone: false },
};

/**
 * Indexing job status
 */
export type IndexingStatus = 'pending' | 'running' | 'completed' | 'failed' | 'partially_completed' | 'cancelled';

/**
 * Indexing job response
 */
export interface IndexingJobResponse {
  id: string;
  status: IndexingStatus;
  totalNotes: number;
  processedNotes: number;
  skippedNotes: number;
  deletedNotes: number;
  totalChunks: number;
  processedChunks: number;
  errors: string[];
  embeddingProvider: string;
  embeddingModel?: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  progressPercentage: number;
}

/**
 * Index statistics for a single vector store
 */
export interface IndexStatsData {
  totalEmbeddings: number;
  uniqueNotes: number;
  lastIndexedAt: string | null;
  embeddingProvider: string;
  vectorStoreProvider: string;
  /** Total number of notes in the system for the user */
  totalNotesInSystem: number;
  /** Number of notes that are not indexed in this vector store */
  notIndexedCount: number;
  /** Number of notes that are indexed but have been modified since last indexing */
  staleNotesCount: number;
}

/**
 * Index statistics response (per vector store)
 */
export interface IndexStatsResponse {
  postgreSQL?: IndexStatsData;
  pinecone?: IndexStatsData;
}

/**
 * RAG context note returned from vector search
 */
export interface RagContextNote {
  noteId: string;
  title: string;
  tags: string[];
  relevanceScore: number;
  chunkContent: string;
  content: string;
  createdOn?: string | null;
  modifiedOn?: string | null;
  chunkIndex: number;
}

/**
 * RAG context response
 */
export interface RagContextResponse {
  notes: RagContextNote[];
  query: string;
  vectorStoreProvider: VectorStoreProvider;
}

/**
 * Start indexing request options
 */
export interface StartIndexingOptions {
  userId?: string;
  embeddingProvider?: EmbeddingProvider;
  vectorStoreProvider?: VectorStoreProvider;
  embeddingModel?: string;
  /** Custom dimensions for models that support it (e.g., Cohere embed-v4.0) */
  customDimensions?: number;
}

/**
 * Indexing state for UI
 */
export interface IndexingState {
  isIndexing: boolean;
  currentJobId: string | null;
  progress: number;
  error: string | null;
}

// ============================================
// RAG Analytics Types
// ============================================

/**
 * Feedback type for RAG queries
 */
export type RagFeedbackType = 'thumbs_up' | 'thumbs_down';

/**
 * Feedback category for detailed analysis
 */
export type RagFeedbackCategory = 'wrong_info' | 'missing_context' | 'irrelevant' | 'slow_response' | 'other';

/**
 * Request to submit RAG feedback
 */
export interface RagFeedbackRequest {
  logId: string;
  feedback: RagFeedbackType;
  category?: RagFeedbackCategory;
  comment?: string;
}

/**
 * RAG performance statistics response
 */
export interface RagPerformanceStats {
  totalQueries: number;
  queriesWithFeedback: number;
  positiveFeedback: number;
  negativeFeedback: number;
  positiveFeedbackRate: number;
  avgTotalTimeMs: number;
  avgRetrievedCount: number;
  avgCosineScore: number;
  avgRerankScore: number;
  cosineScoreCorrelation: number | null;
  rerankScoreCorrelation: number | null;
  periodStart: string | null;
  periodEnd: string;
}

/**
 * Single RAG query log entry
 */
export interface RagQueryLog {
  id: string;
  query: string;
  conversationId: string | null;
  createdAt: string;
  totalTimeMs: number | null;
  queryEmbeddingTimeMs: number | null;
  vectorSearchTimeMs: number | null;
  rerankTimeMs: number | null;
  retrievedCount: number | null;
  finalCount: number | null;
  topCosineScore: number | null;
  avgCosineScore: number | null;
  topRerankScore: number | null;
  avgRerankScore: number | null;
  hybridSearchEnabled: boolean;
  hyDEEnabled: boolean;
  multiQueryEnabled: boolean;
  rerankingEnabled: boolean;
  userFeedback: RagFeedbackType | null;
  feedbackCategory: RagFeedbackCategory | null;
  feedbackComment: string | null;
  topicCluster: number | null;
  topicLabel: string | null;
}

/**
 * Paginated RAG query logs response
 */
export interface RagQueryLogsResponse {
  logs: RagQueryLog[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Topic statistics for clustering analysis
 */
export interface TopicStats {
  clusterId: number;
  label: string;
  queryCount: number;
  positiveFeedback: number;
  negativeFeedback: number;
  positiveFeedbackRate: number;
  avgCosineScore: number;
  avgRerankScore: number;
  sampleQueries: string[];
}

/**
 * Topic analytics response
 */
export interface TopicAnalyticsResponse {
  topics: TopicStats[];
  totalClustered: number;
  totalUnclustered: number;
  lastClusteredAt: string | null;
}

