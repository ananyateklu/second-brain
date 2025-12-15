/**
 * Indexing Slice Tests
 * Unit tests for indexing store slice
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createIndexingSlice,
  selectActiveJobs,
  selectHasActiveJobs,
  selectIsAnyJobIndexing,
  selectJobByVectorStore,
  selectIsIndexing,
  selectIsIndexingComplete,
  selectIsIndexingFailed,
  selectIsIndexingCancelled,
  selectIndexingProgress,
  selectActiveJobId,
  selectActiveJobStatus,
  selectVectorStore,
  selectEmbeddingProvider,
} from '../indexing-slice';
import { ragService } from '../../../services';
import type { IndexingSlice } from '../indexing-slice';
import type { BoundStore } from '../../types';
import type { IndexingJobResponse } from '../../../types/rag';

// Mock ragService
vi.mock('../../../services', () => ({
  ragService: {
    getIndexingStatus: vi.fn(),
  },
}));

describe('indexingSlice', () => {
  let state: Partial<BoundStore>;
  let slice: IndexingSlice;
  let localStorageMock: Record<string, string>;

  const mockSet = vi.fn((partial: Partial<BoundStore> | ((state: BoundStore) => Partial<BoundStore>)) => {
    if (typeof partial === 'function') {
      const newState = partial(state as BoundStore);
      Object.assign(state, newState);
    } else {
      Object.assign(state, partial);
    }
  });

  const mockGet = vi.fn(() => state as BoundStore);

  const createMockJob = (overrides: Partial<IndexingJobResponse> = {}): IndexingJobResponse => ({
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
    createdAt: '2024-01-15T10:00:00Z',
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock = {};

    // Mock localStorage
    const localStorageProxy = {
      getItem: vi.fn((key: string) => localStorageMock[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key];
      }),
      clear: vi.fn(() => {
        localStorageMock = {};
      }),
      length: 0,
      key: vi.fn(() => null),
    };

    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageProxy,
      writable: true,
    });

    state = {};
    // @ts-expect-error - Partial store mock
    slice = createIndexingSlice(mockSet, mockGet, {});
    Object.assign(state, slice);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================
  // Initial State Tests
  // ============================================
  describe('initial state', () => {
    it('should have empty active jobs', () => {
      expect(slice.activeJobs).toEqual({});
    });

    it('should not be restoring', () => {
      expect(slice.isRestoring).toBe(false);
    });

    it('should have notification hidden', () => {
      expect(slice.isNotificationVisible).toBe(false);
    });
  });

  // ============================================
  // startIndexingJob Tests
  // ============================================
  describe('startIndexingJob', () => {
    it('should add job to active jobs', () => {
      const job = createMockJob();

      slice.startIndexingJob(job, 'PostgreSQL', 'OpenAI', 'user-123');

      expect(state.activeJobs?.['PostgreSQL']).toBeDefined();
      expect(state.activeJobs?.['PostgreSQL'].jobId).toBe('job-123');
      expect(state.isNotificationVisible).toBe(true);
    });

    it('should persist job to localStorage', () => {
      const job = createMockJob();

      slice.startIndexingJob(job, 'PostgreSQL', 'OpenAI', 'user-123');

      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  // ============================================
  // restoreIndexingJob Tests
  // ============================================
  describe('restoreIndexingJob', () => {
    it('should restore job without persisting', () => {
      const job = createMockJob();

      slice.restoreIndexingJob(job, 'PostgreSQL', 'OpenAI', 'user-123');

      expect(state.activeJobs?.['PostgreSQL']).toBeDefined();
      expect(state.isNotificationVisible).toBe(true);
    });
  });

  // ============================================
  // updateJobStatus Tests
  // ============================================
  describe('updateJobStatus', () => {
    it('should update job status for matching job', () => {
      state.activeJobs = {
        'PostgreSQL': {
          jobId: 'job-123',
          status: createMockJob(),
          vectorStore: 'PostgreSQL',
          embeddingProvider: 'OpenAI',
          userId: 'user-123',
        },
      };

      const updatedStatus = createMockJob({ processedNotes: 75, progressPercentage: 75 });
      slice.updateJobStatus(updatedStatus, 'PostgreSQL');

      expect(state.activeJobs?.['PostgreSQL'].status?.processedNotes).toBe(75);
    });

    it('should not update for non-matching job id', () => {
      state.activeJobs = {
        'PostgreSQL': {
          jobId: 'job-123',
          status: createMockJob(),
          vectorStore: 'PostgreSQL',
          embeddingProvider: 'OpenAI',
          userId: 'user-123',
        },
      };

      const wrongJob = createMockJob({ id: 'other-job' });
      slice.updateJobStatus(wrongJob, 'PostgreSQL');

      expect(state.activeJobs?.['PostgreSQL'].status?.id).toBe('job-123');
    });

    it('should remove from localStorage when completed', () => {
      // Pre-populate localStorage
      localStorageMock['indexing_active_jobs_v3'] = JSON.stringify({
        'PostgreSQL': {
          jobId: 'job-123',
          vectorStore: 'PostgreSQL',
          embeddingProvider: 'OpenAI',
          userId: 'user-123',
          startedAt: Date.now(),
        },
      });

      state.activeJobs = {
        'PostgreSQL': {
          jobId: 'job-123',
          status: createMockJob(),
          vectorStore: 'PostgreSQL',
          embeddingProvider: 'OpenAI',
          userId: 'user-123',
        },
      };

      const completedJob = createMockJob({ status: 'completed' });
      slice.updateJobStatus(completedJob, 'PostgreSQL');

      // The function should call setItem with updated jobs (removing the completed one)
      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  // ============================================
  // clearJob Tests
  // ============================================
  describe('clearJob', () => {
    it('should remove job from active jobs', () => {
      state.activeJobs = {
        'PostgreSQL': {
          jobId: 'job-123',
          status: createMockJob(),
          vectorStore: 'PostgreSQL',
          embeddingProvider: 'OpenAI',
          userId: 'user-123',
        },
      };

      slice.clearJob('PostgreSQL');

      expect(state.activeJobs?.['PostgreSQL']).toBeUndefined();
    });

    it('should hide notification if no more jobs', () => {
      state.activeJobs = {
        'PostgreSQL': {
          jobId: 'job-123',
          status: createMockJob(),
          vectorStore: 'PostgreSQL',
          embeddingProvider: 'OpenAI',
          userId: 'user-123',
        },
      };

      slice.clearJob('PostgreSQL');

      expect(state.isNotificationVisible).toBe(false);
    });
  });

  // ============================================
  // clearAllJobs Tests
  // ============================================
  describe('clearAllJobs', () => {
    it('should clear all jobs', () => {
      state.activeJobs = {
        'PostgreSQL': {
          jobId: 'job-1',
          status: createMockJob(),
          vectorStore: 'PostgreSQL',
          embeddingProvider: 'OpenAI',
          userId: 'user-123',
        },
        'Pinecone': {
          jobId: 'job-2',
          status: createMockJob({ id: 'job-2' }),
          vectorStore: 'Pinecone',
          embeddingProvider: 'OpenAI',
          userId: 'user-123',
        },
      };

      slice.clearAllJobs();

      expect(state.activeJobs).toEqual({});
      expect(state.isNotificationVisible).toBe(false);
    });
  });

  // ============================================
  // restoreActiveJobs Tests
  // ============================================
  describe('restoreActiveJobs', () => {
    it('should not restore if already restoring', async () => {
      state.isRestoring = true;

      await slice.restoreActiveJobs('user-123');

      expect(ragService.getIndexingStatus).not.toHaveBeenCalled();
    });

    it('should restore active jobs from localStorage', async () => {
      const storedJob = {
        jobId: 'job-123',
        vectorStore: 'PostgreSQL',
        embeddingProvider: 'OpenAI',
        userId: 'user-123',
        startedAt: Date.now(),
      };
      localStorageMock['indexing_active_jobs_v3'] = JSON.stringify({
        'PostgreSQL': storedJob,
      });

      vi.mocked(ragService.getIndexingStatus).mockResolvedValue(createMockJob());

      await slice.restoreActiveJobs('user-123');

      expect(state.activeJobs?.['PostgreSQL']).toBeDefined();
    });

    it('should remove old jobs from localStorage', async () => {
      const oldJob = {
        jobId: 'job-123',
        vectorStore: 'PostgreSQL',
        embeddingProvider: 'OpenAI',
        userId: 'user-123',
        startedAt: Date.now() - 20 * 60 * 1000, // 20 minutes ago
      };
      localStorageMock['indexing_active_jobs_v3'] = JSON.stringify({
        'PostgreSQL': oldJob,
      });

      await slice.restoreActiveJobs('user-123');

      expect(state.activeJobs).toEqual({});
    });
  });

  // ============================================
  // Notification Actions Tests
  // ============================================
  describe('notification actions', () => {
    it('should show notification', () => {
      slice.showNotification();

      expect(mockSet).toHaveBeenCalledWith({ isNotificationVisible: true });
    });

    it('should hide notification', () => {
      slice.hideNotification();

      expect(mockSet).toHaveBeenCalledWith({ isNotificationVisible: false });
    });
  });

  // ============================================
  // Selectors Tests
  // ============================================
  describe('selectors', () => {
    const createStateWithJobs = (): IndexingSlice => ({
      activeJobs: {
        'PostgreSQL': {
          jobId: 'job-1',
          status: createMockJob({ status: 'running', progressPercentage: 50 }),
          vectorStore: 'PostgreSQL',
          embeddingProvider: 'OpenAI',
          userId: 'user-123',
        },
        'Pinecone': {
          jobId: 'job-2',
          status: createMockJob({ id: 'job-2', status: 'completed', progressPercentage: 100 }),
          vectorStore: 'Pinecone',
          embeddingProvider: 'OpenAI',
          userId: 'user-123',
        },
      },
      isRestoring: false,
      isNotificationVisible: true,
      // Actions (mocked for selector tests)
      startIndexingJob: vi.fn(),
      restoreIndexingJob: vi.fn(),
      updateJobStatus: vi.fn(),
      clearJob: vi.fn(),
      clearAllJobs: vi.fn(),
      restoreActiveJobs: vi.fn(),
      setIsRestoring: vi.fn(),
      showNotification: vi.fn(),
      hideNotification: vi.fn(),
      clearActiveJob: vi.fn(),
    });

    it('selectActiveJobs should return all jobs', () => {
      const stateWithJobs = createStateWithJobs();
      const jobs = selectActiveJobs(stateWithJobs);

      expect(jobs).toHaveLength(2);
    });

    it('selectHasActiveJobs should return true when jobs exist', () => {
      const stateWithJobs = createStateWithJobs();
      expect(selectHasActiveJobs(stateWithJobs)).toBe(true);
    });

    it('selectIsAnyJobIndexing should return true when running job exists', () => {
      const stateWithJobs = createStateWithJobs();
      expect(selectIsAnyJobIndexing(stateWithJobs)).toBe(true);
    });

    it('selectJobByVectorStore should return correct job', () => {
      const stateWithJobs = createStateWithJobs();
      const job = selectJobByVectorStore(stateWithJobs, 'PostgreSQL');

      expect(job?.jobId).toBe('job-1');
    });

    it('selectIsIndexing should return true for running jobs', () => {
      const stateWithJobs = createStateWithJobs();
      expect(selectIsIndexing(stateWithJobs)).toBe(true);
    });

    it('selectIsIndexingComplete should return true when all jobs completed', () => {
      const stateWithJobs = createStateWithJobs();
      stateWithJobs.activeJobs['PostgreSQL'].status = createMockJob({ status: 'completed' });

      expect(selectIsIndexingComplete(stateWithJobs)).toBe(true);
    });

    it('selectIsIndexingFailed should detect failed jobs', () => {
      const stateWithJobs = createStateWithJobs();
      stateWithJobs.activeJobs['PostgreSQL'].status = createMockJob({ status: 'failed' });

      expect(selectIsIndexingFailed(stateWithJobs)).toBe(true);
    });

    it('selectIsIndexingCancelled should detect cancelled jobs', () => {
      const stateWithJobs = createStateWithJobs();
      stateWithJobs.activeJobs['PostgreSQL'].status = createMockJob({ status: 'cancelled' });

      expect(selectIsIndexingCancelled(stateWithJobs)).toBe(true);
    });

    it('selectIndexingProgress should calculate average progress', () => {
      const stateWithJobs = createStateWithJobs();
      const progress = selectIndexingProgress(stateWithJobs);

      expect(progress).toBe(75); // (50 + 100) / 2
    });

    it('selectActiveJobId should return first job id', () => {
      const stateWithJobs = createStateWithJobs();
      const jobId = selectActiveJobId(stateWithJobs);

      expect(jobId).toBeDefined();
    });

    it('selectActiveJobStatus should return first job status', () => {
      const stateWithJobs = createStateWithJobs();
      const status = selectActiveJobStatus(stateWithJobs);

      expect(status).toBeDefined();
    });

    it('selectVectorStore should return first job vector store', () => {
      const stateWithJobs = createStateWithJobs();
      const vectorStore = selectVectorStore(stateWithJobs);

      expect(['PostgreSQL', 'Pinecone']).toContain(vectorStore);
    });

    it('selectEmbeddingProvider should return first job embedding provider', () => {
      const stateWithJobs = createStateWithJobs();
      const provider = selectEmbeddingProvider(stateWithJobs);

      expect(provider).toBe('OpenAI');
    });
  });
});
