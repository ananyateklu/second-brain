/**
 * Application Constants
 * Centralized configuration for API endpoints, query keys, and app settings
 */

// ============================================
// User Constants
// ============================================

export const DEFAULT_USER_ID = 'default-user';

// ============================================
// API Configuration
// ============================================

/**
 * Global API URL that can be set dynamically (for Tauri)
 */
let _apiBaseUrl: string | null = null;

/**
 * Global flag to track if the backend is ready.
 * API requests will be blocked until this is set to true.
 */
let _isBackendReady = false;

/**
 * Callbacks waiting for backend to be ready
 */
const _backendReadyCallbacks: (() => void)[] = [];

/**
 * Check if the backend is ready for requests
 */
export const isBackendReadyForRequests = (): boolean => _isBackendReady;

/**
 * Set the backend ready state (called by BackendReadyProvider)
 */
export const setBackendReady = (ready: boolean): void => {
  _isBackendReady = ready;
  if (ready) {
    // Notify all waiting callbacks
    _backendReadyCallbacks.forEach(cb => { cb(); });
    _backendReadyCallbacks.length = 0;
  }
};

/**
 * Wait for the backend to be ready
 * Returns immediately if already ready, otherwise waits
 */
export const waitForBackendReady = (timeoutMs = 30000): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (_isBackendReady) {
      resolve();
      return;
    }

    const timeoutId = setTimeout(() => {
      const idx = _backendReadyCallbacks.indexOf(callback);
      if (idx > -1) _backendReadyCallbacks.splice(idx, 1);
      reject(new Error('Timeout waiting for backend'));
    }, timeoutMs);

    const callback = () => {
      clearTimeout(timeoutId);
      resolve();
    };

    _backendReadyCallbacks.push(callback);
  });
};

// Type for window with Tauri API URL
interface WindowWithTauriApiUrl extends Window {
  __TAURI_API_URL__?: string;
}

/**
 * Get the base API URL from environment or default
 * In Tauri, this comes from the Rust backend
 * In web mode, this uses the Vite proxy or environment variable
 */
export const getApiBaseUrl = (): string => {
  // Check for dynamically set URL (Tauri mode)
  if (_apiBaseUrl) {
    return _apiBaseUrl;
  }

  // Check for Tauri URL set on window
  if (typeof window !== 'undefined' && '__TAURI_API_URL__' in window) {
    return (window as WindowWithTauriApiUrl).__TAURI_API_URL__ ?? '/api';
  }

  return import.meta.env.VITE_API_URL || '/api';
};

/**
 * Set the API base URL (called from Tauri setup)
 */
export const setApiBaseUrl = (url: string): void => {
  _apiBaseUrl = url;
  if (typeof window !== 'undefined') {
    (window as WindowWithTauriApiUrl).__TAURI_API_URL__ = url;
  }
};

/**
 * Get the direct backend URL for use with sendBeacon or other direct requests.
 * This bypasses the Vite proxy and returns the actual backend URL.
 * In development, this returns http://localhost:5001/api
 * In production or Tauri, this uses the configured API URL
 */
export const getDirectBackendUrl = (): string => {
  // In Tauri mode, use the configured URL
  if (_apiBaseUrl) {
    return _apiBaseUrl;
  }

  // Check for Tauri URL set on window
  if (typeof window !== 'undefined' && '__TAURI_API_URL__' in window) {
    return (window as WindowWithTauriApiUrl).__TAURI_API_URL__ ?? '/api';
  }

  // In development, use the direct backend URL (bypassing Vite proxy)
  // In production, the VITE_API_URL or /api should work directly
  if (import.meta.env.DEV) {
    return 'http://localhost:5001/api';
  }

  return import.meta.env.VITE_API_URL || '/api';
};

