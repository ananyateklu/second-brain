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
export type EmbeddingProvider = 'OpenAI' | 'Ollama';

/**
 * Indexing job status
 */
export type IndexingStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Indexing job response
 */
export interface IndexingJobResponse {
  id: string;
  status: IndexingStatus | string;
  totalNotes: number;
  processedNotes: number;
  skippedNotes: number;
  deletedNotes: number;
  totalChunks: number;
  processedChunks: number;
  errors: string[];
  embeddingProvider: string;
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

