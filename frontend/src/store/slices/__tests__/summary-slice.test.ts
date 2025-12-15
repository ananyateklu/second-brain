/**
 * Summary Slice Tests
 * Unit tests for summary generation store slice
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createSummarySlice,
  getStoredSummaryJob,
  selectActiveSummaryJob,
  selectHasActiveSummaryJob,
  selectIsSummaryJobRunning,
  selectSummaryJobProgress,
  selectSummaryJobStatus,
} from '../summary-slice';
import type { SummarySlice, SummaryJobResponse } from '../summary-slice';
import type { BoundStore } from '../../types';

describe('summarySlice', () => {
  let state: Partial<BoundStore>;
  let slice: SummarySlice;
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

  const createMockJob = (overrides: Partial<SummaryJobResponse> = {}): SummaryJobResponse => ({
    id: 'job-123',
    status: 'running',
    totalNotes: 100,
    processedNotes: 50,
    successCount: 45,
    failureCount: 5,
    skippedCount: 0,
    errors: [],
    startedAt: '2024-01-15T10:00:00Z',
    completedAt: null,
    createdAt: '2024-01-15T10:00:00Z',
    progressPercentage: 50,
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
    slice = createSummarySlice(mockSet, mockGet, {});
    Object.assign(state, slice);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================
  // Initial State Tests
  // ============================================
  describe('initial state', () => {
    it('should have null active job', () => {
      expect(slice.activeJob).toBeNull();
    });

    it('should not be restoring', () => {
      expect(slice.isRestoring).toBe(false);
    });

    it('should have notification hidden', () => {
      expect(slice.isNotificationVisible).toBe(false);
    });
  });

  // ============================================
  // startSummaryJob Tests
  // ============================================
  describe('startSummaryJob', () => {
    it('should set active job', () => {
      const job = createMockJob();

      slice.startSummaryJob(job, 'user-123');

      expect(mockSet).toHaveBeenCalledWith({
        activeJob: {
          jobId: 'job-123',
          status: job,
          userId: 'user-123',
        },
        isNotificationVisible: true,
      });
    });

    it('should persist job to localStorage', () => {
      const job = createMockJob();

      slice.startSummaryJob(job, 'user-123');

      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  // ============================================
  // restoreSummaryJob Tests
  // ============================================
  describe('restoreSummaryJob', () => {
    it('should restore job without persisting', () => {
      const job = createMockJob();

      slice.restoreSummaryJob(job, 'user-123');

      expect(mockSet).toHaveBeenCalledWith({
        activeJob: {
          jobId: 'job-123',
          status: job,
          userId: 'user-123',
        },
        isNotificationVisible: true,
      });
    });
  });

  // ============================================
  // updateSummaryJobStatus Tests
  // ============================================
  describe('updateSummaryJobStatus', () => {
    it('should update job status for matching job', () => {
      state.activeJob = {
        jobId: 'job-123',
        status: createMockJob(),
        userId: 'user-123',
      };

      const updatedStatus = createMockJob({ processedNotes: 75, progressPercentage: 75 });
      slice.updateSummaryJobStatus(updatedStatus);

      expect(mockSet).toHaveBeenCalledWith({
        activeJob: {
          jobId: 'job-123',
          status: updatedStatus,
          userId: 'user-123',
        },
      });
    });

    it('should not update for non-matching job id', () => {
      state.activeJob = {
        jobId: 'job-123',
        status: createMockJob(),
        userId: 'user-123',
      };

      const wrongJob = createMockJob({ id: 'other-job' });
      slice.updateSummaryJobStatus(wrongJob);

      // Should not have been called with status update
      expect(mockSet).not.toHaveBeenCalled();
    });

    it('should clear from localStorage when completed', () => {
      state.activeJob = {
        jobId: 'job-123',
        status: createMockJob(),
        userId: 'user-123',
      };

      const completedJob = createMockJob({ status: 'completed' });
      slice.updateSummaryJobStatus(completedJob);

      expect(localStorage.removeItem).toHaveBeenCalled();
    });

    it('should clear from localStorage when failed', () => {
      state.activeJob = {
        jobId: 'job-123',
        status: createMockJob(),
        userId: 'user-123',
      };

      const failedJob = createMockJob({ status: 'failed' });
      slice.updateSummaryJobStatus(failedJob);

      expect(localStorage.removeItem).toHaveBeenCalled();
    });
  });

  // ============================================
  // clearSummaryJob Tests
  // ============================================
  describe('clearSummaryJob', () => {
    it('should clear active job', () => {
      state.activeJob = {
        jobId: 'job-123',
        status: createMockJob(),
        userId: 'user-123',
      };

      slice.clearSummaryJob();

      expect(mockSet).toHaveBeenCalledWith({
        activeJob: null,
        isNotificationVisible: false,
      });
    });

    it('should clear from localStorage', () => {
      slice.clearSummaryJob();

      expect(localStorage.removeItem).toHaveBeenCalled();
    });
  });

  // ============================================
  // restoreActiveSummaryJob Tests
  // ============================================
  describe('restoreActiveSummaryJob', () => {
    it('should not restore if already restoring', async () => {
      state.isRestoring = true;

      await slice.restoreActiveSummaryJob('user-123');

      expect(mockSet).not.toHaveBeenCalled();
    });

    it('should set isRestoring to true while restoring', async () => {
      await slice.restoreActiveSummaryJob('user-123');

      expect(mockSet).toHaveBeenCalledWith({ isRestoring: true });
    });

    it('should not restore if no stored job', async () => {
      await slice.restoreActiveSummaryJob('user-123');

      expect(mockSet).toHaveBeenCalledWith({ isRestoring: false });
    });

    it('should not restore old jobs', async () => {
      const oldJob = {
        jobId: 'job-123',
        userId: 'user-123',
        startedAt: Date.now() - 20 * 60 * 1000, // 20 minutes ago
      };
      localStorageMock['summary_active_job_v1'] = JSON.stringify(oldJob);

      await slice.restoreActiveSummaryJob('user-123');

      expect(localStorage.removeItem).toHaveBeenCalled();
    });

    it('should not restore jobs for different user', async () => {
      const storedJob = {
        jobId: 'job-123',
        userId: 'other-user',
        startedAt: Date.now(),
      };
      localStorageMock['summary_active_job_v1'] = JSON.stringify(storedJob);

      await slice.restoreActiveSummaryJob('user-123');

      expect(localStorage.removeItem).toHaveBeenCalled();
    });

    it('should restore running job from backend', async () => {
      // Store a valid job
      const storedJob = {
        jobId: 'job-123',
        userId: 'user-123',
        startedAt: Date.now(),
      };
      localStorageMock['summary_active_job_v1'] = JSON.stringify(storedJob);

      // Mock the dynamic import
      const mockGetSummaryJobStatus = vi.fn().mockResolvedValue(createMockJob({ status: 'running' }));
      vi.doMock('../../../services', () => ({
        notesService: {
          getSummaryJobStatus: mockGetSummaryJobStatus,
        },
      }));

      // We need to re-create the slice after mocking
      const { createSummarySlice: freshCreateSlice } = await import('../summary-slice');
      // @ts-expect-error - Partial store mock
      const freshSlice = freshCreateSlice(mockSet, mockGet, {});

      await freshSlice.restoreActiveSummaryJob('user-123');

      // Should have set the active job
      expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
        isNotificationVisible: true,
        isRestoring: false,
      }));
    });

    it('should clear completed job during restore', async () => {
      // Store a valid job
      const storedJob = {
        jobId: 'job-123',
        userId: 'user-123',
        startedAt: Date.now(),
      };
      localStorageMock['summary_active_job_v1'] = JSON.stringify(storedJob);

      // Mock the dynamic import to return completed job
      const mockGetSummaryJobStatus = vi.fn().mockResolvedValue(createMockJob({ status: 'completed' }));
      vi.doMock('../../../services', () => ({
        notesService: {
          getSummaryJobStatus: mockGetSummaryJobStatus,
        },
      }));

      // Re-create slice after mocking
      const { createSummarySlice: freshCreateSlice } = await import('../summary-slice');
      // @ts-expect-error - Partial store mock
      const freshSlice = freshCreateSlice(mockSet, mockGet, {});

      await freshSlice.restoreActiveSummaryJob('user-123');

      // Should clear the job
      expect(localStorage.removeItem).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith({ isRestoring: false });
    });

    it('should handle backend fetch error during restore', async () => {
      // Store a valid job
      const storedJob = {
        jobId: 'job-123',
        userId: 'user-123',
        startedAt: Date.now(),
      };
      localStorageMock['summary_active_job_v1'] = JSON.stringify(storedJob);

      // Mock the dynamic import to throw error
      const mockGetSummaryJobStatus = vi.fn().mockRejectedValue(new Error('Network error'));
      vi.doMock('../../../services', () => ({
        notesService: {
          getSummaryJobStatus: mockGetSummaryJobStatus,
        },
      }));

      // Re-create slice after mocking
      const { createSummarySlice: freshCreateSlice } = await import('../summary-slice');
      // @ts-expect-error - Partial store mock
      const freshSlice = freshCreateSlice(mockSet, mockGet, {});

      await freshSlice.restoreActiveSummaryJob('user-123');

      // Should clean up on error
      expect(localStorage.removeItem).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith({ isRestoring: false });
    });

    it('should restore pending job from backend', async () => {
      // Store a valid job
      const storedJob = {
        jobId: 'job-123',
        userId: 'user-123',
        startedAt: Date.now(),
      };
      localStorageMock['summary_active_job_v1'] = JSON.stringify(storedJob);

      // Mock the dynamic import
      const mockGetSummaryJobStatus = vi.fn().mockResolvedValue(createMockJob({ status: 'pending' }));
      vi.doMock('../../../services', () => ({
        notesService: {
          getSummaryJobStatus: mockGetSummaryJobStatus,
        },
      }));

      // Re-create slice after mocking
      const { createSummarySlice: freshCreateSlice } = await import('../summary-slice');
      // @ts-expect-error - Partial store mock
      const freshSlice = freshCreateSlice(mockSet, mockGet, {});

      await freshSlice.restoreActiveSummaryJob('user-123');

      // Should have set the active job
      expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
        isNotificationVisible: true,
        isRestoring: false,
      }));
    });

    it('should clear failed job during restore', async () => {
      // Store a valid job
      const storedJob = {
        jobId: 'job-123',
        userId: 'user-123',
        startedAt: Date.now(),
      };
      localStorageMock['summary_active_job_v1'] = JSON.stringify(storedJob);

      // Mock the dynamic import to return failed job
      const mockGetSummaryJobStatus = vi.fn().mockResolvedValue(createMockJob({ status: 'failed' }));
      vi.doMock('../../../services', () => ({
        notesService: {
          getSummaryJobStatus: mockGetSummaryJobStatus,
        },
      }));

      // Re-create slice after mocking
      const { createSummarySlice: freshCreateSlice } = await import('../summary-slice');
      // @ts-expect-error - Partial store mock
      const freshSlice = freshCreateSlice(mockSet, mockGet, {});

      await freshSlice.restoreActiveSummaryJob('user-123');

      // Should clear the job
      expect(localStorage.removeItem).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith({ isRestoring: false });
    });
  });

  // ============================================
  // Notification Actions Tests
  // ============================================
  describe('notification actions', () => {
    it('should show notification', () => {
      slice.showSummaryNotification();

      expect(mockSet).toHaveBeenCalledWith({ isNotificationVisible: true });
    });

    it('should hide notification', () => {
      slice.hideSummaryNotification();

      expect(mockSet).toHaveBeenCalledWith({ isNotificationVisible: false });
    });
  });

  // ============================================
  // setIsSummaryRestoring Tests
  // ============================================
  describe('setIsSummaryRestoring', () => {
    it('should set isRestoring', () => {
      slice.setIsSummaryRestoring(true);

      expect(mockSet).toHaveBeenCalledWith({ isRestoring: true });
    });
  });

  // ============================================
  // Helper Functions Tests
  // ============================================
  describe('getStoredSummaryJob', () => {
    it('should return stored job', () => {
      const storedJob = {
        jobId: 'job-123',
        userId: 'user-123',
        startedAt: Date.now(),
      };
      localStorageMock['summary_active_job_v1'] = JSON.stringify(storedJob);

      const result = getStoredSummaryJob();

      expect(result).toEqual(storedJob);
    });

    it('should return null if nothing stored', () => {
      const result = getStoredSummaryJob();

      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      localStorageMock['summary_active_job_v1'] = 'invalid json';

      const result = getStoredSummaryJob();

      expect(result).toBeNull();
    });
  });

  // ============================================
  // Selectors Tests
  // ============================================
  describe('selectors', () => {
    const createStateWithJob = (): SummarySlice => ({
      activeJob: {
        jobId: 'job-123',
        status: createMockJob({ status: 'running', progressPercentage: 50 }),
        userId: 'user-123',
      },
      isRestoring: false,
      isNotificationVisible: true,
      startSummaryJob: vi.fn(),
      restoreSummaryJob: vi.fn(),
      updateSummaryJobStatus: vi.fn(),
      clearSummaryJob: vi.fn(),
      restoreActiveSummaryJob: vi.fn(),
      setIsSummaryRestoring: vi.fn(),
      showSummaryNotification: vi.fn(),
      hideSummaryNotification: vi.fn(),
    });

    it('selectActiveSummaryJob should return active job', () => {
      const stateWithJob = createStateWithJob();
      const job = selectActiveSummaryJob(stateWithJob);

      expect(job?.jobId).toBe('job-123');
    });

    it('selectHasActiveSummaryJob should return true when job exists', () => {
      const stateWithJob = createStateWithJob();
      expect(selectHasActiveSummaryJob(stateWithJob)).toBe(true);
    });

    it('selectHasActiveSummaryJob should return false when no job', () => {
      const emptyState = createStateWithJob();
      emptyState.activeJob = null;
      expect(selectHasActiveSummaryJob(emptyState)).toBe(false);
    });

    it('selectIsSummaryJobRunning should return true for running job', () => {
      const stateWithJob = createStateWithJob();
      expect(selectIsSummaryJobRunning(stateWithJob)).toBe(true);
    });

    it('selectIsSummaryJobRunning should return true for pending job', () => {
      const stateWithJob = createStateWithJob();
      if (stateWithJob.activeJob?.status) {
        stateWithJob.activeJob.status.status = 'pending';
      }
      expect(selectIsSummaryJobRunning(stateWithJob)).toBe(true);
    });

    it('selectIsSummaryJobRunning should return false for completed job', () => {
      const stateWithJob = createStateWithJob();
      if (stateWithJob.activeJob?.status) {
        stateWithJob.activeJob.status.status = 'completed';
      }
      expect(selectIsSummaryJobRunning(stateWithJob)).toBe(false);
    });

    it('selectSummaryJobProgress should return progress percentage', () => {
      const stateWithJob = createStateWithJob();
      const progress = selectSummaryJobProgress(stateWithJob);

      expect(progress).toBe(50);
    });

    it('selectSummaryJobProgress should return 0 when no job', () => {
      const emptyState = createStateWithJob();
      emptyState.activeJob = null;
      expect(selectSummaryJobProgress(emptyState)).toBe(0);
    });

    it('selectSummaryJobStatus should return job status', () => {
      const stateWithJob = createStateWithJob();
      const status = selectSummaryJobStatus(stateWithJob);

      expect(status).toBe('running');
    });

    it('selectSummaryJobStatus should return null when no job', () => {
      const emptyState = createStateWithJob();
      emptyState.activeJob = null;
      expect(selectSummaryJobStatus(emptyState)).toBeNull();
    });
  });
});