/**
 * API Endpoints organized by domain
 */
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
  },

  // Notes
  NOTES: {
    BASE: '/notes',
    BY_ID: (id: string) => `/notes/${id}`,
    BULK_DELETE: '/notes/bulk-delete',
    IMPORT: '/notes/import',
    GENERATE_SUMMARIES: '/notes/generate-summaries',
    // Background Summary Generation Jobs
    SUMMARIES_START: '/notes/summaries/start',
    SUMMARIES_STATUS: (jobId: string) => `/notes/summaries/status/${jobId}`,
    SUMMARIES_CANCEL: (jobId: string) => `/notes/summaries/cancel/${jobId}`,
    // Note Version History (PostgreSQL 18 Temporal Features)
    VERSIONS: (id: string) => `/notes/${id}/versions`,
    VERSION_AT: (id: string) => `/notes/${id}/versions/at`,
    VERSION_DIFF: (id: string) => `/notes/${id}/versions/diff`,
    RESTORE_VERSION: (id: string) => `/notes/${id}/versions/restore`,
  },

  // Chat / Conversations
  CHAT: {
    CONVERSATIONS: '/chat/conversations',
    CONVERSATION_BY_ID: (id: string) => `/chat/conversations/${id}`,
    CONVERSATION_SETTINGS: (id: string) => `/chat/conversations/${id}/settings`,
    BULK_DELETE: '/chat/conversations/bulk-delete',
    MESSAGES: (conversationId: string) => `/chat/conversations/${conversationId}/messages`,
    STREAM_MESSAGES: (conversationId: string) => `/chat/conversations/${conversationId}/messages/stream`,
    GENERATE_IMAGE: (conversationId: string) => `/chat/conversations/${conversationId}/generate-image`,
    IMAGE_PROVIDERS: '/chat/image-generation/providers',
    IMAGE_SIZES: (provider: string, model?: string) => {
      const base = `/chat/image-generation/providers/${provider}/sizes`;
      return model ? `${base}?model=${encodeURIComponent(model)}` : base;
    },
    SUGGESTED_PROMPTS: '/chat/suggested-prompts',
    // Chat Session Tracking (PostgreSQL 18 Temporal Features)
    SESSIONS: {
      START: '/chat/sessions/start',
      END: (sessionId: string) => `/chat/sessions/${sessionId}/end`,
      STATS: '/chat/sessions/stats',
      ACTIVE: '/chat/sessions/active',
      HISTORY: '/chat/sessions/history',
      BY_CONVERSATION: (id: string) => `/chat/conversations/${id}/sessions`,
    },
  },

  // AI
  AI: {
    HEALTH: '/ai/health',
    HEALTH_PROVIDER: (provider: string) => `/ai/health/${provider}`,
    OLLAMA_PULL: '/ai/ollama/pull',
    OLLAMA_DELETE: (modelName: string) => `/ai/ollama/models/${encodeURIComponent(modelName)}`,
  },

  // Agent
  AGENT: {
    CHAT: (conversationId: string) => `/agent/chat/${conversationId}`,
    STREAM: (conversationId: string) => `/agent/conversations/${conversationId}/messages/stream`,
    CAPABILITIES: '/agent/capabilities',
    PROVIDERS: '/agent/providers',
  },

  // RAG / Indexing
  INDEXING: {
    START: '/indexing/start',
    STATUS: (jobId: string) => `/indexing/status/${jobId}`,
    CANCEL: (jobId: string) => `/indexing/cancel/${jobId}`,
    STATS: '/indexing/stats',
    REINDEX_NOTE: (noteId: string) => `/indexing/reindex/${noteId}`,
    DELETE_NOTES: '/indexing/notes',
    EMBEDDING_PROVIDERS: '/indexing/embedding-providers',
  },

  // RAG Analytics
  RAG_ANALYTICS: {
    FEEDBACK: '/rag/analytics/feedback',
    STATS: '/rag/analytics/stats',
    LOGS: '/rag/analytics/logs',
    LOG_BY_ID: (id: string) => `/rag/analytics/logs/${id}`,
    CLUSTER: '/rag/analytics/cluster',
    TOPICS: '/rag/analytics/topics',
  },

  // Statistics
  STATS: {
    AI: '/stats/ai',
    NOTES: '/stats/notes',
    DASHBOARD: '/stats/dashboard',
    // Tool Call Analytics (PostgreSQL 18 JSON_TABLE)
    TOOLS: '/stats/tools',
    TOOLS_ACTIONS: '/stats/tools/actions',
    TOOLS_ERRORS: '/stats/tools/errors',
  },

  // User Preferences
  USER_PREFERENCES: {
    BY_USER: (userId: string) => `/userpreferences/${userId}`,
  },

  // Health Check
  HEALTH: {
    BASE: '/health',
    READY: '/health/ready',
    LIVE: '/health/live',
  },

  // Git Integration
  GIT: {
    VALIDATE: '/git/validate',
    STATUS: '/git/status',
    DIFF: '/git/diff',
    STAGE: '/git/stage',
    UNSTAGE: '/git/unstage',
    COMMIT: '/git/commit',
    PUSH: '/git/push',
    PULL: '/git/pull',
    LOG: '/git/log',
    DISCARD: '/git/discard',
  },
} as const;

