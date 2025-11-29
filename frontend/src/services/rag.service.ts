/**
 * RAG Service
 * Handles RAG indexing and vector store operations
 */

import { apiClient } from '../lib/api-client';
import { API_ENDPOINTS, DEFAULT_USER_ID } from '../lib/constants';
import type {
  IndexingJobResponse,
  IndexStatsResponse,
  IndexStatsData,
  VectorStoreProvider,
  EmbeddingProvider,
  StartIndexingOptions,
} from '../types/rag';

/**
 * RAG service for indexing and vector store operations
 */
export const ragService = {
  /**
   * Start indexing notes
   */
  async startIndexing(options: StartIndexingOptions = {}): Promise<IndexingJobResponse> {
    const params = new URLSearchParams({ userId: options.userId || DEFAULT_USER_ID });
    
    if (options.embeddingProvider) {
      params.append('embeddingProvider', options.embeddingProvider);
    }
    if (options.vectorStoreProvider) {
      params.append('vectorStoreProvider', options.vectorStoreProvider);
    }
    
    return apiClient.post<IndexingJobResponse>(`${API_ENDPOINTS.INDEXING.START}?${params}`);
  },

  /**
   * Get indexing job status
   */
  async getIndexingStatus(jobId: string): Promise<IndexingJobResponse> {
    return apiClient.get<IndexingJobResponse>(API_ENDPOINTS.INDEXING.STATUS(jobId));
  },

  /**
   * Get index statistics
   */
  async getIndexStats(userId: string = DEFAULT_USER_ID): Promise<IndexStatsResponse> {
    const params = new URLSearchParams({ userId });
    return apiClient.get<IndexStatsResponse>(`${API_ENDPOINTS.INDEXING.STATS}?${params}`);
  },

  /**
   * Reindex a specific note
   */
  async reindexNote(noteId: string): Promise<void> {
    return apiClient.post<void>(API_ENDPOINTS.INDEXING.REINDEX_NOTE(noteId));
  },

  /**
   * Delete all indexed notes from a vector store
   */
  async deleteIndexedNotes(vectorStoreProvider: VectorStoreProvider): Promise<void> {
    const params = new URLSearchParams({ vectorStoreProvider });
    return apiClient.delete<void>(`${API_ENDPOINTS.INDEXING.DELETE_NOTES}?${params}`);
  },

  // ============================================
  // Utility Functions
  // ============================================

  /**
   * Check if indexing is in progress
   */
  isIndexingInProgress(job: IndexingJobResponse): boolean {
    return job.status === 'pending' || job.status === 'processing';
  },

  /**
   * Check if indexing completed successfully
   */
  isIndexingComplete(job: IndexingJobResponse): boolean {
    return job.status === 'completed';
  },

  /**
   * Check if indexing failed
   */
  isIndexingFailed(job: IndexingJobResponse): boolean {
    return job.status === 'failed';
  },

  /**
   * Calculate indexing progress percentage
   */
  calculateProgress(job: IndexingJobResponse): number {
    if (job.totalNotes === 0) return 0;
    return Math.round((job.processedNotes / job.totalNotes) * 100);
  },

  /**
   * Get stats for a specific vector store
   */
  getStatsForProvider(
    stats: IndexStatsResponse,
    provider: VectorStoreProvider
  ): IndexStatsData | undefined {
    switch (provider) {
      case 'PostgreSQL':
        return stats.postgreSQL;
      case 'Pinecone':
        return stats.pinecone;
      default:
        return undefined;
    }
  },

  /**
   * Check if any vector store has indexed notes
   */
  hasIndexedNotes(stats: IndexStatsResponse): boolean {
    return (
      (stats.postgreSQL?.totalEmbeddings || 0) > 0 ||
      (stats.pinecone?.totalEmbeddings || 0) > 0
    );
  },

  /**
   * Get total embeddings across all stores
   */
  getTotalEmbeddings(stats: IndexStatsResponse): number {
    return (
      (stats.postgreSQL?.totalEmbeddings || 0) +
      (stats.pinecone?.totalEmbeddings || 0)
    );
  },

  /**
   * Get the most recently indexed vector store
   */
  getMostRecentIndexedStore(stats: IndexStatsResponse): VectorStoreProvider | null {
    const pgDate = stats.postgreSQL?.lastIndexedAt
      ? new Date(stats.postgreSQL.lastIndexedAt)
      : null;
    const pineconeDate = stats.pinecone?.lastIndexedAt
      ? new Date(stats.pinecone.lastIndexedAt)
      : null;

    if (!pgDate && !pineconeDate) return null;
    if (!pgDate) return 'Pinecone';
    if (!pineconeDate) return 'PostgreSQL';

    return pgDate > pineconeDate ? 'PostgreSQL' : 'Pinecone';
  },

  /**
   * Format last indexed time for display
   */
  formatLastIndexed(dateString: string | null): string {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  },

  /**
   * Get embedding provider display name
   */
  getEmbeddingProviderDisplayName(provider: EmbeddingProvider): string {
    switch (provider) {
      case 'OpenAI':
        return 'OpenAI Embeddings';
      case 'Ollama':
        return 'Ollama Embeddings';
      default:
        return provider;
    }
  },

  /**
   * Get vector store display name
   */
  getVectorStoreDisplayName(provider: VectorStoreProvider): string {
    switch (provider) {
      case 'PostgreSQL':
        return 'PostgreSQL (pgvector)';
      case 'Pinecone':
        return 'Pinecone';
      default:
        return provider;
    }
  },

  /**
   * Validate that a vector store is ready for use
   */
  isVectorStoreReady(
    stats: IndexStatsResponse,
    provider: VectorStoreProvider
  ): boolean {
    const providerStats = this.getStatsForProvider(stats, provider);
    return providerStats !== undefined && providerStats.totalEmbeddings > 0;
  },
};

