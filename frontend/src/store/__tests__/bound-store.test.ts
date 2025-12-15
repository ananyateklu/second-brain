/**
 * Bound Store Tests
 * Unit tests for the unified zustand store
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';

// Mock the store registry before importing bound-store
vi.mock('../store-registry', () => ({
  registerStore: vi.fn(),
}));

// Mock all slice creators
vi.mock('../slices/auth-slice', () => ({
  createAuthSlice: vi.fn(() => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
    setUser: vi.fn(),
    setToken: vi.fn(),
  })),
}));

vi.mock('../slices/settings-slice', () => ({
  createSettingsSlice: vi.fn(() => ({
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
    loadUserPreferences: vi.fn(),
    saveUserPreferences: vi.fn(),
  })),
}));

vi.mock('../slices/ui-slice', () => ({
  createUISlice: vi.fn(() => ({
    isLeftSidebarCollapsed: false,
    isRightPanelCollapsed: true,
    toggleLeftSidebar: vi.fn(),
    toggleRightPanel: vi.fn(),
    setLeftSidebarCollapsed: vi.fn(),
    setRightPanelCollapsed: vi.fn(),
  })),
}));

vi.mock('../slices/theme-slice', () => ({
  createThemeSlice: vi.fn(() => ({
    theme: 'dark',
    setTheme: vi.fn(),
    applyTheme: vi.fn(),
  })),
}));

vi.mock('../slices/ollama-slice', () => ({
  createOllamaSlice: vi.fn(() => ({
    ollamaModels: [],
    ollamaLoading: false,
    ollamaError: null,
    fetchOllamaModels: vi.fn(),
    pullOllamaModel: vi.fn(),
  })),
}));

vi.mock('../slices/notes-slice', () => ({
  createNotesSlice: vi.fn(() => ({
    selectedNoteIds: [],
    isBulkMode: false,
    filterState: {},
    setSelectedNoteIds: vi.fn(),
    toggleBulkMode: vi.fn(),
    setFilterState: vi.fn(),
    clearFilters: vi.fn(),
  })),
}));

vi.mock('../slices/rag-analytics-slice', () => ({
  createRagAnalyticsSlice: vi.fn(() => ({
    ragStats: null,
    ragStatsLoading: false,
    fetchRagStats: vi.fn(),
  })),
}));

vi.mock('../slices/indexing-slice', () => ({
  createIndexingSlice: vi.fn(() => ({
    indexingStatus: null,
    isIndexing: false,
    startIndexing: vi.fn(),
    checkIndexingStatus: vi.fn(),
  })),
}));

vi.mock('../slices/summary-slice', () => ({
  createSummarySlice: vi.fn(() => ({
    summaryStatus: {},
    generateSummary: vi.fn(),
    getSummaryStatus: vi.fn(),
  })),
}));

vi.mock('../slices/draft-slice', () => ({
  createDraftSlice: vi.fn(() => ({
    drafts: {},
    saveDraft: vi.fn(),
    loadDraft: vi.fn(),
    clearDraft: vi.fn(),
  })),
}));

vi.mock('../slices/git-slice', () => ({
  createGitSlice: vi.fn(() => ({
    repositoryPath: null,
    gitBranches: [],
    gitError: null,
    setRepositoryPath: vi.fn(),
    fetchBranches: vi.fn(),
  })),
}));

// Mock zustand persist
vi.mock('zustand/middleware', () => ({
  persist: vi.fn((config) => config),
}));

// Import after mocks
import { useBoundStore } from '../bound-store';

describe('bound-store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the store state before each test
    useBoundStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      chatProvider: 'OpenAI',
      chatModel: 'gpt-4',
      vectorStoreProvider: 'PostgreSQL',
      rerankingProvider: 'OpenAI',
      defaultNoteView: 'grid',
      itemsPerPage: 20,
      fontSize: 'medium',
      enableNotifications: true,
      theme: 'dark',
      filterState: {
        dateFilter: 'all',
        selectedTags: [],
        sortBy: 'newest',
        archiveFilter: 'all',
      },
      repositoryPath: null,
    });
  });

  // ============================================
  // Store Creation Tests
  // ============================================
  describe('store creation', () => {
    it('should create store with initial state', () => {
      const state = useBoundStore.getState();

      expect(state).toBeDefined();
      expect(typeof state.user).not.toBe('undefined');
    });

    it('should have auth slice properties', () => {
      const state = useBoundStore.getState();

      expect('user' in state).toBe(true);
      expect('token' in state).toBe(true);
      expect('isAuthenticated' in state).toBe(true);
    });

    it('should have settings slice properties', () => {
      const state = useBoundStore.getState();

      expect('chatProvider' in state).toBe(true);
      expect('chatModel' in state).toBe(true);
      expect('vectorStoreProvider' in state).toBe(true);
    });

    it('should have theme slice properties', () => {
      const state = useBoundStore.getState();

      expect('theme' in state).toBe(true);
    });

    it('should have notes slice properties', () => {
      const state = useBoundStore.getState();

      expect('filterState' in state).toBe(true);
    });

    it('should have git slice properties', () => {
      const state = useBoundStore.getState();

      expect('repositoryPath' in state).toBe(true);
    });
  });

  // ============================================
  // State Update Tests
  // ============================================
  describe('state updates', () => {
    it('should update auth state', () => {
      act(() => {
        useBoundStore.setState({
          user: { userId: '1', email: 'test@test.com', displayName: 'Test User' },
          isAuthenticated: true,
        });
      });

      const state = useBoundStore.getState();
      expect(state.user?.userId).toBe('1');
      expect(state.isAuthenticated).toBe(true);
    });

    it('should update settings state', () => {
      act(() => {
        useBoundStore.setState({
          chatProvider: 'Anthropic',
          chatModel: 'claude-3',
        });
      });

      const state = useBoundStore.getState();
      expect(state.chatProvider).toBe('Anthropic');
      expect(state.chatModel).toBe('claude-3');
    });

    it('should update theme state', () => {
      act(() => {
        useBoundStore.setState({
          theme: 'light',
        });
      });

      const state = useBoundStore.getState();
      expect(state.theme).toBe('light');
    });

    it('should update notes filter state', () => {
      act(() => {
        useBoundStore.setState({
          filterState: {
            dateFilter: 'last7days',
            selectedTags: ['important'],
            sortBy: 'oldest',
            archiveFilter: 'not-archived',
          },
        });
      });

      const state = useBoundStore.getState();
      expect(state.filterState.dateFilter).toBe('last7days');
      expect(state.filterState.selectedTags).toContain('important');
    });

    it('should update git repository path', () => {
      act(() => {
        useBoundStore.setState({
          repositoryPath: '/path/to/repo',
        });
      });

      const state = useBoundStore.getState();
      expect(state.repositoryPath).toBe('/path/to/repo');
    });
  });

  // ============================================
  // Subscription Tests
  // ============================================
  describe('subscriptions', () => {
    it('should notify subscribers on state change', () => {
      const subscriber = vi.fn();
      const unsubscribe = useBoundStore.subscribe(subscriber);

      act(() => {
        useBoundStore.setState({ chatProvider: 'Gemini' });
      });

      expect(subscriber).toHaveBeenCalled();
      unsubscribe();
    });

    it('should allow unsubscribing', () => {
      const subscriber = vi.fn();
      const unsubscribe = useBoundStore.subscribe(subscriber);

      unsubscribe();

      act(() => {
        useBoundStore.setState({ chatProvider: 'Grok' });
      });

      expect(subscriber).toHaveBeenCalledTimes(0);
    });
  });

  // ============================================
  // Selector Tests
  // ============================================
  describe('selectors', () => {
    it('should support getState for synchronous access', () => {
      const state = useBoundStore.getState();
      expect(state).toBeDefined();
      expect(typeof state).toBe('object');
    });

    it('should return correct values from getState', () => {
      act(() => {
        useBoundStore.setState({
          enableNotifications: false,
          itemsPerPage: 50,
        });
      });

      const state = useBoundStore.getState();
      expect(state.enableNotifications).toBe(false);
      expect(state.itemsPerPage).toBe(50);
    });
  });

  // ============================================
  // RAG Settings Tests
  // ============================================
  describe('RAG settings', () => {
    it('should update RAG feature toggles', () => {
      act(() => {
        useBoundStore.setState({
          ragEnableHyde: false,
          ragEnableQueryExpansion: false,
          ragEnableHybridSearch: false,
          ragEnableReranking: false,
          ragEnableAnalytics: false,
        });
      });

      const state = useBoundStore.getState();
      expect(state.ragEnableHyde).toBe(false);
      expect(state.ragEnableQueryExpansion).toBe(false);
      expect(state.ragEnableHybridSearch).toBe(false);
      expect(state.ragEnableReranking).toBe(false);
      expect(state.ragEnableAnalytics).toBe(false);
    });
  });

  // ============================================
  // Note Summary Settings Tests
  // ============================================
  describe('note summary settings', () => {
    it('should update note summary settings', () => {
      act(() => {
        useBoundStore.setState({
          noteSummaryEnabled: false,
          noteSummaryProvider: 'Anthropic',
          noteSummaryModel: 'claude-3-opus',
        });
      });

      const state = useBoundStore.getState();
      expect(state.noteSummaryEnabled).toBe(false);
      expect(state.noteSummaryProvider).toBe('Anthropic');
      expect(state.noteSummaryModel).toBe('claude-3-opus');
    });
  });

  // ============================================
  // Ollama Settings Tests
  // ============================================
  describe('ollama settings', () => {
    it('should update ollama settings', () => {
      act(() => {
        useBoundStore.setState({
          ollamaRemoteUrl: 'http://remote:11434',
          useRemoteOllama: true,
        });
      });

      const state = useBoundStore.getState();
      expect(state.ollamaRemoteUrl).toBe('http://remote:11434');
      expect(state.useRemoteOllama).toBe(true);
    });
  });

  // ============================================
  // Vector Store Settings Tests
  // ============================================
  describe('vector store settings', () => {
    it('should update vector store provider', () => {
      act(() => {
        useBoundStore.setState({
          vectorStoreProvider: 'Pinecone',
        });
      });

      const state = useBoundStore.getState();
      expect(state.vectorStoreProvider).toBe('Pinecone');
    });

    it('should update reranking provider', () => {
      act(() => {
        useBoundStore.setState({
          rerankingProvider: 'Anthropic',
        });
      });

      const state = useBoundStore.getState();
      expect(state.rerankingProvider).toBe('Anthropic');
    });
  });
});