// ============================================
// Query Keys
// ============================================

// Re-export all query key utilities and types from the dedicated module
export {
  // Filter types
  type NoteFilters,
  type ConversationFilters,
  type RagLogFilters,
  type IndexingFilters,
  type AIHealthConfig,
  type ToolAnalyticsFilters,
  type ChatSessionFilters,
  // Individual key factories
  noteKeys,
  conversationKeys,
  aiHealthKeys,
  indexingKeys,
  ragAnalyticsKeys,
  statsKeys,
  userPreferencesKeys,
  imageGenerationKeys,
  agentKeys,
  // PostgreSQL 18 Temporal Feature key factories
  noteVersionKeys,
  chatSessionKeys,
  // Unified keys object
  queryKeys,
  // Utility functions
  createInvalidationPattern,
  matchesQueryKey,
} from './query-keys';

/**
 * @deprecated Use the typed query key factories from './query-keys' instead.
 * This is maintained for backward compatibility.
 * 
 * React Query cache keys organized by domain
 * Using factory pattern for consistent key generation
 */
export const QUERY_KEYS = {
  // Notes
  notes: {
    all: ['notes'] as const,
    lists: () => [...QUERY_KEYS.notes.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...QUERY_KEYS.notes.lists(), filters] as const,
    details: () => [...QUERY_KEYS.notes.all, 'detail'] as const,
    detail: (id: string) => [...QUERY_KEYS.notes.details(), id] as const,
  },

  // Conversations
  conversations: {
    all: ['conversations'] as const,
    lists: () => [...QUERY_KEYS.conversations.all, 'list'] as const,
    list: (userId?: string) => [...QUERY_KEYS.conversations.lists(), { userId }] as const,
    details: () => [...QUERY_KEYS.conversations.all, 'detail'] as const,
    detail: (id: string) => [...QUERY_KEYS.conversations.details(), id] as const,
  },

  // Legacy conversation key for backwards compatibility
  conversation: (id: string | null) => ['conversation', id] as const,

  // AI Health
  aiHealth: {
    all: ['ai-health'] as const,
    health: (ollamaBaseUrl?: string | null, useRemoteOllama?: boolean) =>
      [...QUERY_KEYS.aiHealth.all, { ollamaBaseUrl, useRemoteOllama }] as const,
    provider: (provider: string, ollamaBaseUrl?: string | null, useRemoteOllama?: boolean) =>
      [...QUERY_KEYS.aiHealth.all, provider, { ollamaBaseUrl, useRemoteOllama }] as const,
  },

  // RAG / Indexing
  indexing: {
    all: ['indexing'] as const,
    stats: (userId?: string) => [...QUERY_KEYS.indexing.all, 'stats', userId] as const,
    job: (jobId: string) => [...QUERY_KEYS.indexing.all, 'job', jobId] as const,
  },

  // RAG Analytics
  ragAnalytics: {
    all: ['rag-analytics'] as const,
    stats: (since?: string) => [...QUERY_KEYS.ragAnalytics.all, 'stats', since] as const,
    logs: (page?: number, pageSize?: number) => [...QUERY_KEYS.ragAnalytics.all, 'logs', { page, pageSize }] as const,
    log: (id: string) => [...QUERY_KEYS.ragAnalytics.all, 'log', id] as const,
    topics: () => [...QUERY_KEYS.ragAnalytics.all, 'topics'] as const,
  },

  // Statistics
  stats: {
    all: ['stats'] as const,
    ai: () => [...QUERY_KEYS.stats.all, 'ai'] as const,
    notes: () => [...QUERY_KEYS.stats.all, 'notes'] as const,
    dashboard: () => [...QUERY_KEYS.stats.all, 'dashboard'] as const,
  },

  // User Preferences
  userPreferences: {
    all: ['user-preferences'] as const,
    byUser: (userId: string) => [...QUERY_KEYS.userPreferences.all, userId] as const,
  },

  // Image Generation
  imageGeneration: {
    all: ['image-generation'] as const,
    providers: () => [...QUERY_KEYS.imageGeneration.all, 'providers'] as const,
    sizes: (provider: string, model?: string) =>
      [...QUERY_KEYS.imageGeneration.all, 'sizes', provider, model] as const,
  },
} as const;

