/**
 * RAG Service Tests
 * Unit tests for RAG service methods, indexing, and utility functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ragService } from '../rag.service';
import { apiClient } from '../../lib/api-client';
import { API_ENDPOINTS } from '../../lib/constants';
import type {
  IndexingJobResponse,
  IndexStatsResponse,
  RagPerformanceStats,
  RagQueryLogsResponse,
  TopicAnalyticsResponse,
} from '../../types/rag';

// Mock the apiClient
vi.mock('../../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

// Helper to create mock indexing job
const createMockIndexingJob = (overrides: Partial<IndexingJobResponse> = {}): IndexingJobResponse => ({
  id: 'job-123',
  status: 'running',
  totalNotes: 100,
  processedNotes: 50,
  skippedNotes: 0,
  deletedNotes: 0,
  totalChunks: 200,
  processedChunks: 100,
  progressPercentage: 50,
  errors: [],
  embeddingProvider: 'OpenAI',
  startedAt: '2024-01-15T10:00:00Z',
  completedAt: null,
  createdAt: '2024-01-15T09:55:00Z',
  ...overrides,
});

// Helper to create mock index stats data
const createMockStatsData = (overrides: Partial<import('../../types/rag').IndexStatsData> = {}): import('../../types/rag').IndexStatsData => ({
  totalEmbeddings: 100,
  uniqueNotes: 50,
  lastIndexedAt: '2024-01-15T10:00:00Z',
  embeddingProvider: 'OpenAI',
  vectorStoreProvider: 'PostgreSQL',
  totalNotesInSystem: 100,
  notIndexedCount: 0,
  staleNotesCount: 0,
  ...overrides,
});

// Helper to create mock index stats
const createMockIndexStats = (overrides: Partial<IndexStatsResponse> = {}): IndexStatsResponse => ({
  postgreSQL: createMockStatsData(),
  pinecone: createMockStatsData({
    totalEmbeddings: 0,
    uniqueNotes: 0,
    lastIndexedAt: null,
    vectorStoreProvider: 'Pinecone',
  }),
  ...overrides,
});

describe('ragService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================
  // RAG Analytics & Feedback Tests
  // ============================================
  describe('submitFeedback', () => {
    it('should POST feedback to correct endpoint', async () => {
      vi.mocked(apiClient.post).mockResolvedValue(undefined);

      await ragService.submitFeedback({
        logId: 'log-123',
        feedback: 'thumbs_up',
        comment: 'Great response!',
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.RAG_ANALYTICS.FEEDBACK,
        expect.objectContaining({ logId: 'log-123', feedback: 'thumbs_up' })
      );
    });
  });

  describe('getPerformanceStats', () => {
    it('should GET without params', async () => {
      const mockStats: RagPerformanceStats = {
        totalQueries: 100,
        queriesWithFeedback: 50,
        positiveFeedback: 45,
        negativeFeedback: 5,
        positiveFeedbackRate: 0.9,
        avgTotalTimeMs: 150,
        avgRetrievedCount: 5,
        avgCosineScore: 0.85,
        avgRerankScore: 0.9,
        cosineScoreCorrelation: 0.75,
        rerankScoreCorrelation: 0.8,
        periodStart: null,
        periodEnd: new Date().toISOString(),
      };
      vi.mocked(apiClient.get).mockResolvedValue(mockStats);

      const result = await ragService.getPerformanceStats();

      expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.RAG_ANALYTICS.STATS);
      expect(result.totalQueries).toBe(100);
    });

    it('should include since param when provided', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({});

      await ragService.getPerformanceStats(new Date('2024-01-01'));

      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('since=')
      );
    });
  });

  describe('getQueryLogs', () => {
    it('should build query params correctly', async () => {
      const mockLogs: RagQueryLogsResponse = {
        logs: [],
        totalCount: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      };
      vi.mocked(apiClient.get).mockResolvedValue(mockLogs);

      await ragService.getQueryLogs(2, 10);

      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('page=2')
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('pageSize=10')
      );
    });

    it('should include feedbackOnly param', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ logs: [], totalCount: 0, page: 1, pageSize: 20, totalPages: 0 });

      await ragService.getQueryLogs(1, 20, undefined, true);

      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('feedbackOnly=true')
      );
    });

    it('should include since param when provided', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ logs: [], totalCount: 0, page: 1, pageSize: 20, totalPages: 0 });

      const sinceDate = new Date('2024-01-15T00:00:00Z');
      await ragService.getQueryLogs(1, 20, sinceDate);

      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('since=')
      );
    });
  });

  describe('getQueryLog', () => {
    it('should GET single log by ID', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ id: 'log-123' });

      await ragService.getQueryLog('log-123');

      expect(apiClient.get).toHaveBeenCalledWith(
        API_ENDPOINTS.RAG_ANALYTICS.LOG_BY_ID('log-123')
      );
    });
  });

  describe('clusterQueries', () => {
    it('should POST with clusterCount param', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ message: 'Clustering started' });

      await ragService.clusterQueries(10);

      expect(apiClient.post).toHaveBeenCalledWith(
        expect.stringContaining('clusterCount=10')
      );
    });

    it('should use default clusterCount of 5', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ message: 'OK' });

      await ragService.clusterQueries();

      expect(apiClient.post).toHaveBeenCalledWith(
        expect.stringContaining('clusterCount=5')
      );
    });
  });

  describe('getTopicStats', () => {
    it('should GET topic stats', async () => {
      const mockStats: TopicAnalyticsResponse = {
        topics: [],
        totalClustered: 80,
        totalUnclustered: 20,
        lastClusteredAt: '2024-01-15T10:00:00Z',
      };
      vi.mocked(apiClient.get).mockResolvedValue(mockStats);

      const result = await ragService.getTopicStats();

      expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.RAG_ANALYTICS.TOPICS);
      expect(result.totalClustered).toBe(80);
    });
  });

  // ============================================
  // Indexing Operations Tests
  // ============================================
  describe('getEmbeddingProviders', () => {
    it('should GET embedding providers', async () => {
      const mockProviders = [
        { provider: 'OpenAI', models: ['text-embedding-3-small'], isAvailable: true },
      ];
      vi.mocked(apiClient.get).mockResolvedValue(mockProviders);

      const result = await ragService.getEmbeddingProviders();

      expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.INDEXING.EMBEDDING_PROVIDERS);
      expect(result).toHaveLength(1);
    });
  });

  describe('startIndexing', () => {
    it('should POST with userId', async () => {
      const mockJob = createMockIndexingJob();
      vi.mocked(apiClient.post).mockResolvedValue(mockJob);

      await ragService.startIndexing({ userId: 'user-123' });

      expect(apiClient.post).toHaveBeenCalledWith(
        expect.stringContaining('userId=user-123')
      );
    });

    it('should include optional embeddingProvider', async () => {
      vi.mocked(apiClient.post).mockResolvedValue(createMockIndexingJob());

      await ragService.startIndexing({ embeddingProvider: 'OpenAI' });

      expect(apiClient.post).toHaveBeenCalledWith(
        expect.stringContaining('embeddingProvider=OpenAI')
      );
    });

    it('should include optional vectorStoreProvider', async () => {
      vi.mocked(apiClient.post).mockResolvedValue(createMockIndexingJob());

      await ragService.startIndexing({ vectorStoreProvider: 'PostgreSQL' });

      expect(apiClient.post).toHaveBeenCalledWith(
        expect.stringContaining('vectorStoreProvider=PostgreSQL')
      );
    });

    it('should include optional embeddingModel', async () => {
      vi.mocked(apiClient.post).mockResolvedValue(createMockIndexingJob());

      await ragService.startIndexing({ embeddingModel: 'text-embedding-3-small' });

      expect(apiClient.post).toHaveBeenCalledWith(
        expect.stringContaining('embeddingModel=')
      );
    });
  });

  describe('getIndexingStatus', () => {
    it('should GET status by jobId', async () => {
      const mockJob = createMockIndexingJob();
      vi.mocked(apiClient.get).mockResolvedValue(mockJob);

      const result = await ragService.getIndexingStatus('job-123');

      expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.INDEXING.STATUS('job-123'));
      expect(result.id).toBe('job-123');
    });
  });

  describe('cancelIndexing', () => {
    it('should POST cancel by jobId', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ message: 'Cancelled' });

      await ragService.cancelIndexing('job-123');

      expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.INDEXING.CANCEL('job-123'));
    });
  });

  describe('getIndexStats', () => {
    it('should GET index stats with userId', async () => {
      const mockStats = createMockIndexStats();
      vi.mocked(apiClient.get).mockResolvedValue(mockStats);

      await ragService.getIndexStats('user-123');

      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('userId=user-123')
      );
    });
  });

  describe('reindexNote', () => {
    it('should POST to reindex endpoint', async () => {
      vi.mocked(apiClient.post).mockResolvedValue(undefined);

      await ragService.reindexNote('note-123');

      expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.INDEXING.REINDEX_NOTE('note-123'));
    });
  });

  describe('deleteIndexedNotes', () => {
    it('should DELETE with vectorStoreProvider', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue(undefined);

      await ragService.deleteIndexedNotes('PostgreSQL');

      expect(apiClient.delete).toHaveBeenCalledWith(
        expect.stringContaining('vectorStoreProvider=PostgreSQL')
      );
    });
  });

  // ============================================
  // Utility Functions Tests
  // ============================================
  describe('isIndexingInProgress', () => {
    it('should return true for pending status', () => {
      const job = createMockIndexingJob({ status: 'pending' });
      expect(ragService.isIndexingInProgress(job)).toBe(true);
    });

    it('should return true for running status', () => {
      const job = createMockIndexingJob({ status: 'running' });
      expect(ragService.isIndexingInProgress(job)).toBe(true);
    });

    it('should return false for completed status', () => {
      const job = createMockIndexingJob({ status: 'completed' });
      expect(ragService.isIndexingInProgress(job)).toBe(false);
    });

    it('should return false for failed status', () => {
      const job = createMockIndexingJob({ status: 'failed' });
      expect(ragService.isIndexingInProgress(job)).toBe(false);
    });
  });

  describe('isIndexingComplete', () => {
    it('should return true for completed status', () => {
      const job = createMockIndexingJob({ status: 'completed' });
      expect(ragService.isIndexingComplete(job)).toBe(true);
    });

    it('should return false for running status', () => {
      const job = createMockIndexingJob({ status: 'running' });
      expect(ragService.isIndexingComplete(job)).toBe(false);
    });
  });

  describe('isIndexingFailed', () => {
    it('should return true for failed status', () => {
      const job = createMockIndexingJob({ status: 'failed' });
      expect(ragService.isIndexingFailed(job)).toBe(true);
    });

    it('should return false for completed status', () => {
      const job = createMockIndexingJob({ status: 'completed' });
      expect(ragService.isIndexingFailed(job)).toBe(false);
    });
  });

  describe('calculateProgress', () => {
    it('should return 0 when totalNotes is 0', () => {
      const job = createMockIndexingJob({ totalNotes: 0, processedNotes: 0 });
      expect(ragService.calculateProgress(job)).toBe(0);
    });

    it('should calculate percentage correctly', () => {
      const job = createMockIndexingJob({ totalNotes: 100, processedNotes: 75 });
      expect(ragService.calculateProgress(job)).toBe(75);
    });

    it('should round to nearest integer', () => {
      const job = createMockIndexingJob({ totalNotes: 3, processedNotes: 1 });
      expect(ragService.calculateProgress(job)).toBe(33);
    });
  });

  describe('getStatsForProvider', () => {
    it('should return PostgreSQL stats', () => {
      const stats = createMockIndexStats();
      const result = ragService.getStatsForProvider(stats, 'PostgreSQL');
      expect(result?.totalEmbeddings).toBe(100);
    });

    it('should return Pinecone stats', () => {
      const stats = createMockIndexStats({
        pinecone: createMockStatsData({ totalEmbeddings: 200, uniqueNotes: 100, vectorStoreProvider: 'Pinecone' }),
      });
      const result = ragService.getStatsForProvider(stats, 'Pinecone');
      expect(result?.totalEmbeddings).toBe(200);
    });

    it('should return undefined for unknown provider', () => {
      const stats = createMockIndexStats();
      // @ts-expect-error Testing with invalid provider name
      const result = ragService.getStatsForProvider(stats, 'Unknown');
      expect(result).toBeUndefined();
    });
  });

  describe('hasIndexedNotes', () => {
    it('should return true when PostgreSQL has embeddings', () => {
      const stats = createMockIndexStats();
      expect(ragService.hasIndexedNotes(stats)).toBe(true);
    });

    it('should return true when Pinecone has embeddings', () => {
      const stats = createMockIndexStats({
        postgreSQL: createMockStatsData({ totalEmbeddings: 0, uniqueNotes: 0, lastIndexedAt: null }),
        pinecone: createMockStatsData({ totalEmbeddings: 50, uniqueNotes: 25, lastIndexedAt: null, vectorStoreProvider: 'Pinecone' }),
      });
      expect(ragService.hasIndexedNotes(stats)).toBe(true);
    });

    it('should return false when no embeddings', () => {
      const stats = createMockIndexStats({
        postgreSQL: createMockStatsData({ totalEmbeddings: 0, uniqueNotes: 0, lastIndexedAt: null }),
        pinecone: createMockStatsData({ totalEmbeddings: 0, uniqueNotes: 0, lastIndexedAt: null, vectorStoreProvider: 'Pinecone' }),
      });
      expect(ragService.hasIndexedNotes(stats)).toBe(false);
    });
  });

  describe('getTotalEmbeddings', () => {
    it('should sum embeddings from both stores', () => {
      const stats = createMockIndexStats({
        postgreSQL: createMockStatsData({ totalEmbeddings: 100, uniqueNotes: 50, lastIndexedAt: null }),
        pinecone: createMockStatsData({ totalEmbeddings: 50, uniqueNotes: 25, lastIndexedAt: null, vectorStoreProvider: 'Pinecone' }),
      });
      expect(ragService.getTotalEmbeddings(stats)).toBe(150);
    });

    it('should handle undefined stats', () => {
      const stats = { postgreSQL: undefined, pinecone: undefined } as unknown as IndexStatsResponse;
      expect(ragService.getTotalEmbeddings(stats)).toBe(0);
    });
  });

  describe('getMostRecentIndexedStore', () => {
    it('should return PostgreSQL when more recent', () => {
      const stats = createMockIndexStats({
        postgreSQL: createMockStatsData({ totalEmbeddings: 100, uniqueNotes: 50, lastIndexedAt: '2024-01-15T10:00:00Z' }),
        pinecone: createMockStatsData({ totalEmbeddings: 50, uniqueNotes: 25, lastIndexedAt: '2024-01-14T10:00:00Z', vectorStoreProvider: 'Pinecone' }),
      });
      expect(ragService.getMostRecentIndexedStore(stats)).toBe('PostgreSQL');
    });

    it('should return Pinecone when more recent', () => {
      const stats = createMockIndexStats({
        postgreSQL: createMockStatsData({ totalEmbeddings: 100, uniqueNotes: 50, lastIndexedAt: '2024-01-14T10:00:00Z' }),
        pinecone: createMockStatsData({ totalEmbeddings: 50, uniqueNotes: 25, lastIndexedAt: '2024-01-15T10:00:00Z', vectorStoreProvider: 'Pinecone' }),
      });
      expect(ragService.getMostRecentIndexedStore(stats)).toBe('Pinecone');
    });

    it('should return null when neither has been indexed', () => {
      const stats = createMockIndexStats({
        postgreSQL: createMockStatsData({ totalEmbeddings: 0, uniqueNotes: 0, lastIndexedAt: null }),
        pinecone: createMockStatsData({ totalEmbeddings: 0, uniqueNotes: 0, lastIndexedAt: null, vectorStoreProvider: 'Pinecone' }),
      });
      expect(ragService.getMostRecentIndexedStore(stats)).toBeNull();
    });

    it('should return Pinecone when only Pinecone has been indexed', () => {
      const stats = createMockIndexStats({
        postgreSQL: createMockStatsData({ totalEmbeddings: 0, uniqueNotes: 0, lastIndexedAt: null }),
        pinecone: createMockStatsData({ totalEmbeddings: 50, uniqueNotes: 25, lastIndexedAt: '2024-01-15T10:00:00Z', vectorStoreProvider: 'Pinecone' }),
      });
      expect(ragService.getMostRecentIndexedStore(stats)).toBe('Pinecone');
    });
  });

  describe('formatLastIndexed', () => {
    it('should return "Never" for null', () => {
      expect(ragService.formatLastIndexed(null)).toBe('Never');
    });

    it('should return "Just now" for < 1 minute', () => {
      const now = new Date();
      expect(ragService.formatLastIndexed(now.toISOString())).toBe('Just now');
    });

    it('should return minutes ago', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      expect(ragService.formatLastIndexed(fiveMinutesAgo.toISOString())).toBe('5 mins ago');
    });

    it('should return hours ago', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      expect(ragService.formatLastIndexed(twoHoursAgo.toISOString())).toBe('2 hours ago');
    });

    it('should return days ago', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      expect(ragService.formatLastIndexed(threeDaysAgo.toISOString())).toBe('3 days ago');
    });
  });

  describe('getEmbeddingProviderDisplayName', () => {
    it('should return display name for OpenAI', () => {
      expect(ragService.getEmbeddingProviderDisplayName('OpenAI')).toBe('OpenAI Embeddings');
    });

    it('should return display name for Ollama', () => {
      expect(ragService.getEmbeddingProviderDisplayName('Ollama')).toBe('Ollama Embeddings');
    });

    it('should return provider as-is for unknown', () => {
      // @ts-expect-error Testing with unknown provider name
      expect(ragService.getEmbeddingProviderDisplayName('Custom')).toBe('Custom');
    });
  });

  describe('getVectorStoreDisplayName', () => {
    it('should return display name for PostgreSQL', () => {
      expect(ragService.getVectorStoreDisplayName('PostgreSQL')).toBe('PostgreSQL (pgvector)');
    });

    it('should return display name for Pinecone', () => {
      expect(ragService.getVectorStoreDisplayName('Pinecone')).toBe('Pinecone');
    });

    it('should return provider as-is for unknown', () => {
      // @ts-expect-error Testing with unknown provider name
      expect(ragService.getVectorStoreDisplayName('CustomStore')).toBe('CustomStore');
    });
  });

  describe('isVectorStoreReady', () => {
    it('should return true when store has embeddings', () => {
      const stats = createMockIndexStats();
      expect(ragService.isVectorStoreReady(stats, 'PostgreSQL')).toBe(true);
    });

    it('should return false when store has no embeddings', () => {
      const stats = createMockIndexStats({
        pinecone: createMockStatsData({ totalEmbeddings: 0, uniqueNotes: 0, lastIndexedAt: null, vectorStoreProvider: 'Pinecone' }),
      });
      expect(ragService.isVectorStoreReady(stats, 'Pinecone')).toBe(false);
    });
  });
});
