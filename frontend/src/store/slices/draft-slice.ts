/**
 * Draft Slice
 * Manages chat input drafts with IndexedDB persistence
 *
 * Features:
 * - Debounced saves using user's autoSaveInterval setting
 * - Per-conversation draft storage
 * - Automatic cleanup of old drafts
 * - IndexedDB with localStorage fallback
 */

import type { DraftSlice, SliceCreator } from '../types';
import { draftStorage, type DraftEntry } from '../../hooks/use-indexed-db';

// Special key for new/unsaved conversations
export const NEW_CHAT_DRAFT_KEY = '__new-chat__';

// Default debounce timeout (used if autoSaveInterval not available)
const DEFAULT_SAVE_DEBOUNCE_MS = 500;

// Track debounce timeouts per conversation
const debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

/**
 * Create the draft slice
 */
export const createDraftSlice: SliceCreator<DraftSlice> = (set, get) => ({
  // State
  drafts: {},
  isLoadingDraft: false,
  draftLoadError: null,

  // Actions

  /**
   * Load a draft for a specific conversation
   */
  loadDraft: async (conversationId: string): Promise<string> => {
    const key = conversationId || NEW_CHAT_DRAFT_KEY;

    // Check in-memory cache first
    const cached = get().drafts[key];
    if (cached !== undefined) {
      return cached;
    }

    set({ isLoadingDraft: true, draftLoadError: null });

    try {
      const draft = await draftStorage.load(key);
      const content = draft?.content || '';

      // Update in-memory cache
      set((state) => ({
        drafts: { ...state.drafts, [key]: content },
        isLoadingDraft: false,
      }));

      return content;
    } catch (error) {
      console.error('Failed to load draft:', { conversationId, error });
      set({
        isLoadingDraft: false,
        draftLoadError: error instanceof Error ? error.message : 'Failed to load draft',
      });
      return '';
    }
  },

  /**
   * Save a draft for a specific conversation (debounced)
   * Uses autoSaveInterval from settings for debounce timing
   */
  saveDraft: (conversationId: string, content: string): void => {
    const key = conversationId || NEW_CHAT_DRAFT_KEY;

    // Update in-memory cache immediately for responsive UI
    set((state) => ({
      drafts: { ...state.drafts, [key]: content },
    }));

    // Clear existing debounce timer
    const existingTimer = debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Get the auto-save interval from settings (or use default)
    // Note: We access state directly here since this is a synchronous action
    const state = get();
    const debounceMs = state.autoSaveInterval ?? DEFAULT_SAVE_DEBOUNCE_MS;

    // Set new debounce timer for persistence
    const timer = setTimeout(() => {
      debounceTimers.delete(key);

      // Don't persist empty drafts - just clear them
      if (!content.trim()) {
        void draftStorage.delete(key);
        return;
      }

      const draftEntry: DraftEntry = {
        conversationId: key,
        content,
        updatedAt: Date.now(),
      };

      void draftStorage.save(draftEntry);
    }, debounceMs);

    debounceTimers.set(key, timer);
  },

  /**
   * Clear a draft for a specific conversation
   */
  clearDraft: (conversationId: string): void => {
    const key = conversationId || NEW_CHAT_DRAFT_KEY;

    // Clear debounce timer
    const existingTimer = debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
      debounceTimers.delete(key);
    }

    // Update in-memory cache
    set((state) => {
      const newDrafts = { ...state.drafts };
      delete newDrafts[key];
      return { drafts: newDrafts };
    });

    // Delete from storage
    void draftStorage.delete(key);
  },

  /**
   * Get a draft synchronously from the in-memory cache
   * Returns empty string if not in cache (use loadDraft for async loading)
   */
  getDraft: (conversationId: string): string => {
    const key = conversationId || NEW_CHAT_DRAFT_KEY;
    return get().drafts[key] || '';
  },

  /**
   * Check if a draft exists for a conversation
   */
  hasDraft: (conversationId: string): boolean => {
    const key = conversationId || NEW_CHAT_DRAFT_KEY;
    const draft = get().drafts[key];
    return draft !== undefined && draft.trim().length > 0;
  },

  /**
   * Transfer draft from new chat to a created conversation
   */
  transferNewChatDraft: (newConversationId: string): void => {
    const newChatDraft = get().drafts[NEW_CHAT_DRAFT_KEY];

    if (newChatDraft?.trim()) {
      // Save to new conversation
      get().saveDraft(newConversationId, newChatDraft);
    }

    // Clear the new chat draft
    get().clearDraft(NEW_CHAT_DRAFT_KEY);
  },

  /**
   * Preload all drafts into memory
   */
  preloadDrafts: async (): Promise<void> => {
    try {
      const allDrafts = await draftStorage.getAll();
      const draftsMap: Record<string, string> = {};

      for (const draft of allDrafts) {
        draftsMap[draft.conversationId] = draft.content;
      }

      set({ drafts: draftsMap });
    } catch (error) {
      console.error('Failed to preload drafts:', { error });
    }
  },

  /**
   * Cleanup old drafts
   */
  cleanupOldDrafts: async (maxAgeDays: number = 30): Promise<number> => {
    try {
      const deletedCount = await draftStorage.cleanup(maxAgeDays);

      // Refresh in-memory cache
      await get().preloadDrafts();

      return deletedCount;
    } catch (error) {
      console.error('Failed to cleanup old drafts:', { error });
      return 0;
    }
  },

  /**
   * Flush all pending debounced saves immediately
   */
  flushPendingSaves: (): void => {
    // Clear all debounce timers and save immediately
    for (const [key, timer] of debounceTimers.entries()) {
      clearTimeout(timer);
      debounceTimers.delete(key);

      const content = get().drafts[key];
      if (content?.trim()) {
        const draftEntry: DraftEntry = {
          conversationId: key,
          content,
          updatedAt: Date.now(),
        };
        void draftStorage.save(draftEntry);
      }
    }
  },
});
