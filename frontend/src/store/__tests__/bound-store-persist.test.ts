/**
 * Bound Store Persist Tests
 * Tests for the persist middleware configuration (partialize and merge functions)
 *
 * This file tests the validatePersistedState and mergePersistedState functions
 * that are used by the persist middleware in bound-store.ts.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the store registry to prevent registration errors
vi.mock('../store-registry', () => ({
  registerStore: vi.fn(),
}));

// Mock all slice creators to avoid importing the full store dependencies
vi.mock('../slices/auth-slice', () => ({ createAuthSlice: vi.fn(() => ({})) }));
vi.mock('../slices/settings-slice', () => ({ createSettingsSlice: vi.fn(() => ({})) }));
vi.mock('../slices/ui-slice', () => ({ createUISlice: vi.fn(() => ({})) }));
vi.mock('../slices/theme-slice', () => ({ createThemeSlice: vi.fn(() => ({})) }));
vi.mock('../slices/ollama-slice', () => ({ createOllamaSlice: vi.fn(() => ({})) }));
vi.mock('../slices/notes-slice', () => ({ createNotesSlice: vi.fn(() => ({})) }));
vi.mock('../slices/rag-analytics-slice', () => ({ createRagAnalyticsSlice: vi.fn(() => ({})) }));
vi.mock('../slices/indexing-slice', () => ({ createIndexingSlice: vi.fn(() => ({})) }));
vi.mock('../slices/summary-slice', () => ({ createSummarySlice: vi.fn(() => ({})) }));
vi.mock('../slices/draft-slice', () => ({ createDraftSlice: vi.fn(() => ({})) }));
vi.mock('../slices/git-slice', () => ({ createGitSlice: vi.fn(() => ({})) }));

// Mock zustand persist to prevent actual store creation with localStorage
vi.mock('zustand/middleware', () => ({
  persist: vi.fn((config) => config),
}));

// Import the actual functions after mocks are set up
import { validatePersistedState, mergePersistedState } from '../bound-store';
import type { BoundStore, NoteView, FontSize, Theme } from '../types';

describe('bound-store persist functions', () => {
  // Create a minimal mock current state for merge tests
  // Using type assertion since we only need specific properties for testing
  const createMockCurrentState = () => ({
    // Auth state
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    signOut: vi.fn(),
    setUser: vi.fn(),
    setToken: vi.fn(),
    clearError: vi.fn(),
    setError: vi.fn(),
    setLoading: vi.fn(),

    // Settings state
    chatProvider: 'OpenAI',
    chatModel: 'gpt-4',
    vectorStoreProvider: 'PostgreSQL',
    rerankingProvider: 'OpenAI',
    defaultNoteView: 'grid',
    itemsPerPage: 20,
    fontSize: 'medium',
    enableNotifications: true,
    ollamaRemoteUrl: '',
    useRemoteOllama: false,
    autoSaveInterval: 30,
    noteSummaryEnabled: true,
    noteSummaryProvider: 'OpenAI',
    noteSummaryModel: 'gpt-4',
    ragEnableHyde: true,
    ragEnableQueryExpansion: true,
    ragEnableHybridSearch: true,
    ragEnableReranking: true,
    ragEnableAnalytics: true,
    setChatProvider: vi.fn(),
    setChatModel: vi.fn(),
    setVectorStoreProvider: vi.fn(),
    setRerankingProvider: vi.fn(),
    setDefaultNoteView: vi.fn(),
    setItemsPerPage: vi.fn(),
    setFontSize: vi.fn(),
    setEnableNotifications: vi.fn(),
    setOllamaRemoteUrl: vi.fn(),
    setUseRemoteOllama: vi.fn(),
    setAutoSaveInterval: vi.fn(),
    setNoteSummaryEnabled: vi.fn(),
    setNoteSummaryProvider: vi.fn(),
    setNoteSummaryModel: vi.fn(),
    setRagEnableHyde: vi.fn(),
    setRagEnableQueryExpansion: vi.fn(),
    setRagEnableHybridSearch: vi.fn(),
    setRagEnableReranking: vi.fn(),
    setRagEnableAnalytics: vi.fn(),
    loadPreferencesFromBackend: vi.fn(),
    syncPreferencesToBackend: vi.fn(),
    resetSettings: vi.fn(),

    // Theme state
    theme: 'dark',
    setTheme: vi.fn(),
    applyTheme: vi.fn(),

    // UI state
    isLeftSidebarCollapsed: false,
    isRightPanelCollapsed: true,
    toggleLeftSidebar: vi.fn(),
    toggleRightPanel: vi.fn(),
    setLeftSidebarCollapsed: vi.fn(),
    setRightPanelCollapsed: vi.fn(),

    // Notes state
    selectedNoteIds: [],
    isBulkMode: false,
    filterState: {
      dateFilter: 'all',
      selectedTags: [],
      sortBy: 'newest',
      archiveFilter: 'all',
    },
    setSelectedNoteIds: vi.fn(),
    toggleBulkMode: vi.fn(),
    setFilterState: vi.fn(),
    clearFilters: vi.fn(),

    // Ollama state
    ollamaModels: [],
    ollamaLoading: false,
    ollamaError: null,
    fetchOllamaModels: vi.fn(),
    pullOllamaModel: vi.fn(),

    // RAG Analytics state
    activeTab: 'performance',
    selectedTimeRange: 30,
    setActiveTab: vi.fn(),
    setSelectedTimeRange: vi.fn(),

    // Indexing state
    isIndexing: false,
    indexingProgress: null,
    indexingError: null,
    startIndexing: vi.fn(),
    setIndexingProgress: vi.fn(),
    setIndexingError: vi.fn(),
    clearIndexingState: vi.fn(),

    // Summary state
    summaryGenerating: {},
    summaryErrors: {},
    setSummaryGenerating: vi.fn(),
    setSummaryError: vi.fn(),
    clearSummaryState: vi.fn(),

    // Draft state
    drafts: {},
    setDraft: vi.fn(),
    getDraft: vi.fn(),
    clearDraft: vi.fn(),
    clearAllDrafts: vi.fn(),

    // Git state
    repositoryPath: null,
    currentBranch: null,
    branches: [],
    gitLoading: false,
    gitError: null,
    setRepositoryPath: vi.fn(),
    setCurrentBranch: vi.fn(),
    setBranches: vi.fn(),
    setGitLoading: vi.fn(),
    setGitError: vi.fn(),
    clearGitState: vi.fn(),
  }) as unknown as BoundStore;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // validatePersistedState Tests
  // ============================================
  describe('validatePersistedState', () => {
    // NoteView validation
    describe('NoteView validation', () => {
      it('should accept valid NoteView "list"', () => {
        expect(() => validatePersistedState({ defaultNoteView: 'list' })).not.toThrow();
      });

      it('should accept valid NoteView "grid"', () => {
        expect(() => validatePersistedState({ defaultNoteView: 'grid' })).not.toThrow();
      });

      it('should throw for invalid NoteView', () => {
        expect(() => validatePersistedState({ defaultNoteView: 'invalid' as NoteView }))
          .toThrow('Invalid persisted defaultNoteView: invalid');
      });

      it('should accept undefined NoteView', () => {
        expect(() => validatePersistedState({ defaultNoteView: undefined })).not.toThrow();
      });
    });

    // FontSize validation
    describe('FontSize validation', () => {
      it('should accept valid FontSize "small"', () => {
        expect(() => validatePersistedState({ fontSize: 'small' })).not.toThrow();
      });

      it('should accept valid FontSize "medium"', () => {
        expect(() => validatePersistedState({ fontSize: 'medium' })).not.toThrow();
      });

      it('should accept valid FontSize "large"', () => {
        expect(() => validatePersistedState({ fontSize: 'large' })).not.toThrow();
      });

      it('should throw for invalid FontSize', () => {
        expect(() => validatePersistedState({ fontSize: 'extra-large' as FontSize }))
          .toThrow('Invalid persisted fontSize: extra-large');
      });
    });

    // VectorStoreProvider validation
    describe('VectorStoreProvider validation', () => {
      it('should accept valid VectorStoreProvider "PostgreSQL"', () => {
        expect(() => validatePersistedState({ vectorStoreProvider: 'PostgreSQL' })).not.toThrow();
      });

      it('should accept valid VectorStoreProvider "Pinecone"', () => {
        expect(() => validatePersistedState({ vectorStoreProvider: 'Pinecone' })).not.toThrow();
      });

      it('should throw for invalid VectorStoreProvider', () => {
        expect(() => validatePersistedState({ vectorStoreProvider: 'Redis' as 'PostgreSQL' | 'Pinecone' }))
          .toThrow('Invalid persisted vectorStoreProvider: Redis');
      });
    });

    // Theme validation
    describe('Theme validation', () => {
      it('should accept valid Theme "light"', () => {
        expect(() => validatePersistedState({ theme: 'light' })).not.toThrow();
      });

      it('should accept valid Theme "dark"', () => {
        expect(() => validatePersistedState({ theme: 'dark' })).not.toThrow();
      });

      it('should accept valid Theme "blue"', () => {
        expect(() => validatePersistedState({ theme: 'blue' })).not.toThrow();
      });

      it('should throw for invalid Theme', () => {
        expect(() => validatePersistedState({ theme: 'green' as Theme }))
          .toThrow('Invalid persisted theme: green');
      });
    });

    // Numeric type validation
    describe('numeric type validation', () => {
      it('should accept valid itemsPerPage number', () => {
        expect(() => validatePersistedState({ itemsPerPage: 20 })).not.toThrow();
      });

      it('should throw for non-number itemsPerPage', () => {
        expect(() => validatePersistedState({ itemsPerPage: '20' as unknown as number }))
          .toThrow('Invalid persisted itemsPerPage type: string');
      });

      it('should accept valid autoSaveInterval number', () => {
        expect(() => validatePersistedState({ autoSaveInterval: 30 })).not.toThrow();
      });

      it('should throw for non-number autoSaveInterval', () => {
        expect(() => validatePersistedState({ autoSaveInterval: '30' as unknown as number }))
          .toThrow('Invalid persisted autoSaveInterval type: string');
      });
    });

    // Boolean type validation
    describe('boolean type validation', () => {
      it('should accept valid boolean enableNotifications', () => {
        expect(() => validatePersistedState({ enableNotifications: true })).not.toThrow();
        expect(() => validatePersistedState({ enableNotifications: false })).not.toThrow();
      });

      it('should throw for non-boolean enableNotifications', () => {
        expect(() => validatePersistedState({ enableNotifications: 'true' as unknown as boolean }))
          .toThrow('Invalid persisted enableNotifications type: string');
      });

      it('should throw for non-boolean useRemoteOllama', () => {
        expect(() => validatePersistedState({ useRemoteOllama: 1 as unknown as boolean }))
          .toThrow('Invalid persisted useRemoteOllama type: number');
      });

      it('should throw for non-boolean noteSummaryEnabled', () => {
        expect(() => validatePersistedState({ noteSummaryEnabled: 'false' as unknown as boolean }))
          .toThrow('Invalid persisted noteSummaryEnabled type: string');
      });

      it('should validate all RAG boolean fields', () => {
        expect(() => validatePersistedState({
          ragEnableHyde: true,
          ragEnableQueryExpansion: false,
          ragEnableHybridSearch: true,
          ragEnableReranking: false,
          ragEnableAnalytics: true,
        })).not.toThrow();
      });

      it('should throw for invalid ragEnableHyde type', () => {
        expect(() => validatePersistedState({ ragEnableHyde: 'yes' as unknown as boolean }))
          .toThrow('Invalid persisted ragEnableHyde type: string');
      });

      it('should throw for invalid ragEnableQueryExpansion type', () => {
        expect(() => validatePersistedState({ ragEnableQueryExpansion: null as unknown as boolean }))
          .toThrow('Invalid persisted ragEnableQueryExpansion type: object');
      });

      it('should throw for invalid ragEnableHybridSearch type', () => {
        expect(() => validatePersistedState({ ragEnableHybridSearch: [] as unknown as boolean }))
          .toThrow('Invalid persisted ragEnableHybridSearch type: object');
      });

      it('should throw for invalid ragEnableReranking type', () => {
        expect(() => validatePersistedState({ ragEnableReranking: {} as unknown as boolean }))
          .toThrow('Invalid persisted ragEnableReranking type: object');
      });

      it('should throw for invalid ragEnableAnalytics type', () => {
        expect(() => validatePersistedState({ ragEnableAnalytics: 0 as unknown as boolean }))
          .toThrow('Invalid persisted ragEnableAnalytics type: number');
      });
    });

    // Undefined state handling
    describe('undefined state handling', () => {
      it('should handle undefined persisted state', () => {
        expect(() => validatePersistedState(undefined)).not.toThrow();
      });

      it('should handle empty object', () => {
        expect(() => validatePersistedState({})).not.toThrow();
      });
    });

    // Combined validation
    describe('combined validation', () => {
      it('should validate all valid fields together', () => {
        expect(() => validatePersistedState({
          defaultNoteView: 'grid',
          fontSize: 'large',
          vectorStoreProvider: 'Pinecone',
          theme: 'blue',
          itemsPerPage: 50,
          autoSaveInterval: 60,
          enableNotifications: false,
          useRemoteOllama: true,
          noteSummaryEnabled: true,
          ragEnableHyde: false,
          ragEnableQueryExpansion: true,
          ragEnableHybridSearch: true,
          ragEnableReranking: false,
          ragEnableAnalytics: true,
        })).not.toThrow();
      });
    });
  });

  // ============================================
  // mergePersistedState Tests
  // ============================================
  describe('mergePersistedState', () => {
    it('should return current state when persisted is undefined', () => {
      const currentState = createMockCurrentState();
      const result = mergePersistedState(undefined, currentState);
      expect(result).toBe(currentState);
    });

    it('should merge auth state', () => {
      const currentState = createMockCurrentState();
      const result = mergePersistedState({
        user: { userId: '123', email: 'test@example.com', displayName: 'Test' },
        token: 'test-token',
        isAuthenticated: true,
      }, currentState);

      expect(result.user?.userId).toBe('123');
      expect(result.token).toBe('test-token');
      expect(result.isAuthenticated).toBe(true);
    });

    it('should merge settings state', () => {
      const currentState = createMockCurrentState();
      const result = mergePersistedState({
        chatProvider: 'Anthropic',
        chatModel: 'claude-3',
        vectorStoreProvider: 'Pinecone',
        defaultNoteView: 'list',
        itemsPerPage: 50,
        fontSize: 'large',
      }, currentState);

      expect(result.chatProvider).toBe('Anthropic');
      expect(result.chatModel).toBe('claude-3');
      expect(result.vectorStoreProvider).toBe('Pinecone');
      expect(result.defaultNoteView).toBe('list');
      expect(result.itemsPerPage).toBe(50);
      expect(result.fontSize).toBe('large');
    });

    it('should merge theme state', () => {
      const currentState = createMockCurrentState();
      const result = mergePersistedState({ theme: 'blue' }, currentState);
      expect(result.theme).toBe('blue');
    });

    it('should merge RAG settings', () => {
      const currentState = createMockCurrentState();
      const result = mergePersistedState({
        ragEnableHyde: false,
        ragEnableQueryExpansion: false,
        ragEnableHybridSearch: false,
        ragEnableReranking: false,
        ragEnableAnalytics: false,
      }, currentState);

      expect(result.ragEnableHyde).toBe(false);
      expect(result.ragEnableQueryExpansion).toBe(false);
      expect(result.ragEnableHybridSearch).toBe(false);
      expect(result.ragEnableReranking).toBe(false);
      expect(result.ragEnableAnalytics).toBe(false);
    });

    it('should merge filter state with spread', () => {
      const currentState = createMockCurrentState();
      const result = mergePersistedState({
        filterState: {
          dateFilter: 'last7days',
          selectedTags: ['important'],
          sortBy: 'oldest',
          archiveFilter: 'archived',
        },
      }, currentState);

      expect(result.filterState.dateFilter).toBe('last7days');
      expect(result.filterState.selectedTags).toContain('important');
      expect(result.filterState.sortBy).toBe('oldest');
      expect(result.filterState.archiveFilter).toBe('archived');
    });

    it('should preserve current filter state when persisted filter is undefined', () => {
      const currentState = createMockCurrentState();
      currentState.filterState.selectedTags = ['test-tag'];

      const result = mergePersistedState({}, currentState);

      expect(result.filterState.selectedTags).toContain('test-tag');
    });

    it('should merge git state', () => {
      const currentState = createMockCurrentState();
      const result = mergePersistedState({
        repositoryPath: '/path/to/repo',
      }, currentState);

      expect(result.repositoryPath).toBe('/path/to/repo');
    });

    it('should merge ollama settings', () => {
      const currentState = createMockCurrentState();
      const result = mergePersistedState({
        ollamaRemoteUrl: 'http://remote:11434',
        useRemoteOllama: true,
      }, currentState);

      expect(result.ollamaRemoteUrl).toBe('http://remote:11434');
      expect(result.useRemoteOllama).toBe(true);
    });

    it('should merge note summary settings', () => {
      const currentState = createMockCurrentState();
      const result = mergePersistedState({
        noteSummaryEnabled: false,
        noteSummaryProvider: 'Anthropic',
        noteSummaryModel: 'claude-3-opus',
      }, currentState);

      expect(result.noteSummaryEnabled).toBe(false);
      expect(result.noteSummaryProvider).toBe('Anthropic');
      expect(result.noteSummaryModel).toBe('claude-3-opus');
    });

    it('should use current state values for missing persisted fields', () => {
      const currentState = createMockCurrentState();
      currentState.chatProvider = 'Gemini';
      currentState.theme = 'light';

      const result = mergePersistedState({
        chatModel: 'gemini-pro', // Only set this
      }, currentState);

      // Should use persisted value
      expect(result.chatModel).toBe('gemini-pro');
      // Should keep current values for missing fields
      expect(result.chatProvider).toBe('Gemini');
      expect(result.theme).toBe('light');
    });

    it('should throw when validation fails', () => {
      const currentState = createMockCurrentState();

      expect(() => mergePersistedState({
        defaultNoteView: 'invalid' as NoteView,
      }, currentState)).toThrow('Invalid persisted defaultNoteView: invalid');
    });
  });
});