// ============================================
// Application Settings
// ============================================

/**
 * Default pagination settings
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  MAX_PAGE_SIZE: 100,
} as const;

/**
 * Default timeout settings (in milliseconds)
 */
export const TIMEOUTS = {
  API_REQUEST: 30000,      // 30 seconds
  STREAMING: 120000,       // 2 minutes
  FILE_UPLOAD: 60000,      // 1 minute
  HEALTH_CHECK: 10000,     // 10 seconds
  DEBOUNCE: 300,           // 300ms for search/input debounce
  AUTO_SAVE: 2000,         // 2 seconds for auto-save
} as const;

/**
 * Retry configuration
 */
export const RETRY = {
  MAX_RETRIES: 3,
  BASE_DELAY: 1000,        // 1 second
  MAX_DELAY: 10000,        // 10 seconds
  BACKOFF_FACTOR: 2,
} as const;

/**
 * Cache durations (in milliseconds)
 */
export const CACHE = {
  STALE_TIME: 1000 * 60 * 5,    // 5 minutes
  GC_TIME: 1000 * 60 * 10,      // 10 minutes
  HEALTH_STALE: 1000 * 30,      // 30 seconds for health checks
} as const;

/**
 * File upload constraints
 */
export const FILE_UPLOAD = {
  MAX_FILE_SIZE: 10 * 1024 * 1024,  // 10 MB
  MAX_IMAGES: 4,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'text/plain', 'text/markdown'],
} as const;

/**
 * Local storage keys
 */
export const STORAGE_KEYS = {
  AUTH: 'auth-storage',
  SETTINGS: 'second-brain-settings',
  THEME: 'second-brain-theme',
  UI_STATE: 'second-brain-ui',
  OLLAMA_DOWNLOADS: 'ollama-downloads',
  SUGGESTED_PROMPTS: 'suggested-prompts-cache',
  CHAT_DRAFTS: 'second-brain-drafts', // IndexedDB database name
  CHAT_DRAFTS_FALLBACK: 'sb-draft-', // localStorage key prefix
} as const;

/**
 * AI Provider names (matching backend)
 */
export const AI_PROVIDERS = {
  OPENAI: 'OpenAI',
  ANTHROPIC: 'Anthropic',
  GOOGLE: 'Gemini',
  XAI: 'Grok',
  OLLAMA: 'Ollama',
} as const;

/**
 * Vector store providers
 */
export const VECTOR_STORES = {
  POSTGRESQL: 'PostgreSQL',
  PINECONE: 'Pinecone',
} as const;

/**
 * Notes folder constants
 */
export const NOTES_FOLDERS = {
  /** Folder name for archived notes - automatically assigned when archiving */
  ARCHIVED: 'Archived',
} as const;
