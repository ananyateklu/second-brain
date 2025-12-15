/**
 * Draft Slice Tests
 * Unit tests for draft store slice (IndexedDB persistence)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDraftSlice, NEW_CHAT_DRAFT_KEY } from '../draft-slice';
import { draftStorage } from '../../../hooks/use-indexed-db';
import type { DraftSlice, BoundStore } from '../../types';

// Mock draftStorage
vi.mock('../../../hooks/use-indexed-db', () => ({
  draftStorage: {
    load: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(),
    cleanup: vi.fn(),
  },
}));

describe('draftSlice', () => {
  let state: Partial<BoundStore>;
  let slice: DraftSlice;

  const mockSet = vi.fn((partial: Partial<BoundStore> | ((state: BoundStore) => Partial<BoundStore>)) => {
    if (typeof partial === 'function') {
      const newState = partial(state as BoundStore);
      Object.assign(state, newState);
    } else {
      Object.assign(state, partial);
    }
  });

  const mockGet = vi.fn(() => state as BoundStore);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});

    state = {
      autoSaveInterval: 500,
    };
    // @ts-expect-error - Partial store mock
    slice = createDraftSlice(mockSet, mockGet, {});
    Object.assign(state, slice);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  // ============================================
  // Initial State Tests
  // ============================================
  describe('initial state', () => {
    it('should have empty drafts', () => {
      expect(slice.drafts).toEqual({});
    });

    it('should not be loading', () => {
      expect(slice.isLoadingDraft).toBe(false);
    });

    it('should have no load error', () => {
      expect(slice.draftLoadError).toBeNull();
    });
  });

  // ============================================
  // loadDraft Tests
  // ============================================
  describe('loadDraft', () => {
    it('should return cached draft if available', async () => {
      state.drafts = { 'conv-123': 'cached content' };

      const result = await slice.loadDraft('conv-123');

      expect(result).toBe('cached content');
      expect(draftStorage.load).not.toHaveBeenCalled();
    });

    it('should load from storage if not cached', async () => {
      vi.mocked(draftStorage.load).mockResolvedValue({ conversationId: 'conv-123', content: 'stored content', updatedAt: Date.now() });

      const result = await slice.loadDraft('conv-123');

      expect(draftStorage.load).toHaveBeenCalledWith('conv-123');
      expect(result).toBe('stored content');
    });

    it('should return empty string if not in storage', async () => {
      vi.mocked(draftStorage.load).mockResolvedValue(null);

      const result = await slice.loadDraft('conv-123');

      expect(result).toBe('');
    });

    it('should use NEW_CHAT_DRAFT_KEY for empty conversationId', async () => {
      vi.mocked(draftStorage.load).mockResolvedValue(null);

      await slice.loadDraft('');

      expect(draftStorage.load).toHaveBeenCalledWith(NEW_CHAT_DRAFT_KEY);
    });

    it('should set isLoading while loading', async () => {
      vi.mocked(draftStorage.load).mockResolvedValue(null);

      const promise = slice.loadDraft('conv-123');

      expect(mockSet).toHaveBeenCalledWith({ isLoadingDraft: true, draftLoadError: null });

      await promise;
    });

    it('should handle load errors', async () => {
      vi.mocked(draftStorage.load).mockRejectedValue(new Error('Storage error'));

      const result = await slice.loadDraft('conv-123');

      expect(result).toBe('');
      expect(mockSet).toHaveBeenCalledWith({
        isLoadingDraft: false,
        draftLoadError: 'Storage error',
      });
    });
  });

  // ============================================
  // saveDraft Tests
  // ============================================
  describe('saveDraft', () => {
    it('should update in-memory cache immediately', () => {
      slice.saveDraft('conv-123', 'new content');

      expect(state.drafts?.['conv-123']).toBe('new content');
    });

    it('should debounce save to storage', async () => {
      slice.saveDraft('conv-123', 'content');

      expect(draftStorage.save).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(500);

      expect(draftStorage.save).toHaveBeenCalled();
    });

    it('should delete empty drafts instead of saving', async () => {
      slice.saveDraft('conv-123', '   ');

      await vi.advanceTimersByTimeAsync(500);

      expect(draftStorage.delete).toHaveBeenCalledWith('conv-123');
      expect(draftStorage.save).not.toHaveBeenCalled();
    });

    it('should use NEW_CHAT_DRAFT_KEY for empty conversationId', () => {
      slice.saveDraft('', 'new chat content');

      expect(state.drafts?.[NEW_CHAT_DRAFT_KEY]).toBe('new chat content');
    });

    it('should debounce multiple saves', async () => {
      slice.saveDraft('conv-123', 'content 1');
      await vi.advanceTimersByTimeAsync(200);

      slice.saveDraft('conv-123', 'content 2');
      await vi.advanceTimersByTimeAsync(200);

      slice.saveDraft('conv-123', 'content 3');
      await vi.advanceTimersByTimeAsync(500);

      // Should only save once with the last content
      expect(draftStorage.save).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================
  // clearDraft Tests
  // ============================================
  describe('clearDraft', () => {
    it('should remove draft from in-memory cache', () => {
      state.drafts = { 'conv-123': 'content' };

      slice.clearDraft('conv-123');

      expect(state.drafts?.['conv-123']).toBeUndefined();
    });

    it('should delete from storage', () => {
      slice.clearDraft('conv-123');

      expect(draftStorage.delete).toHaveBeenCalledWith('conv-123');
    });

    it('should cancel pending debounce timer', async () => {
      slice.saveDraft('conv-123', 'content');
      slice.clearDraft('conv-123');

      await vi.advanceTimersByTimeAsync(500);

      expect(draftStorage.save).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // getDraft Tests
  // ============================================
  describe('getDraft', () => {
    it('should return draft from cache', () => {
      state.drafts = { 'conv-123': 'cached content' };

      const result = slice.getDraft('conv-123');

      expect(result).toBe('cached content');
    });

    it('should return empty string if not cached', () => {
      const result = slice.getDraft('conv-123');

      expect(result).toBe('');
    });

    it('should use NEW_CHAT_DRAFT_KEY for empty conversationId', () => {
      state.drafts = { [NEW_CHAT_DRAFT_KEY]: 'new chat content' };

      const result = slice.getDraft('');

      expect(result).toBe('new chat content');
    });
  });

  // ============================================
  // hasDraft Tests
  // ============================================
  describe('hasDraft', () => {
    it('should return true for non-empty draft', () => {
      state.drafts = { 'conv-123': 'content' };

      expect(slice.hasDraft('conv-123')).toBe(true);
    });

    it('should return false for empty draft', () => {
      state.drafts = { 'conv-123': '' };

      expect(slice.hasDraft('conv-123')).toBe(false);
    });

    it('should return false for whitespace-only draft', () => {
      state.drafts = { 'conv-123': '   ' };

      expect(slice.hasDraft('conv-123')).toBe(false);
    });

    it('should return false for non-existent draft', () => {
      expect(slice.hasDraft('conv-123')).toBe(false);
    });
  });

  // ============================================
  // transferNewChatDraft Tests
  // ============================================
  describe('transferNewChatDraft', () => {
    it('should transfer draft to new conversation', () => {
      state.drafts = { [NEW_CHAT_DRAFT_KEY]: 'new chat content' };
      state.saveDraft = vi.fn();
      state.clearDraft = vi.fn();

      slice.transferNewChatDraft('new-conv-123');

      expect(state.saveDraft).toHaveBeenCalledWith('new-conv-123', 'new chat content');
      expect(state.clearDraft).toHaveBeenCalledWith(NEW_CHAT_DRAFT_KEY);
    });

    it('should not transfer empty draft', () => {
      state.drafts = { [NEW_CHAT_DRAFT_KEY]: '   ' };
      state.saveDraft = vi.fn();
      state.clearDraft = vi.fn();

      slice.transferNewChatDraft('new-conv-123');

      expect(state.saveDraft).not.toHaveBeenCalled();
      expect(state.clearDraft).toHaveBeenCalledWith(NEW_CHAT_DRAFT_KEY);
    });
  });

  // ============================================
  // preloadDrafts Tests
  // ============================================
  describe('preloadDrafts', () => {
    it('should load all drafts into memory', async () => {
      vi.mocked(draftStorage.getAll).mockResolvedValue([
        { conversationId: 'conv-1', content: 'content 1', updatedAt: Date.now() },
        { conversationId: 'conv-2', content: 'content 2', updatedAt: Date.now() },
      ]);

      await slice.preloadDrafts();

      expect(mockSet).toHaveBeenCalledWith({
        drafts: {
          'conv-1': 'content 1',
          'conv-2': 'content 2',
        },
      });
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(draftStorage.getAll).mockRejectedValue(new Error('Storage error'));

      await expect(slice.preloadDrafts()).resolves.toBeUndefined();
      expect(console.error).toHaveBeenCalled();
    });
  });

  // ============================================
  // cleanupOldDrafts Tests
  // ============================================
  describe('cleanupOldDrafts', () => {
    it('should cleanup old drafts and return count', async () => {
      vi.mocked(draftStorage.cleanup).mockResolvedValue(5);
      vi.mocked(draftStorage.getAll).mockResolvedValue([]);

      const count = await slice.cleanupOldDrafts(30);

      expect(draftStorage.cleanup).toHaveBeenCalledWith(30);
      expect(count).toBe(5);
    });

    it('should use default max age', async () => {
      vi.mocked(draftStorage.cleanup).mockResolvedValue(0);
      vi.mocked(draftStorage.getAll).mockResolvedValue([]);

      await slice.cleanupOldDrafts();

      expect(draftStorage.cleanup).toHaveBeenCalledWith(30);
    });

    it('should handle errors and return 0', async () => {
      vi.mocked(draftStorage.cleanup).mockRejectedValue(new Error('Storage error'));

      const count = await slice.cleanupOldDrafts();

      expect(count).toBe(0);
    });
  });

  // ============================================
  // flushPendingSaves Tests
  // ============================================
  describe('flushPendingSaves', () => {
    it('should save all pending drafts immediately', () => {
      // Save drafts without waiting for debounce
      slice.saveDraft('conv-1', 'content 1');
      slice.saveDraft('conv-2', 'content 2');

      // Flush without waiting
      slice.flushPendingSaves();

      // Should save immediately without waiting for timers
      expect(draftStorage.save).toHaveBeenCalledTimes(2);
    });

    it('should not save empty drafts', () => {
      slice.saveDraft('conv-1', 'content');
      slice.saveDraft('conv-2', '');
      state.drafts = { 'conv-1': 'content', 'conv-2': '' };

      slice.flushPendingSaves();

      expect(draftStorage.save).toHaveBeenCalledTimes(1);
    });
  });
});
