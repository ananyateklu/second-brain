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

